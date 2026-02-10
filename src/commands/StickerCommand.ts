/**
 * Sticker command with rate limiting and text-to-sticker generation
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { StickerService } from "../services/StickerService.js";
import { TempCleanerService } from "../services/TempCleanerService.js";
import { JsonDb } from "../database/JsonDb.js";
import { MESSAGES } from "../config/messages.js";
import { CONFIG } from "../config/index.js";
import { delay } from "../utils/helpers.js";

export class StickerCommand implements Command {
  pattern = /^\/stiker(?:\s+(.+))?$/s;
  private stickerService: StickerService;
  private tempCleaner: TempCleanerService;
  private db: JsonDb;

  constructor(stickerService: StickerService, tempCleaner: TempCleanerService, db: JsonDb) {
    this.stickerService = stickerService;
    this.tempCleaner = tempCleaner;
    this.db = db;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) {
      await bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
      return;
    }

    const text = match?.[1]?.trim();

    if (!text) {
      await bot.sendMessage(
        chatId,
        `*Buat Stiker*\n\n` +
          `Membuat stiker Telegram instan dari teks yang kamu kirim.\n\n` +
          `*Gunakan:* \`/stiker [teks]\`\n\n` +
          `*Contoh:*\n` +
          `\`/stiker Hello World!\`\n` +
          `\`/stiker Selamat Ulang Tahun\`\n` +
          `\`/stiker GOAL!!!\`\n\n` +
          `_Limit: ${CONFIG.STICKER_LIMIT} stiker per hari._`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    // Check rate limit from database (persisted)
    const { allowed } = await this.db.canCreateSticker(userId);

    if (!allowed) {
      await bot.sendMessage(chatId, MESSAGES.RATE_LIMIT_REACHED(CONFIG.STICKER_LIMIT));
      return;
    }

    let loadingMessage: TelegramBot.Message | null = null;

    try {
      loadingMessage = await bot.sendMessage(chatId, MESSAGES.STICKER_CREATING);

      // Generate sticker
      const webpPath = await this.stickerService.createSticker(text);

      // Send sticker with explicit content type to avoid deprecation warning
      await bot.sendSticker(
        chatId,
        webpPath,
        {},
        {
          contentType: "image/webp",
        },
      );

      // Increment rate limit counter in database
      await this.db.incrementStickerCount(userId);

      // Cleanup: delay then delete temp file
      await delay(3000);
      this.tempCleaner.deleteFile(webpPath);

      // Delete loading message
      await bot.deleteMessage(chatId, loadingMessage.message_id);
    } catch (err) {
      console.error("[StickerCommand] Failed to create sticker:", err);

      if (loadingMessage) {
        await bot.editMessageText(MESSAGES.ERROR_STICKER, {
          chat_id: chatId,
          message_id: loadingMessage.message_id,
        });
      } else {
        await bot.sendMessage(chatId, MESSAGES.ERROR_STICKER);
      }
    }
  }
}
