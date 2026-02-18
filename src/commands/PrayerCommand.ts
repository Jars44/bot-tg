/**
 * Prayer times command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { PrayerService } from "../services/PrayerService.js";
import { MESSAGES } from "../config/messages.js";
import { sessionManager } from "../utils/SessionManager.js";
import { getBackToMenuButton, safeEditMessage } from "../utils/uiHelper.js";

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
      const promptMsg = await bot.sendMessage(chatId, "*Jadwal Sholat*\n\nKetik nama kota atau kirim lokasimu:", {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [[{ text: "Kirim Lokasi", request_location: true }], [{ text: "× Batal" }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      sessionManager.startLocationRequest(chatId, "prayer", promptMsg.message_id);
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
        const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_PRAYER_INVALID);
        if (!edited) {
          await bot.sendMessage(chatId, MESSAGES.ERROR_PRAYER_INVALID);
        }
        return;
      }

      const prayerMessage = `Jadwal Sholat di ${city}:\nSubuh: ${times.Fajr}\nDzuhur: ${times.Dhuhr}\nAshar: ${times.Asr}\nMaghrib: ${times.Maghrib}\nIsya: ${times.Isha}`;

      // Only add back button if triggered from menu
      const hasMenuButton = sessionManager.shouldShowMenuButton(chatId);
      const editOptions = hasMenuButton ? { reply_markup: { inline_keyboard: getBackToMenuButton() } } : undefined;

      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, prayerMessage, editOptions);

      if (!edited) {
        try {
          if (hasMenuButton) {
            await bot.sendMessage(chatId, prayerMessage, { reply_markup: { inline_keyboard: getBackToMenuButton() } });
          } else {
            await bot.sendMessage(chatId, prayerMessage);
          }
        } catch (sendError) {
          console.error("[PrayerCommand] Failed to send message:", sendError);
          await bot.sendMessage(chatId, "× Gagal menampilkan jadwal sholat.");
        }
      }
    } catch (error) {
      console.error("[PrayerCommand] Error:", error);
      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_PRAYER(city));
      if (!edited) {
        await bot.sendMessage(chatId, MESSAGES.ERROR_PRAYER(city));
      }
    }
  }

  async fetchAndSendPrayerTimesByCoords(bot: TelegramBot, chatId: number, lat: number, lon: number): Promise<void> {
    const searchingMessage = await bot.sendMessage(chatId, "⧗ Mencari jadwal sholat...", {
      reply_markup: { remove_keyboard: true },
    });

    try {
      const times = await this.prayerService.getPrayerTimesByCoords(lat, lon);

      if (!times) {
        const edited = await safeEditMessage(
          bot,
          chatId,
          searchingMessage.message_id,
          "× Gagal mendapatkan jadwal sholat.",
        );
        if (!edited) {
          await bot.sendMessage(chatId, "× Gagal mendapatkan jadwal sholat.");
        }
        return;
      }

      const prayerMessage = `Jadwal Sholat:\nSubuh: ${times.Fajr}\nDzuhur: ${times.Dhuhr}\nAshar: ${times.Asr}\nMaghrib: ${times.Maghrib}\nIsya: ${times.Isha}`;

      // Only add back button if triggered from menu
      const hasMenuButton = sessionManager.shouldShowMenuButton(chatId);
      const editOptions = hasMenuButton ? { reply_markup: { inline_keyboard: getBackToMenuButton() } } : undefined;

      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, prayerMessage, editOptions);

      if (!edited) {
        try {
          if (hasMenuButton) {
            await bot.sendMessage(chatId, prayerMessage, { reply_markup: { inline_keyboard: getBackToMenuButton() } });
          } else {
            await bot.sendMessage(chatId, prayerMessage);
          }
        } catch (sendError) {
          console.error("[PrayerCommand] Failed to send message:", sendError);
          await bot.sendMessage(chatId, "× Gagal menampilkan jadwal sholat.");
        }
      }
    } catch (error) {
      console.error("[PrayerCommand] Error:", error);
      const edited = await safeEditMessage(
        bot,
        chatId,
        searchingMessage.message_id,
        "× Gagal mendapatkan jadwal sholat.",
      );
      if (!edited) {
        await bot.sendMessage(chatId, "× Gagal mendapatkan jadwal sholat.");
      }
    }
  }
}
