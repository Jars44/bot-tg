/**
 * Earthquake data command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { EarthquakeService } from "../services/EarthquakeService.js";
import { MESSAGES } from "../config/messages.js";

export class EarthquakeCommand implements Command {
  pattern = /^\/gempa$/;
  private earthquakeService: EarthquakeService;

  constructor(earthquakeService: EarthquakeService) {
    this.earthquakeService = earthquakeService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const searchingMessage = await bot.sendMessage(chatId, MESSAGES.SEARCHING_EARTHQUAKE);

    try {
      const quake = await this.earthquakeService.getLatestEarthquake();

      if (!quake) {
        await bot.editMessageText(MESSAGES.ERROR_EARTHQUAKE, {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        });
        return;
      }

      const resultText = `
Waktu: ${quake.date} | ${quake.time}
Koordinat: ${quake.coordinates}
Lintang: ${quake.latitude}
Bujur: ${quake.longitude}
Magnitudo: ${quake.magnitude} SR
Kedalaman: ${quake.depth}
Wilayah: ${quake.region}
Potensi: ${quake.potential}
`;

      if (!quake.shakemapUrl) {
        await bot.editMessageText(MESSAGES.ERROR_IMAGE_INVALID, {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        });
        return;
      }

      await bot.deleteMessage(chatId, searchingMessage.message_id);
      await bot.sendPhoto(chatId, quake.shakemapUrl, {
        caption: resultText,
      });
    } catch {
      await bot.editMessageText(MESSAGES.ERROR_EARTHQUAKE, {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      });
    }
  }
}
