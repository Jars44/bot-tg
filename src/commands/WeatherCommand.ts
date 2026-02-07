/**
 * Weather command with location lookup
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { WeatherService } from "../services/WeatherService.js";
import { MESSAGES } from "../config/messages.js";

export class WeatherCommand implements Command {
  pattern = /^\/cuaca(?:\s+(.+))?$/;
  private weatherService: WeatherService;

  constructor(weatherService: WeatherService) {
    this.weatherService = weatherService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const location = match?.[1]?.trim() || undefined;
    const displayLocation = location || "Malang";

    const searchingMessage = await bot.sendMessage(chatId, MESSAGES.SEARCHING_WEATHER(displayLocation));

    try {
      const result = await this.weatherService.getWeatherByLocation(location);

      if (!result) {
        await bot.editMessageText(MESSAGES.ERROR_LOCATION_NOT_FOUND(displayLocation), {
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
