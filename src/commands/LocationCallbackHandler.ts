/**
 * Location Callback Handler
 * Handles inline button callbacks from the unsolicited location menu
 * (loc_weather_ and loc_prayer_ prefixes)
 */

import TelegramBot from "node-telegram-bot-api";
import type { CallbackHandler } from "./types.js";
import { WeatherService } from "../services/WeatherService.js";
import { PrayerService } from "../services/PrayerService.js";

export class LocationCallbackHandler implements CallbackHandler {
  prefix = "loc_";
  private weatherService: WeatherService;
  private prayerService: PrayerService;

  constructor(weatherService: WeatherService, prayerService: PrayerService) {
    this.weatherService = weatherService;
    this.prayerService = prayerService;
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    await bot.answerCallbackQuery(query.id);

    try {
      if (data.startsWith("loc_weather_")) {
        const parts = data.replace("loc_weather_", "").split("_");
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);

        if (isNaN(lat) || isNaN(lon)) {
          await bot.editMessageText("❌ Koordinat tidak valid.", {
            chat_id: chatId,
            message_id: messageId,
          });
          return;
        }

        await bot.editMessageText("🔍 Mencari cuaca...", {
          chat_id: chatId,
          message_id: messageId,
        });

        const result = await this.weatherService.getWeatherByCoords(lat, lon);

        if (!result) {
          await bot.editMessageText("❌ Gagal mendapatkan data cuaca.", {
            chat_id: chatId,
            message_id: messageId,
          });
          return;
        }

        const { weather, locationName } = result;
        const dayTime = weather.is_day ? "Siang" : "Malam";

        await bot.editMessageText(
          `🌤 Cuaca di ${locationName}:\nSuhu: ${weather.temperature}°C\nAngin: ${weather.windspeed} km/h\nSiang/Malam: ${dayTime}`,
          {
            chat_id: chatId,
            message_id: messageId,
          },
        );
      } else if (data.startsWith("loc_prayer_")) {
        const parts = data.replace("loc_prayer_", "").split("_");
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);

        if (isNaN(lat) || isNaN(lon)) {
          await bot.editMessageText("❌ Koordinat tidak valid.", {
            chat_id: chatId,
            message_id: messageId,
          });
          return;
        }

        await bot.editMessageText("🔍 Mencari jadwal sholat...", {
          chat_id: chatId,
          message_id: messageId,
        });

        const timings = await this.prayerService.formattedTimingsByCoords(lat, lon);

        await bot.editMessageText(timings, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
        });
      }
    } catch (error) {
      console.error("[LocationCallbackHandler] Error:", error);
      try {
        await bot.editMessageText("❌ Gagal memproses lokasi.", {
          chat_id: chatId,
          message_id: messageId,
        });
      } catch {
        // Ignore secondary edit errors
      }
    }
  }
}
