import TelegramBot from "node-telegram-bot-api";
import type { MessageHandler } from "./types.js";
import { sessionManager, LocationSessionData } from "../utils/SessionManager.js";
import { withLoading } from "../utils/uiHelper.js";
import { WeatherService } from "../services/WeatherService.js";
import { PrayerService } from "../services/PrayerService.js";
import type { VibeCommand } from "./VibeCommand.js";
import type { HuntCommand } from "./HuntCommand.js";
import { S } from "../config/symbols.js";

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
    return !!msg.location;
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const location = msg.location;

    if (!location) return;

    await withLoading(bot, chatId, async () => {
      const state = sessionManager.getState(chatId);

      if (state && state.flow === "location" && state.step === "waiting") {
        const data = state.data as LocationSessionData;
        const pendingCommand = data.pendingCommand;

        await sessionManager.clearState(chatId);

        try {
          if (pendingCommand === "weather") {
            try {
              const weather = await this.weatherService.formattedWeatherByCoords(location.latitude, location.longitude);
              if (!weather) {
                await bot.sendMessage(chatId, `${S.FAIL} Gagal mendapatkan data cuaca.`, {
                  reply_markup: { remove_keyboard: true },
                });
                return;
              }
              await bot.sendMessage(chatId, weather, {
                parse_mode: "Markdown",
                reply_markup: { remove_keyboard: true },
              });
            } catch (weatherError) {
              console.error("[LocationHandler] Weather error:", weatherError);
              await bot.sendMessage(chatId, `${S.FAIL} Gagal mengambil data cuaca.`);
            }
          } else if (pendingCommand === "prayer") {
            try {
              const timings = await this.prayerService.formattedTimingsByCoords(location.latitude, location.longitude);
              if (!timings) {
                await bot.sendMessage(chatId, `${S.FAIL} Gagal mendapatkan jadwal sholat.`, {
                  reply_markup: { remove_keyboard: true },
                });
                return;
              }
              await bot.sendMessage(chatId, timings, {
                parse_mode: "Markdown",
                reply_markup: { remove_keyboard: true },
              });
            } catch (prayerError) {
              console.error("[LocationHandler] Prayer error:", prayerError);
              await bot.sendMessage(chatId, `${S.FAIL} Gagal mendapatkan jadwal sholat.`);
            }
          } else {
            console.warn("[LocationHandler] Unknown pending command:", pendingCommand);
            await bot.sendMessage(chatId, `${S.FAIL} Perintah yang diminta tidak dikenali.`);
          }
        } catch (error) {
          console.error("[LocationHandler] Error executing pending command:", error);
          await bot.sendMessage(chatId, `${S.FAIL} Gagal memproses lokasi Anda.`);
        }
        return;
      }

      const buttons: TelegramBot.InlineKeyboardButton[][] = [
        [
          { text: `${S.SUN} Cuaca`, callback_data: `loc_weather_${location.latitude}_${location.longitude}` },
          { text: `${S.MOSQUE} Sholat`, callback_data: `loc_prayer_${location.latitude}_${location.longitude}` },
        ],
      ];

      if (this.vibeCommand || this.huntCommand) {
        const lifestyleRow: TelegramBot.InlineKeyboardButton[] = [];
        if (this.vibeCommand) {
          lifestyleRow.push({
            text: `${S.NOTE} Vibe`,
            callback_data: `loc_vibe_${location.latitude}_${location.longitude}`,
          });
        }
        if (this.huntCommand) {
          lifestyleRow.push({
            text: `${S.LENS} Hunt`,
            callback_data: `loc_hunt_${location.latitude}_${location.longitude}`,
          });
        }
        buttons.push(lifestyleRow);
      }

      await bot.sendMessage(chatId, `${S.PIN} Lokasi diterima. Apa yang ingin Anda periksa?`, {
        reply_markup: {
          remove_keyboard: true,
          inline_keyboard: buttons,
        },
      });
    });
  }
}
