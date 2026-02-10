/**
 * Sticker Handler - Handles photo messages during sticker wizard session
 * Intercepts photos when user is in "awaiting_image" state
 */

import TelegramBot from "node-telegram-bot-api";
import type { MessageHandler } from "./types.js";
import { sessionManager } from "../utils/SessionManager.js";
import { StickerService } from "../services/StickerService.js";
import { TempCleanerService } from "../services/TempCleanerService.js";
import { JsonDb } from "../database/JsonDb.js";
import { MESSAGES } from "../config/messages.js";
import { CONFIG } from "../config/index.js";
import { delay } from "../utils/helpers.js";

export class StickerHandler implements MessageHandler {
  private stickerService: StickerService;
  private tempCleaner: TempCleanerService;
  private db: JsonDb;

  constructor(stickerService: StickerService, tempCleaner: TempCleanerService, db: JsonDb) {
    this.stickerService = stickerService;
    this.tempCleaner = tempCleaner;
    this.db = db;
  }

  /**
   * Check if this handler should process the message
   * Only handles photos when user is in sticker wizard awaiting image
   */
  shouldHandle(msg: TelegramBot.Message): boolean {
    // Must be a photo message
    if (!msg.photo || msg.photo.length === 0) {
      return false;
    }

    // Check if user is in sticker wizard awaiting image
    const session = sessionManager.getState(msg.chat.id);
    return session?.flow === "sticker" && session?.step === "awaiting_image";
  }

  /**
   * Handle the photo message - Convert to sticker
   */
  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) {
      await bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
      return;
    }

    // Check rate limit
    const { allowed } = await this.db.canCreateSticker(userId);

    if (!allowed) {
      await bot.sendMessage(chatId, MESSAGES.RATE_LIMIT_REACHED(CONFIG.STICKER_LIMIT));
      await sessionManager.clearState(chatId);
      return;
    }

    let loadingMessage: TelegramBot.Message | null = null;

    try {
      loadingMessage = await bot.sendMessage(chatId, MESSAGES.STICKER_PROCESSING_IMAGE);

      // Get the highest resolution photo
      const photos = msg.photo;
      if (!photos || photos.length === 0) {
        throw new Error("No photo found in message");
      }
      const photo = photos[photos.length - 1];
      const fileId = photo.file_id;

      // Download the photo
      const fileStream = await bot.getFileStream(fileId);
      const chunks: Buffer[] = [];

      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }

      const imageBuffer = Buffer.concat(chunks);

      // Process image to sticker
      const webpPath = await this.stickerService.processImageToSticker(imageBuffer);

      // Send sticker
      await bot.sendSticker(
        chatId,
        webpPath,
        {},
        {
          contentType: "image/webp",
        },
      );

      // Increment rate limit counter
      await this.db.incrementStickerCount(userId);

      // Cleanup
      await delay(3000);
      this.tempCleaner.deleteFile(webpPath);

      // Delete loading message
      if (loadingMessage) {
        await bot.deleteMessage(chatId, loadingMessage.message_id);
      }

      // Clear session
      await sessionManager.clearState(chatId);
    } catch (err) {
      console.error("[StickerHandler] Failed to process image:", err);

      if (loadingMessage) {
        await bot.editMessageText(MESSAGES.ERROR_STICKER, {
          chat_id: chatId,
          message_id: loadingMessage.message_id,
        });
      } else {
        await bot.sendMessage(chatId, MESSAGES.ERROR_STICKER);
      }

      // Clear session on error
      await sessionManager.clearState(chatId);
    }
  }
}
