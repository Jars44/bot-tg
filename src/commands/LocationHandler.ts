/**
 * Location Handler
 * Handles incoming location messages for "Location-First" UX
 */

import TelegramBot from "node-telegram-bot-api";
import type { MessageHandler } from "./types.js";
import { sessionManager, LocationSessionData } from "../utils/SessionManager.js";
import { withLoading } from "../utils/uiHelper.js";
import { WeatherService } from "../services/WeatherService.js";
import { PrayerService } from "../services/PrayerService.js";
import type { VibeCommand } from "./VibeCommand.js";
import type { HuntCommand } from "./HuntCommand.js";

export class LocationHandler implements MessageHandler {
  private weatherService: WeatherService;
  private prayerService: PrayerService;
  private vibeCommand: VibeCommand | null;
  private huntCommand: HuntCommand | null;

  constructor(
    weatherService: WeatherService,
    prayerService: PrayerService,
    vibeCommand?: VibeCommand,
    huntCommand?: HuntCommand,
  ) {
    this.weatherService = weatherService;
    this.prayerService = prayerService;
    this.vibeCommand = vibeCommand ?? null;
    this.huntCommand = huntCommand ?? null;
  }

  async shouldHandle(msg: TelegramBot.Message): Promise<boolean> {
    // Handle if message contains location
    return !!msg.location;
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const location = msg.location;

    if (!location) return;

    await withLoading(bot, chatId, async () => {
      // Check for active session
      const state = sessionManager.getState(chatId);

      // Scenario B: Solicited Location (Resume Flow)
      if (state && state.flow === "location" && state.step === "waiting") {
        const data = state.data as LocationSessionData;
        const pendingCommand = data.pendingCommand;

        // Clear session immediately to prevent duplicate processing
        await sessionManager.clearState(chatId);

        try {
          if (pendingCommand === "weather") {
            try {
              const weather = await this.weatherService.formattedWeatherByCoords(location.latitude, location.longitude);
              if (!weather) {
                await bot.sendMessage(chatId, "× Gagal mendapatkan data cuaca.", {
                  reply_markup: { remove_keyboard: true },
                });
                return;
              }
              // Send result directly (remove_keyboard in options)
              await bot.sendMessage(chatId, weather, {
                parse_mode: "Markdown",
                reply_markup: { remove_keyboard: true },
              });
            } catch (weatherError) {
              console.error("[LocationHandler] Weather error:", weatherError);
              await bot.sendMessage(chatId, "× Gagal mengambil data cuaca.");
            }
          } else if (pendingCommand === "prayer") {
            try {
              const timings = await this.prayerService.formattedTimingsByCoords(location.latitude, location.longitude);
              if (!timings) {
                await bot.sendMessage(chatId, "× Gagal mendapatkan jadwal sholat.", {
                  reply_markup: { remove_keyboard: true },
                });
                return;
              }
              // Send result directly (remove_keyboard in options)
              await bot.sendMessage(chatId, timings, {
                parse_mode: "Markdown",
                reply_markup: { remove_keyboard: true },
              });
            } catch (prayerError) {
              console.error("[LocationHandler] Prayer error:", prayerError);
              await bot.sendMessage(chatId, "× Gagal mendapatkan jadwal sholat.");
            }
          } else {
            // Unknown pending command
            console.warn("[LocationHandler] Unknown pending command:", pendingCommand);
            await bot.sendMessage(chatId, "× Perintah yang diminta tidak dikenali.");
          }
        } catch (error) {
          console.error("[LocationHandler] Error executing pending command:", error);
          await bot.sendMessage(chatId, "× Gagal memproses lokasi Anda.");
        }
        return;
      }

      // Scenario A: Unsolicited Location (Menu Flow)
      // Remove any existing keyboard just in case
      const buttons: TelegramBot.InlineKeyboardButton[][] = [
        [
          { text: "🌤 Cuaca", callback_data: `loc_weather_${location.latitude}_${location.longitude}` },
          { text: "🕌 Sholat", callback_data: `loc_prayer_${location.latitude}_${location.longitude}` },
        ],
      ];

      // Add lifestyle options if commands are injected
      if (this.vibeCommand || this.huntCommand) {
        const lifestyleRow: TelegramBot.InlineKeyboardButton[] = [];
        if (this.vibeCommand) {
          lifestyleRow.push({
            text: "🎵 Vibe",
            callback_data: `loc_vibe_${location.latitude}_${location.longitude}`,
          });
        }
        if (this.huntCommand) {
          lifestyleRow.push({
            text: "📸 Hunt",
            callback_data: `loc_hunt_${location.latitude}_${location.longitude}`,
          });
        }
        buttons.push(lifestyleRow);
      }

      await bot.sendMessage(chatId, "📍 Lokasi diterima. Apa yang ingin Anda periksa?", {
        reply_markup: {
          remove_keyboard: true,
          inline_keyboard: buttons,
        },
      });
    });
  }
}
