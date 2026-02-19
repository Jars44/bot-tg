import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { WeatherService } from "../services/WeatherService.js";
import { MESSAGES } from "../config/messages.js";
import { S } from "../config/symbols.js";
import { sessionManager } from "../utils/SessionManager.js";
import { getBackToMenuButton, safeEditMessage } from "../utils/uiHelper.js";

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
      const promptMsg = await bot.sendMessage(
        chatId,
        "*Cuaca*\n\nKetik nama kota atau kirim lokasimu:\n\n_Tip: Untuk hasil lebih akurat, ketik spesifik seperti_ `Singosari, Malang` _atau_ `Singosari, Malang, Jawa Timur`",
        {
          parse_mode: "Markdown",
          reply_markup: {
            keyboard: [[{ text: "Kirim Lokasi", request_location: true }], [{ text: `${S.FAIL} Batal` }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      );
      sessionManager.startLocationRequest(chatId, "weather", promptMsg.message_id);
      return;
    }

    await this.fetchAndSendWeather(bot, chatId, location);
  }

  private async sendWeatherResult(bot: TelegramBot, chatId: number, msgId: number, message: string): Promise<void> {
    const hasMenuButton = sessionManager.shouldShowMenuButton(chatId);
    const options = hasMenuButton
      ? { parse_mode: "Markdown" as const, reply_markup: { inline_keyboard: getBackToMenuButton() } }
      : { parse_mode: "Markdown" as const };

    const edited = await safeEditMessage(bot, chatId, msgId, message, options);
    if (!edited) {
      // Edit failed — delete the stale loading message before sending a fresh one
      try {
        await bot.deleteMessage(chatId, msgId);
      } catch {
        /* ignore if already gone */
      }
      await bot.sendMessage(chatId, message, options);
    }
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
          try {
            await bot.deleteMessage(chatId, searchingMessage.message_id);
          } catch {
            /* ignore */
          }
          await bot.sendMessage(chatId, MESSAGES.ERROR_LOCATION_NOT_FOUND(location));
        }
        return;
      }

      const message = this.weatherService.formatWeatherMessage(result.weather);
      await this.sendWeatherResult(bot, chatId, searchingMessage.message_id, message);
    } catch (error) {
      console.error("[WeatherCommand] Error:", error);
      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_WEATHER);
      if (!edited) {
        try {
          await bot.deleteMessage(chatId, searchingMessage.message_id);
        } catch {
          /* ignore */
        }
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
          try {
            await bot.deleteMessage(chatId, searchingMessage.message_id);
          } catch {
            /* ignore */
          }
          await bot.sendMessage(chatId, `${S.FAIL} Gagal mendapatkan data cuaca.`);
        }
        return;
      }

      const message = this.weatherService.formatWeatherMessage(result.weather);
      await this.sendWeatherResult(bot, chatId, searchingMessage.message_id, message);
    } catch (error) {
      console.error("[WeatherCommand] Error:", error);
      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_WEATHER);
      if (!edited) {
        try {
          await bot.deleteMessage(chatId, searchingMessage.message_id);
        } catch {
          /* ignore */
        }
        await bot.sendMessage(chatId, MESSAGES.ERROR_WEATHER);
      }
    }
  }
}
