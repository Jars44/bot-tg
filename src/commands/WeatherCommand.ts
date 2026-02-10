/**
 * Weather command with location lookup
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { WeatherService } from "../services/WeatherService.js";
import { MESSAGES } from "../config/messages.js";
import { sessionManager } from "../utils/SessionManager.js";
import { getBackToMenuButton } from "../utils/uiHelper.js";

export class WeatherCommand implements Command {
  pattern = /^\/cuaca(?:\s+(.+))?$/;
  private weatherService: WeatherService;

  constructor(weatherService: WeatherService) {
    this.weatherService = weatherService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const location = match?.[1]?.trim();

    // If no city provided, show location request button
    if (!location) {
      sessionManager.startLocationRequest(chatId, "weather");

      await bot.sendMessage(chatId, "🌤 *Cuaca*\n\nKetik nama kota atau kirim lokasimu:", {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [[{ text: "📍 Kirim Lokasi", request_location: true }], [{ text: "❌ Batal" }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      return;
    }

    await this.fetchAndSendWeather(bot, chatId, location);
  }

  async fetchAndSendWeather(bot: TelegramBot, chatId: number, location: string): Promise<void> {
    const searchingMessage = await bot.sendMessage(chatId, MESSAGES.SEARCHING_WEATHER(location), {
      reply_markup: { remove_keyboard: true },
    });

    try {
      const result = await this.weatherService.getWeatherByLocation(location);

      if (!result) {
        await bot.editMessageText(MESSAGES.ERROR_LOCATION_NOT_FOUND(location), {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        });
        return;
      }

      const { weather, locationName } = result;
      const dayTime = weather.is_day ? "Siang" : "Malam";

      try {
        await bot.editMessageText(
          `🌤 Cuaca di ${locationName}:\nSuhu: ${weather.temperature}°C\nAngin: ${weather.windspeed} km/h\nSiang/Malam: ${dayTime}`,
          {
            chat_id: chatId,
            message_id: searchingMessage.message_id,
            reply_markup: { inline_keyboard: getBackToMenuButton() },
          },
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("[WeatherCommand] Edit failed:", err.message);
        await bot.sendMessage(
          chatId,
          `🌤 Cuaca di ${locationName}:\nSuhu: ${weather.temperature}°C\nAngin: ${weather.windspeed} km/h\nSiang/Malam: ${dayTime}`,
        );
      }
    } catch {
      await bot.editMessageText(MESSAGES.ERROR_WEATHER, {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      });
    }
  }

  async fetchAndSendWeatherByCoords(bot: TelegramBot, chatId: number, lat: number, lon: number): Promise<void> {
    const searchingMessage = await bot.sendMessage(chatId, "🔍 Mencari cuaca...", {
      reply_markup: { remove_keyboard: true },
    });

    try {
      const result = await this.weatherService.getWeatherByCoords(lat, lon);

      if (!result) {
        await bot.editMessageText("❌ Gagal mendapatkan data cuaca.", {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        });
        return;
      }

      const { weather, locationName } = result;
      const dayTime = weather.is_day ? "Siang" : "Malam";

      await bot.editMessageText(
        `🌤 Cuaca di ${locationName}:\nSuhu: ${weather.temperature}°C\nAngin: ${weather.windspeed} km/h\nSiang/Malam: ${dayTime}`,
        {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
          reply_markup: { inline_keyboard: getBackToMenuButton() },
        },
      );
    } catch {
      await bot.editMessageText(MESSAGES.ERROR_WEATHER, {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      });
    }
  }
}
