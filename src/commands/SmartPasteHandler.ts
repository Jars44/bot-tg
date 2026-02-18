import TelegramBot from "node-telegram-bot-api";
import type { MessageHandler, CallbackHandler } from "./types.js";
import { sessionManager, isSmartPasteSession } from "../utils/SessionManager.js";
import { DownloadInputHandler } from "./DownloadCommand.js";
import { MESSAGES } from "../config/messages.js";
import { safeEditMessage } from "../utils/uiHelper.js";

const SUPPORTED_URL_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)\S+/i,
  /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/@[\w.-]+\/video\/\d+|vm\.tiktok\.com\/\w+)/i,
  /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|reels|tv)\/\S+/i,
  /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/\d+/i,
];

const URL_EXTRACT_REGEX = /https?:\/\/[^\s]+/i;

export class SmartPasteHandler implements MessageHandler {
  shouldHandle(msg: TelegramBot.Message): boolean {
    const text = msg.text;
    if (!text) return false;
    if (text.startsWith("/")) return false;
    if (sessionManager.hasActiveSession(msg.chat.id)) return false;
    return SUPPORTED_URL_PATTERNS.some((pattern) => pattern.test(text));
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text ?? "";

    const urlMatch = text.match(URL_EXTRACT_REGEX);
    if (!urlMatch) return;

    const url = urlMatch[0];

    const confirmMsg = await bot.sendMessage(chatId, MESSAGES.SMART_PASTE_CONFIRM(url), {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Video", callback_data: "sp_video" },
            { text: "Audio", callback_data: "sp_audio" },
          ],
          [{ text: "Batal", callback_data: "sp_cancel" }],
        ],
      },
    });

    sessionManager.startSmartPaste(chatId, url, confirmMsg.message_id);
  }
}

export class SmartPasteCallbackHandler implements CallbackHandler {
  prefix = "sp_";
  private downloadHandler: DownloadInputHandler;

  constructor(downloadHandler: DownloadInputHandler) {
    this.downloadHandler = downloadHandler;
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    await bot.answerCallbackQuery(query.id);

    const state = sessionManager.getState(chatId);
    if (!isSmartPasteSession(state)) {
      await safeEditMessage(bot, chatId, messageId, MESSAGES.SMART_PASTE_SESSION_EXPIRED);
      return;
    }

    const url = state.data.url;

    if (data === "sp_cancel") {
      sessionManager.clearState(chatId);
      await safeEditMessage(bot, chatId, messageId, MESSAGES.SMART_PASTE_CANCELLED);
      return;
    }

    const isAudio = data === "sp_audio";
    sessionManager.clearState(chatId);

    try {
      await bot.deleteMessage(chatId, messageId);
    } catch {
      /* empty */
    }

    await this.downloadHandler.processDownload(bot, chatId, url, isAudio);
  }
}
