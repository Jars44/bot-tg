/**
 * Weather command with location lookup
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, MessageHandler } from "./types.js";
import { WeatherService } from "../services/WeatherService.js";
import { MESSAGES } from "../config/messages.js";
import { sessionManager } from "../utils/SessionManager.js";

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
      await sessionManager.setState(chatId, {
        flow: "location",
        step: "waiting",
        data: { command: "weather" },
      });

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

      await bot.editMessageText(
        `🌤 Cuaca di ${locationName}:\nSuhu: ${weather.temperature}°C\nAngin: ${weather.windspeed} km/h\nSiang/Malam: ${dayTime}`,
        {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        },
      );
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

/**
 * Handler for location messages for weather
 */
export class WeatherLocationHandler implements MessageHandler {
  private weatherCommand: WeatherCommand;

  constructor(weatherCommand: WeatherCommand) {
    this.weatherCommand = weatherCommand;
  }

  shouldHandle(msg: TelegramBot.Message): boolean {
    const chatId = msg.chat.id;
    const state = sessionManager.getState(chatId);

    // Handle location message for weather flow
    if (msg.location && state?.flow === "location" && state.data.command === "weather") {
      return true;
    }

    // Handle text input (city name) when awaiting location for weather
    if (msg.text && state?.flow === "location" && state.data.command === "weather") {
      return true;
    }

    return false;
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    // Cancel button
    if (msg.text === "❌ Batal") {
      await sessionManager.clearState(chatId);
      await bot.sendMessage(chatId, "👍 Dibatalkan.", { reply_markup: { remove_keyboard: true } });
      return;
    }

    // Handle location
    if (msg.location) {
      await sessionManager.clearState(chatId);
      await this.weatherCommand.fetchAndSendWeatherByCoords(bot, chatId, msg.location.latitude, msg.location.longitude);
      return;
    }

    // Handle text (city name)
    if (msg.text) {
      await sessionManager.clearState(chatId);
      await this.weatherCommand.fetchAndSendWeather(bot, chatId, msg.text);
    }
  }
}
