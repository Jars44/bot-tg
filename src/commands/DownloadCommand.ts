/**
 * Download Command - Wizard-Style Menu
 * Universal media downloader with step-by-step flow:
 * 1. /download → Show platform selection
 * 2. Select platform → Show video/audio choice
 * 3. Select format → Ask for URL
 * 4. Send URL → Download and send
 *
 * Memory-Optimized: Works with stream URLs instead of local files.
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler, MessageHandler } from "./types.js";
import { DownloadService, DownloadResult } from "../services/DownloadService.js";
import { sessionManager, DownloadSessionData } from "../utils/SessionManager.js";

// Platform configurations
const PLATFORMS = {
  youtube: { label: "YouTube" },
  tiktok: { label: "TikTok" },
  instagram: { label: "Instagram" },
  twitter: { label: "Twitter/X" },
  other: { label: "Lainnya" },
} as const;

type PlatformKey = keyof typeof PLATFORMS;

/**
 * Main Download Command - Shows wizard menu
 */
export class DownloadCommand implements Command {
  pattern = /^\/download$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: "YouTube", callback_data: "dl_platform_youtube" },
        { text: "TikTok", callback_data: "dl_platform_tiktok" },
      ],
      [
        { text: "Instagram", callback_data: "dl_platform_instagram" },
        { text: "Twitter/X", callback_data: "dl_platform_twitter" },
      ],
      [{ text: "Lainnya", callback_data: "dl_platform_other" }],
      [{ text: "× Batal", callback_data: "dl_cancel" }],
    ];

    const message = await bot.sendMessage(chatId, `*Download*\n\nPilih platform:`, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });

    sessionManager.setState(chatId, {
      flow: "download",
      step: "platform",
      data: { messageId: message.message_id },
    });
  }
}

/**
 * Download Callback Handler - Handles inline button presses
 */
export class DownloadCallbackHandler implements CallbackHandler {
  prefix = "dl_";

  private downloadService: DownloadService;

  constructor(downloadService: DownloadService) {
    this.downloadService = downloadService;
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    await bot.answerCallbackQuery(query.id);

    // Handle cancel
    if (data === "dl_cancel") {
      sessionManager.clearState(chatId);
      await bot.editMessageText("× Download dibatalkan.", {
        chat_id: chatId,
        message_id: messageId,
      });
      return;
    }

    // Handle back to platform selection
    if (data === "dl_back_platform") {
      await this.showPlatformMenu(bot, chatId, messageId);
      return;
    }

    // Handle platform selection
    if (data.startsWith("dl_platform_")) {
      const platform = data.replace("dl_platform_", "") as PlatformKey;
      await this.showFormatSelection(bot, chatId, messageId, platform);
      return;
    }

    // Handle format selection
    if (data.startsWith("dl_format_")) {
      const format = data.replace("dl_format_", "") as "video" | "audio";
      await this.askForUrl(bot, chatId, messageId, format);
      return;
    }
  }

  /**
   * Show platform selection menu (for back button)
   */
  private async showPlatformMenu(bot: TelegramBot, chatId: number, messageId: number): Promise<void> {
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: "YouTube", callback_data: "dl_platform_youtube" },
        { text: "TikTok", callback_data: "dl_platform_tiktok" },
      ],
      [
        { text: "Instagram", callback_data: "dl_platform_instagram" },
        { text: "Twitter/X", callback_data: "dl_platform_twitter" },
      ],
      [{ text: "Lainnya", callback_data: "dl_platform_other" }],
      [{ text: "× Batal", callback_data: "dl_cancel" }],
    ];

    await bot.editMessageText(`*Download*\n\nPilih platform:`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });

    sessionManager.setState(chatId, {
      flow: "download",
      step: "platform",
      data: { messageId },
    });
  }

  /**
   * Step 2: Show video/audio format selection
   */
  private async showFormatSelection(
    bot: TelegramBot,
    chatId: number,
    messageId: number,
    platform: PlatformKey,
  ): Promise<void> {
    const platformInfo = PLATFORMS[platform];

    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: "Video", callback_data: "dl_format_video" },
        { text: "Audio", callback_data: "dl_format_audio" },
      ],
      [{ text: "← Kembali", callback_data: "dl_back_platform" }],
      [{ text: "× Batal", callback_data: "dl_cancel" }],
    ];

    await bot.editMessageText(`*Download → ${platformInfo.label}*\n\nPilih format:`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });

    sessionManager.setState(chatId, {
      flow: "download",
      step: "format",
      data: { platform, messageId },
    });
  }

  /**
   * Step 3: Ask user to send URL
   */
  private async askForUrl(
    bot: TelegramBot,
    chatId: number,
    messageId: number,
    format: "video" | "audio",
  ): Promise<void> {
    const state = sessionManager.getState(chatId);
    if (state?.flow !== "download") return;

    const platformInfo = PLATFORMS[(state.data as DownloadSessionData).platform || "other"];
    const formatText = format === "video" ? "Video" : "Audio";

    await bot.editMessageText(
      `*Download → ${platformInfo.label} → ${formatText}*\n\n` + `Kirim link yang ingin diunduh:`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "× Batal", callback_data: "dl_cancel" }]],
        },
      },
    );

    sessionManager.setState(chatId, {
      flow: "download",
      step: "url",
      data: { ...(state.data as DownloadSessionData), format, messageId },
    });
  }

  /**
   * Get download service for input handler
   */
  getDownloadService(): DownloadService {
    return this.downloadService;
  }
}

/**
 * Download Input Handler - Handles URL text input
 */
export class DownloadInputHandler implements MessageHandler {
  private downloadService: DownloadService;

  constructor(downloadService: DownloadService) {
    this.downloadService = downloadService;
  }

  shouldHandle(msg: TelegramBot.Message): boolean {
    if (!msg.text) return false;
    if (msg.text.startsWith("/")) return false;

    const state = sessionManager.getState(msg.chat.id);
    return state?.flow === "download" && state.step === "url";
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const url = msg.text?.trim();

    if (!url) return;

    const state = sessionManager.getState(chatId);
    if (state?.flow !== "download" || state.step !== "url") return;

    // Clear session
    const sessionData = state.data as DownloadSessionData;
    sessionManager.clearState(chatId);

    // Delete wizard message if we have messageId
    if (sessionData.messageId) {
      try {
        await bot.deleteMessage(chatId, sessionData.messageId);
      } catch {
        // Ignore if message already deleted
      }
    }

    // Process download
    await this.processDownload(bot, chatId, url, sessionData.format === "audio");
  }

  /**
   * Core download logic - Memory-Optimized
   * Public so SmartPasteHandler can reuse it
   */
  async processDownload(bot: TelegramBot, chatId: number, url: string, isAudioOnly: boolean): Promise<void> {
    const statusMsg = await bot.sendMessage(chatId, "⧗ Menganalisis URL...");
    await bot.sendChatAction(chatId, "typing");

    let result: DownloadResult;

    try {
      await bot.editMessageText("⧗ Memproses media...", {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });

      result = await this.downloadService.downloadMedia(url, isAudioOnly);

      await bot.deleteMessage(chatId, statusMsg.message_id);
      await bot.sendChatAction(chatId, result.isAudio ? "upload_voice" : "upload_video");

      const source = result.source === "cobalt" ? "Cobalt" : "yt-dlp";

      if (result.isAudio) {
        await bot.sendAudio(chatId, result.url, {
          caption: `✓ Audio via ${source}`,
          title: result.filename,
        });
      } else {
        await bot.sendVideo(chatId, result.url, {
          caption: `✓ Video via ${source}`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan.";

      try {
        const directUrl = await this.downloadService.getDirectUrl(url, isAudioOnly);
        await bot.editMessageText(
          `⚠︎ *Tidak dapat mengirim file langsung.*\n\n` +
            `Alasan: ${errorMessage.split("\n")[0]}\n\n` +
            `→ Download langsung:\n${directUrl}`,
          {
            chat_id: chatId,
            message_id: statusMsg.message_id,
            parse_mode: "Markdown",
          },
        );
      } catch {
        await bot.editMessageText(`× ${errorMessage}`, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
        });
      }
    }
  }
}
