/**
 * Prayer times command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, MessageHandler } from "./types.js";
import { PrayerService } from "../services/PrayerService.js";
import { MESSAGES } from "../config/messages.js";
import { sessionManager } from "../utils/SessionManager.js";

export class PrayerCommand implements Command {
  pattern = /^\/sholat(?:\s+(.+))?$/;
  private prayerService: PrayerService;

  constructor(prayerService: PrayerService) {
    this.prayerService = prayerService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const city = match?.[1]?.trim();

    // If no city provided, show location request button
    if (!city) {
      await sessionManager.setState(chatId, {
        flow: "location",
        step: "waiting",
        data: { command: "prayer" },
      });

      await bot.sendMessage(chatId, "🕌 *Jadwal Sholat*\n\nKetik nama kota atau kirim lokasimu:", {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [[{ text: "📍 Kirim Lokasi", request_location: true }], [{ text: "❌ Batal" }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      return;
    }

    await this.fetchAndSendPrayerTimes(bot, chatId, city);
  }

  async fetchAndSendPrayerTimes(bot: TelegramBot, chatId: number, city: string): Promise<void> {
    const searchingMessage = await bot.sendMessage(chatId, MESSAGES.SEARCHING_PRAYER(city), {
      reply_markup: { remove_keyboard: true },
    });

    try {
      const times = await this.prayerService.getPrayerTimes(city);

      if (!times) {
        await bot.editMessageText(MESSAGES.ERROR_PRAYER_INVALID, {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        });
        return;
      }

      await bot.editMessageText(
        `🕌 Jadwal Sholat di ${city}:\nSubuh: ${times.Fajr}\nDzuhur: ${times.Dhuhr}\nAshar: ${times.Asr}\nMaghrib: ${times.Maghrib}\nIsya: ${times.Isha}`,
        {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        },
      );
    } catch {
      await bot.editMessageText(MESSAGES.ERROR_PRAYER(city), {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      });
    }
  }

  async fetchAndSendPrayerTimesByCoords(bot: TelegramBot, chatId: number, lat: number, lon: number): Promise<void> {
    const searchingMessage = await bot.sendMessage(chatId, "🔍 Mencari jadwal sholat...", {
      reply_markup: { remove_keyboard: true },
    });

    try {
      const times = await this.prayerService.getPrayerTimesByCoords(lat, lon);

      if (!times) {
        await bot.editMessageText("❌ Gagal mendapatkan jadwal sholat.", {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        });
        return;
      }

      await bot.editMessageText(
        `🕌 Jadwal Sholat:\nSubuh: ${times.Fajr}\nDzuhur: ${times.Dhuhr}\nAshar: ${times.Asr}\nMaghrib: ${times.Maghrib}\nIsya: ${times.Isha}`,
        {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        },
      );
    } catch {
      await bot.editMessageText("❌ Gagal mendapatkan jadwal sholat.", {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      });
    }
  }
}

/**
 * Handler for location messages for prayer
 */
export class PrayerLocationHandler implements MessageHandler {
  private prayerCommand: PrayerCommand;

  constructor(prayerCommand: PrayerCommand) {
    this.prayerCommand = prayerCommand;
  }

  shouldHandle(msg: TelegramBot.Message): boolean {
    const chatId = msg.chat.id;
    const state = sessionManager.getState(chatId);

    // Handle location message for prayer flow
    if (msg.location && state?.flow === "location" && state.data.command === "prayer") {
      return true;
    }

    // Handle text input (city name) when awaiting location for prayer
    if (msg.text && state?.flow === "location" && state.data.command === "prayer") {
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
      await this.prayerCommand.fetchAndSendPrayerTimesByCoords(
        bot,
        chatId,
        msg.location.latitude,
        msg.location.longitude,
      );
      return;
    }

    // Handle text (city name)
    if (msg.text) {
      await sessionManager.clearState(chatId);
      await this.prayerCommand.fetchAndSendPrayerTimes(bot, chatId, msg.text);
    }
  }
}
