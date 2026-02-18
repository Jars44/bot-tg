import TelegramBot from "node-telegram-bot-api";
import type { MessageHandler } from "./types.js";
import { sessionManager } from "../utils/SessionManager.js";
import { StickerService } from "../services/StickerService.js";
import { TempCleanerService } from "../services/TempCleanerService.js";
import { JsonDb } from "../database/JsonDb.js";
import { MESSAGES } from "../config/messages.js";
import { CONFIG } from "../config/index.js";
import { delay } from "../utils/helpers.js";
import { safeEditMessage } from "../utils/uiHelper.js";

export class StickerHandler implements MessageHandler {
  private stickerService: StickerService;
  private tempCleaner: TempCleanerService;
  private db: JsonDb;

  constructor(stickerService: StickerService, tempCleaner: TempCleanerService, db: JsonDb) {
    this.stickerService = stickerService;
    this.tempCleaner = tempCleaner;
    this.db = db;
  }

  shouldHandle(msg: TelegramBot.Message): boolean {
    if (!msg.photo || msg.photo.length === 0) {
      return false;
    }

    const session = sessionManager.getState(msg.chat.id);
    return session?.flow === "sticker" && session?.step === "awaiting_image";
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) {
      await bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
      return;
    }

    const { allowed } = await this.db.canCreateSticker(userId);

    if (!allowed) {
      await bot.sendMessage(chatId, MESSAGES.RATE_LIMIT_REACHED(CONFIG.STICKER_LIMIT));
      await sessionManager.clearState(chatId);
      return;
    }

    let loadingMessage: TelegramBot.Message | null = null;

    try {
      loadingMessage = await bot.sendMessage(chatId, MESSAGES.STICKER_PROCESSING_IMAGE);

      const photos = msg.photo;
      if (!photos || photos.length === 0) {
        throw new Error("No photo found in message");
      }
      const photo = photos[photos.length - 1];
      const fileId = photo.file_id;

      const fileStream = await bot.getFileStream(fileId);
      const chunks: Buffer[] = [];

      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }

      const imageBuffer = Buffer.concat(chunks);

      const webpPath = await this.stickerService.processImageToSticker(imageBuffer);

      const namedPath = Object.assign(webpPath, { name: "sticker.webp" });

      await bot.sendSticker(chatId, namedPath as unknown as string, {});

      await this.db.incrementStickerCount(userId);

      await delay(3000);
      this.tempCleaner.deleteFile(webpPath);

      if (loadingMessage) {
        await bot.deleteMessage(chatId, loadingMessage.message_id);
      }

      await sessionManager.clearState(chatId);
    } catch (err) {
      console.error("[StickerHandler] Failed to process image:", err);

      if (loadingMessage) {
        const edited = await safeEditMessage(bot, chatId, loadingMessage.message_id, MESSAGES.ERROR_STICKER);
        if (!edited) await bot.sendMessage(chatId, MESSAGES.ERROR_STICKER);
      } else {
        await bot.sendMessage(chatId, MESSAGES.ERROR_STICKER);
      }

      await sessionManager.clearState(chatId);
    }
  }
}
