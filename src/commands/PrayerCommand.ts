/**
 * Prayer times command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { PrayerService } from "../services/PrayerService.js";
import { MESSAGES } from "../config/messages.js";
import { sessionManager } from "../utils/SessionManager.js";
import { getBackToMenuButton } from "../utils/uiHelper.js";

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
      sessionManager.startLocationRequest(chatId, "prayer");

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
          reply_markup: { inline_keyboard: getBackToMenuButton() },
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
          reply_markup: { inline_keyboard: getBackToMenuButton() },
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
