/**
 * Smart Paste Handler
 * Auto-detects URLs from supported platforms and offers download confirmation.
 * Implements both MessageHandler (URL detection) and CallbackHandler (confirmation buttons).
 */

import TelegramBot from "node-telegram-bot-api";
import type { MessageHandler, CallbackHandler } from "./types.js";
import { sessionManager, isSmartPasteSession } from "../utils/SessionManager.js";
import { DownloadInputHandler } from "./DownloadCommand.js";
import { MESSAGES } from "../config/messages.js";

/** Supported platform URL patterns */
const SUPPORTED_URL_PATTERNS = [
  // YouTube
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)\S+/i,
  // TikTok
  /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/@[\w.-]+\/video\/\d+|vm\.tiktok\.com\/\w+)/i,
  // Instagram
  /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|reels|tv)\/\S+/i,
  // Twitter/X
  /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/\d+/i,
];

/** General URL extraction pattern */
const URL_EXTRACT_REGEX = /https?:\/\/[^\s]+/i;

/**
 * Smart Paste Message Handler - Detects URLs
 */
export class SmartPasteHandler implements MessageHandler {
  shouldHandle(msg: TelegramBot.Message): boolean {
    const text = msg.text;
    if (!text) return false;
    // Skip commands
    if (text.startsWith("/")) return false;
    // Skip if user has an active session (don't intercept wizard inputs)
    if (sessionManager.hasActiveSession(msg.chat.id)) return false;
    // Check if text contains a supported URL
    return SUPPORTED_URL_PATTERNS.some((pattern) => pattern.test(text));
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text ?? "";

    // Extract the URL
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

    // Store URL in session for callback handler
    sessionManager.startSmartPaste(chatId, url, confirmMsg.message_id);
  }
}

/**
 * Smart Paste Callback Handler - Handles confirmation buttons
 */
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
      await bot.editMessageText(MESSAGES.SMART_PASTE_SESSION_EXPIRED, {
        chat_id: chatId,
        message_id: messageId,
      });
      return;
    }

    const url = state.data.url;

    // Handle cancel
    if (data === "sp_cancel") {
      sessionManager.clearState(chatId);
      await bot.editMessageText(MESSAGES.SMART_PASTE_CANCELLED, {
        chat_id: chatId,
        message_id: messageId,
      });
      return;
    }

    // Handle video/audio
    const isAudio = data === "sp_audio";
    sessionManager.clearState(chatId);

    // Delete confirmation message
    try {
      await bot.deleteMessage(chatId, messageId);
    } catch {
      // Ignore
    }

    // Delegate to DownloadInputHandler's download logic
    await this.downloadHandler.processDownload(bot, chatId, url, isAudio);
  }
}
