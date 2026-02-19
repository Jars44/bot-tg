import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { EarthquakeService } from "../services/EarthquakeService.js";
import { MESSAGES } from "../config/messages.js";
import { safeEditMessage } from "../utils/uiHelper.js";

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
        const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_EARTHQUAKE);
        if (!edited) {
          await bot.sendMessage(chatId, MESSAGES.ERROR_EARTHQUAKE);
        }
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
        const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_IMAGE_INVALID);
        if (!edited) {
          await bot.sendMessage(chatId, MESSAGES.ERROR_IMAGE_INVALID);
        }
        return;
      }

      await bot.deleteMessage(chatId, searchingMessage.message_id);

      await bot.sendPhoto(chatId, quake.shakemapUrl, {
        caption: resultText,
      });
    } catch (error) {
      console.error("[EarthquakeCommand] Error:", error);
      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_EARTHQUAKE);
      if (!edited) {
        await bot.sendMessage(chatId, MESSAGES.ERROR_EARTHQUAKE);
      }
    }
  }
}
