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

export class LocationHandler implements MessageHandler {
  private weatherService: WeatherService;
  private prayerService: PrayerService;

  constructor(weatherService: WeatherService, prayerService: PrayerService) {
    this.weatherService = weatherService;
    this.prayerService = prayerService;
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

        // Clear session immediately
        sessionManager.clearState(chatId);

        try {
          if (pendingCommand === "weather") {
            const weather = await this.weatherService.formattedWeatherByCoords(location.latitude, location.longitude);
            // Remove keyboard
            await bot.sendMessage(chatId, "✅ Location received! Fetching weather...", {
              reply_markup: { remove_keyboard: true },
            });
            await bot.sendMessage(chatId, weather, { parse_mode: "Markdown" });
          } else if (pendingCommand === "prayer") {
            const timings = await this.prayerService.formattedTimingsByCoords(location.latitude, location.longitude);
            // Remove keyboard
            await bot.sendMessage(chatId, "✓ Lokasi diterima. Mengambil jadwal sholat...", {
              reply_markup: { remove_keyboard: true },
            });
            await bot.sendMessage(chatId, timings, { parse_mode: "Markdown" });
          }
        } catch (error) {
          console.error("[LocationHandler] Error executing pending command:", error);
          await bot.sendMessage(chatId, "× Gagal mengambil data untuk lokasi Anda.");
        }
        return;
      }

      // Scenario A: Unsolicited Location (Menu Flow)
      // Remove any existing keyboard just in case
      await bot.sendMessage(chatId, "Lokasi diterima. Apa yang ingin Anda periksa?", {
        reply_markup: {
          remove_keyboard: true,
          inline_keyboard: [
            [
              { text: "Cuaca", callback_data: `loc_weather_${location.latitude}_${location.longitude}` },
              { text: "Sholat", callback_data: `loc_prayer_${location.latitude}_${location.longitude}` },
            ],
            // [ { text: "Qibla (Segera hadir)", callback_data: "loc_qibla" } ]
          ],
        },
      });
    });
  }
}
