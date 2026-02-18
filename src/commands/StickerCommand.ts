import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler } from "./types.js";
import { StickerService } from "../services/StickerService.js";
import { TempCleanerService } from "../services/TempCleanerService.js";
import { JsonDb } from "../database/JsonDb.js";
import { sessionManager } from "../utils/SessionManager.js";
import { safeEditMessage } from "../utils/uiHelper.js";
import { MESSAGES } from "../config/messages.js";
import { CONFIG } from "../config/index.js";
import { delay } from "../utils/helpers.js";
import { S } from "../config/symbols.js";

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

    if (text) {
      await this.processTextSticker(bot, chatId, userId, text);
      return;
    }

    await this.showStickerTypeMenu(bot, chatId);
  }

  private async showStickerTypeMenu(bot: TelegramBot, chatId: number): Promise<void> {
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "Gambar", callback_data: "sticker_type_image" },
          { text: "Teks", callback_data: "sticker_type_text" },
        ],
        [{ text: `${S.FAIL} Batal`, callback_data: "sticker_cancel" }],
      ],
    };

    const menuMsg = await bot.sendMessage(chatId, MESSAGES.STICKER_MENU, {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });

    await sessionManager.setState(chatId, {
      flow: "sticker",
      step: "type_selection",
      data: { messageId: menuMsg.message_id },
    });
  }

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
        text: `${S.FAIL} Terjadi kesalahan`,
      });
    }
  }

  private async handleImageTypeSelected(bot: TelegramBot, chatId: number, messageId: number): Promise<void> {
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "← Kembali", callback_data: "sticker_back" },
          { text: `${S.FAIL} Batal`, callback_data: "sticker_cancel" },
        ],
      ],
    };

    await safeEditMessage(bot, chatId, messageId, MESSAGES.STICKER_IMAGE_PROMPT, {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });

    await sessionManager.setState(chatId, {
      flow: "sticker",
      step: "awaiting_image",
      data: { messageId },
    });
  }

  private async handleTextTypeSelected(bot: TelegramBot, chatId: number, messageId: number): Promise<void> {
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "← Kembali", callback_data: "sticker_back" },
          { text: `${S.FAIL} Batal`, callback_data: "sticker_cancel" },
        ],
      ],
    };

    await safeEditMessage(bot, chatId, messageId, MESSAGES.GUIDE_PROMPT_STICKER, {
      reply_markup: keyboard,
    });

    await sessionManager.setState(chatId, {
      flow: "sticker",
      step: "awaiting_text",
      data: { messageId },
    });
  }

  private async handleBack(bot: TelegramBot, chatId: number, messageId: number): Promise<void> {
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "Gambar", callback_data: "sticker_type_image" },
          { text: "Teks", callback_data: "sticker_type_text" },
        ],
        [{ text: `${S.FAIL} Batal`, callback_data: "sticker_cancel" }],
      ],
    };

    await safeEditMessage(bot, chatId, messageId, MESSAGES.STICKER_MENU, {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });

    await sessionManager.setState(chatId, {
      flow: "sticker",
      step: "type_selection",
      data: { messageId },
    });
  }

  private async handleCancel(bot: TelegramBot, chatId: number, messageId: number): Promise<void> {
    await safeEditMessage(bot, chatId, messageId, `${S.FAIL} Pembuatan stiker dibatalkan.`);

    await sessionManager.clearState(chatId);
  }

  async processTextInput(bot: TelegramBot, chatId: number, userId: number, text: string): Promise<void> {
    await this.processTextSticker(bot, chatId, userId, text);
    await sessionManager.clearState(chatId);
  }

  private async processTextSticker(bot: TelegramBot, chatId: number, userId: number, text: string): Promise<void> {
    const { allowed } = await this.db.canCreateSticker(userId);

    if (!allowed) {
      await bot.sendMessage(chatId, MESSAGES.RATE_LIMIT_REACHED(CONFIG.STICKER_LIMIT));
      return;
    }

    let loadingMessage: TelegramBot.Message | null = null;

    try {
      loadingMessage = await bot.sendMessage(chatId, MESSAGES.STICKER_CREATING);

      const webpPath = await this.stickerService.createSticker(text);

      const namedPath = Object.assign(webpPath, { name: "sticker.webp" });

      await bot.sendSticker(chatId, namedPath as unknown as string, {});

      await this.db.incrementStickerCount(userId);

      await delay(3000);
      this.tempCleaner.deleteFile(webpPath);

      await bot.deleteMessage(chatId, loadingMessage.message_id);
    } catch (err) {
      console.error("[StickerCommand] Failed to create text sticker:", err);

      if (loadingMessage) {
        const edited = await safeEditMessage(bot, chatId, loadingMessage.message_id, MESSAGES.ERROR_STICKER);
        if (!edited) await bot.sendMessage(chatId, MESSAGES.ERROR_STICKER);
      } else {
        await bot.sendMessage(chatId, MESSAGES.ERROR_STICKER);
      }
    }
  }
}
