/**
 * Location Callback Handler
 * Handles inline button callbacks from the unsolicited location menu
 * (loc_weather_ and loc_prayer_ prefixes)
 */

import TelegramBot from "node-telegram-bot-api";
import type { CallbackHandler } from "./types.js";
import { WeatherService } from "../services/WeatherService.js";
import { PrayerService } from "../services/PrayerService.js";
import type { VibeService } from "../services/VibeService.js";
import type { UrbanExplorationService } from "../services/UrbanExplorationService.js";
import { safeEditMessage } from "../utils/uiHelper.js";
import { toTitleCase } from "../utils/helpers.js";

export class LocationCallbackHandler implements CallbackHandler {
  prefix = "loc_";
  private weatherService: WeatherService;
  private prayerService: PrayerService;
  private vibeService: VibeService | null;
  private urbanService: UrbanExplorationService | null;

  constructor(
    weatherService: WeatherService,
    prayerService: PrayerService,
    vibeService?: VibeService,
    urbanService?: UrbanExplorationService,
  ) {
    this.weatherService = weatherService;
    this.prayerService = prayerService;
    this.vibeService = vibeService ?? null;
    this.urbanService = urbanService ?? null;
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
          await safeEditMessage(bot, chatId, messageId, "× Koordinat tidak valid.");
          return;
        }

        await safeEditMessage(bot, chatId, messageId, "⧗ Mengambil data cuaca...");

        const result = await this.weatherService.getWeatherByCoords(lat, lon);

        if (!result) {
          await safeEditMessage(bot, chatId, messageId, "× Gagal mendapatkan data cuaca. Coba lagi nanti.");
          return;
        }

        const { weather, locationName } = result;
        const dayTime = weather.is_day ? "Siang" : "Malam";

        await safeEditMessage(
          bot,
          chatId,
          messageId,
          `Cuaca di ${toTitleCase(locationName)}:\nSuhu: ${weather.temperature}°C\nAngin: ${weather.windspeed} km/h\nSiang/Malam: ${dayTime}`,
        );
      } else if (data.startsWith("loc_prayer_")) {
        const parts = data.replace("loc_prayer_", "").split("_");
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);

        if (isNaN(lat) || isNaN(lon)) {
          await safeEditMessage(bot, chatId, messageId, "× Koordinat tidak valid.");
          return;
        }

        await safeEditMessage(bot, chatId, messageId, "⧗ Mengambil jadwal sholat...");

        const timings = await this.prayerService.formattedTimingsByCoords(lat, lon);

        await safeEditMessage(bot, chatId, messageId, timings, {
          parse_mode: "Markdown",
        });
      } else if (data.startsWith("loc_vibe_") && this.vibeService) {
        const parts = data.replace("loc_vibe_", "").split("_");
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);

        if (isNaN(lat) || isNaN(lon)) {
          await safeEditMessage(bot, chatId, messageId, "× Koordinat tidak valid.");
          return;
        }

        await safeEditMessage(bot, chatId, messageId, "⧗ Mendeteksi vibe lokasi...");

        const vibe = await this.vibeService.getVibe(lat, lon);
        const message = this.vibeService.formatVibeMessage(vibe);
        await safeEditMessage(bot, chatId, messageId, message, {
          parse_mode: "Markdown",
        });
      } else if (data.startsWith("loc_hunt_") && this.urbanService) {
        const parts = data.replace("loc_hunt_", "").split("_");
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);

        if (isNaN(lat) || isNaN(lon)) {
          await safeEditMessage(bot, chatId, messageId, "× Koordinat tidak valid.");
          return;
        }

        await safeEditMessage(bot, chatId, messageId, "⧗ Membuat misi fotografi...");

        const mission = await this.urbanService.generateMission(lat, lon);
        const message = this.urbanService.formatMissionMessage(mission);
        await safeEditMessage(bot, chatId, messageId, message, {
          parse_mode: "Markdown",
        });
      }
    } catch (error) {
      console.error("[LocationCallbackHandler] Error:", error);
      await safeEditMessage(bot, chatId, messageId, "× Gagal memproses lokasi.");
    }
  }
}
