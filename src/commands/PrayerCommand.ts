/**
 * Prayer times command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { PrayerService } from "../services/PrayerService.js";
import { MESSAGES } from "../config/messages.js";

export class PrayerCommand implements Command {
  pattern = /^\/sholat\s+(.+)$/;
  private prayerService: PrayerService;

  constructor(prayerService: PrayerService) {
    this.prayerService = prayerService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const city = match?.[1]?.trim();

    if (!city) {
      await bot.sendMessage(chatId, MESSAGES.INVALID_FORMAT);
      return;
    }

    const searchingMessage = await bot.sendMessage(chatId, MESSAGES.SEARCHING_PRAYER(city));

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
        `🕌 Jadwal Sholat di ${city}:
Subuh: ${times.Fajr}
Dzuhur: ${times.Dhuhr}
Ashar: ${times.Asr}
Maghrib: ${times.Maghrib}
Isya: ${times.Isha}`,
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
}
