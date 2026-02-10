/**
 * Sticker command with Wizard-style interactive flow
 * Supports both text-to-sticker and image-to-sticker conversions
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler } from "./types.js";
import { StickerService } from "../services/StickerService.js";
import { TempCleanerService } from "../services/TempCleanerService.js";
import { JsonDb } from "../database/JsonDb.js";
import { sessionManager } from "../utils/SessionManager.js";
import { MESSAGES } from "../config/messages.js";
import { CONFIG } from "../config/index.js";
import { delay } from "../utils/helpers.js";

export class StickerCommand implements Command, CallbackHandler {
  pattern = /^\/stiker(?:\s+(.+))?$/s;
  prefix = "sticker_";
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

    // If text provided, process directly (legacy support)
    if (text) {
      await this.processTextSticker(bot, chatId, userId, text);
      return;
    }

    // Otherwise, show wizard menu
    await this.showStickerTypeMenu(bot, chatId);
  }

  /**
   * Show initial menu: Image or Text sticker
   */
  private async showStickerTypeMenu(bot: TelegramBot, chatId: number): Promise<void> {
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "Gambar", callback_data: "sticker_type_image" },
          { text: "Teks", callback_data: "sticker_type_text" },
        ],
        [{ text: "× Batal", callback_data: "sticker_cancel" }],
      ],
    };

    const menuMsg = await bot.sendMessage(chatId, MESSAGES.STICKER_MENU, {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });

    // Store menu message ID for later editing
    await sessionManager.setState(chatId, {
      flow: "sticker",
      step: "type_selection",
      data: { messageId: menuMsg.message_id },
    });
  }

  /**
   * Handle callback queries for sticker wizard
   */
  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    try {
      if (data === "sticker_type_image") {
        await this.handleImageTypeSelected(bot, chatId, messageId);
      } else if (data === "sticker_type_text") {
        await this.handleTextTypeSelected(bot, chatId, messageId);
      } else if (data === "sticker_back") {
        await this.handleBack(bot, chatId, messageId);
      } else if (data === "sticker_cancel") {
        await this.handleCancel(bot, chatId, messageId);
      }

      await bot.answerCallbackQuery(query.id);
    } catch (error) {
      console.error("[StickerCommand] Callback error:", error);
      await bot.answerCallbackQuery(query.id, {
        text: "× Terjadi kesalahan",
      });
    }
  }

  /**
   * Handle "Gambar" selection - Start image wizard
   */
  private async handleImageTypeSelected(bot: TelegramBot, chatId: number, messageId: number): Promise<void> {
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "← Kembali", callback_data: "sticker_back" },
          { text: "× Batal", callback_data: "sticker_cancel" },
        ],
      ],
    };

    await bot.editMessageText(MESSAGES.STICKER_IMAGE_PROMPT, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });

    // Update session: now waiting for image
    await sessionManager.setState(chatId, {
      flow: "sticker",
      step: "awaiting_image",
      data: { messageId },
    });
  }

  /**
   * Handle "Teks" selection - Start text wizard
   */
  private async handleTextTypeSelected(bot: TelegramBot, chatId: number, messageId: number): Promise<void> {
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "← Kembali", callback_data: "sticker_back" },
          { text: "× Batal", callback_data: "sticker_cancel" },
        ],
      ],
    };

    await bot.editMessageText(MESSAGES.GUIDE_PROMPT_STICKER, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
    });

    // Update session: now waiting for text input
    await sessionManager.setState(chatId, {
      flow: "sticker",
      step: "awaiting_text",
      data: { messageId },
    });
  }

  /**
   * Handle back button - Return to main menu
   */
  private async handleBack(bot: TelegramBot, chatId: number, messageId: number): Promise<void> {
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "Gambar", callback_data: "sticker_type_image" },
          { text: "Teks", callback_data: "sticker_type_text" },
        ],
        [{ text: "× Batal", callback_data: "sticker_cancel" }],
      ],
    };

    await bot.editMessageText(MESSAGES.STICKER_MENU, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });

    // Update session: back to type selection
    await sessionManager.setState(chatId, {
      flow: "sticker",
      step: "type_selection",
      data: { messageId },
    });
  }

  /**
   * Handle cancel button
   */
  private async handleCancel(bot: TelegramBot, chatId: number, messageId: number): Promise<void> {
    await bot.editMessageText("× Pembuatan stiker dibatalkan.", {
      chat_id: chatId,
      message_id: messageId,
    });

    await sessionManager.clearState(chatId);
  }

  /**
   * Process text input for sticker (called by SessionInputHandler)
   */
  async processTextInput(bot: TelegramBot, chatId: number, userId: number, text: string): Promise<void> {
    await this.processTextSticker(bot, chatId, userId, text);
    await sessionManager.clearState(chatId);
  }

  /**
   * Process text-to-sticker conversion
   */
  private async processTextSticker(bot: TelegramBot, chatId: number, userId: number, text: string): Promise<void> {
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
      console.error("[StickerCommand] Failed to create text sticker:", err);

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
