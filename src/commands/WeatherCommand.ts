import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { WeatherService } from "../services/WeatherService.js";
import { MESSAGES } from "../config/messages.js";
import { S } from "../config/symbols.js";
import { sessionManager } from "../utils/SessionManager.js";
import { getBackToMenuButton, safeEditMessage } from "../utils/uiHelper.js";
import { toTitleCase } from "../utils/helpers.js";

export class WeatherCommand implements Command {
  pattern = /^\/cuaca(?:\s+(.+))?$/;
  private weatherService: WeatherService;

  constructor(weatherService: WeatherService) {
    this.weatherService = weatherService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const location = match?.[1]?.trim();

    if (!location) {
      const promptMsg = await bot.sendMessage(chatId, "*Cuaca*\n\nKetik nama kota atau kirim lokasimu:", {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [[{ text: "Kirim Lokasi", request_location: true }], [{ text: `${S.FAIL} Batal` }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      sessionManager.startLocationRequest(chatId, "weather", promptMsg.message_id);
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
        const edited = await safeEditMessage(
          bot,
          chatId,
          searchingMessage.message_id,
          MESSAGES.ERROR_LOCATION_NOT_FOUND(location),
        );
        if (!edited) {
          await bot.sendMessage(chatId, MESSAGES.ERROR_LOCATION_NOT_FOUND(location));
        }
        return;
      }

      const { weather, locationName } = result;
      const dayTime = weather.is_day ? "Siang" : "Malam";
      const weatherMessage = `Cuaca di ${toTitleCase(locationName)}:\nSuhu: ${weather.temperature}${S.TEMP}C\nAngin: ${weather.windspeed} km/h\nSiang/Malam: ${dayTime}`;

      const hasMenuButton = sessionManager.shouldShowMenuButton(chatId);
      const editOptions = hasMenuButton ? { reply_markup: { inline_keyboard: getBackToMenuButton() } } : undefined;

      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, weatherMessage, editOptions);

      if (!edited) {
        try {
          if (hasMenuButton) {
            await bot.sendMessage(chatId, weatherMessage, { reply_markup: { inline_keyboard: getBackToMenuButton() } });
          } else {
            await bot.sendMessage(chatId, weatherMessage);
          }
        } catch (sendError) {
          console.error("[WeatherCommand] Failed to send message:", sendError);
          await bot.sendMessage(chatId, `${S.FAIL} Gagal menampilkan cuaca.`);
        }
      }
    } catch (error) {
      console.error("[WeatherCommand] Error:", error);
      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_WEATHER);
      if (!edited) {
        await bot.sendMessage(chatId, MESSAGES.ERROR_WEATHER);
      }
    }
  }

  async fetchAndSendWeatherByCoords(bot: TelegramBot, chatId: number, lat: number, lon: number): Promise<void> {
    const searchingMessage = await bot.sendMessage(chatId, `${S.LOADING} Mencari cuaca...`, {
      reply_markup: { remove_keyboard: true },
    });

    try {
      const result = await this.weatherService.getWeatherByCoords(lat, lon);

      if (!result) {
        const edited = await safeEditMessage(
          bot,
          chatId,
          searchingMessage.message_id,
          `${S.FAIL} Gagal mendapatkan data cuaca.`,
        );
        if (!edited) {
          await bot.sendMessage(chatId, `${S.FAIL} Gagal mendapatkan data cuaca.`);
        }
        return;
      }

      const { weather, locationName } = result;
      const dayTime = weather.is_day ? "Siang" : "Malam";
      const weatherMessage = `Cuaca di ${toTitleCase(locationName)}:\nSuhu: ${weather.temperature}${S.TEMP}C\nAngin: ${weather.windspeed} km/h\nSiang/Malam: ${dayTime}`;

      const hasMenuButton = sessionManager.shouldShowMenuButton(chatId);
      const editOptions = hasMenuButton ? { reply_markup: { inline_keyboard: getBackToMenuButton() } } : undefined;

      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, weatherMessage, editOptions);

      if (!edited) {
        try {
          if (hasMenuButton) {
            await bot.sendMessage(chatId, weatherMessage, { reply_markup: { inline_keyboard: getBackToMenuButton() } });
          } else {
            await bot.sendMessage(chatId, weatherMessage);
          }
        } catch (sendError) {
          console.error("[WeatherCommand] Failed to send message:", sendError);
          await bot.sendMessage(chatId, `${S.FAIL} Gagal menampilkan cuaca.`);
        }
      }
    } catch (error) {
      console.error("[WeatherCommand] Error:", error);
      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_WEATHER);
      if (!edited) {
        await bot.sendMessage(chatId, MESSAGES.ERROR_WEATHER);
      }
    }
  }
}
