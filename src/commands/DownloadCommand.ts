/**
 * Download Command
 * Universal media downloader using Cobalt API
 * Supports: YouTube, TikTok, Instagram, Twitter, Twitch, etc.
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, MessageHandler } from "./types.js";
import { DownloadService, DownloadResult } from "../services/DownloadService.js";
import { TempCleanerService } from "../services/TempCleanerService.js";
import fs from "fs";

// URL patterns for supported platforms
const SUPPORTED_URL_PATTERN =
  /https?:\/\/(www\.)?(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|twitter\.com|x\.com|twitch\.tv|reddit\.com|vimeo\.com|soundcloud\.com)/i;

export class DownloadCommand implements Command, MessageHandler {
  // Match /download with optional URL argument
  pattern = /^\/download(?:\s+(.+))?$/;

  private downloadService: DownloadService;
  private tempCleaner: TempCleanerService;

  constructor(downloadService: DownloadService, tempCleaner: TempCleanerService) {
    this.downloadService = downloadService;
    this.tempCleaner = tempCleaner;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const url = match?.[1]?.trim();

    // If no URL provided, show help
    if (!url) {
      await bot.sendMessage(
        chatId,
        `⬇️ *Universal Downloader*\n\n` +
          `Kirim link untuk mengunduh media.\n` +
          `Format: \`/download [URL]\`\n\n` +
          `*Platform yang didukung:*\n` +
          `• YouTube\n` +
          `• TikTok\n` +
          `• Instagram\n` +
          `• Twitter/X\n` +
          `• Twitch\n` +
          `• Reddit\n` +
          `• Vimeo\n` +
          `• SoundCloud\n\n` +
          `Contoh: \`/download https://youtu.be/dQw4w9WgXcQ\``,
        { parse_mode: "Markdown" },
      );
      return;
    }

    await this.processDownload(bot, chatId, url);
  }

  /**
   * Handle direct URL messages (without /download command)
   */
  shouldHandle(msg: TelegramBot.Message): boolean {
    const text = msg.text ?? "";
    // Ignore commands
    if (text.startsWith("/")) return false;
    // Check if it's a supported URL
    return SUPPORTED_URL_PATTERN.test(text);
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const url = msg.text ?? "";
    await this.processDownload(bot, chatId, url);
  }

  /**
   * Core download logic
   */
  private async processDownload(bot: TelegramBot, chatId: number, url: string): Promise<void> {
    // 1. Send "analyzing" status
    const statusMsg = await bot.sendMessage(chatId, "🔍 Menganalisis URL...");
    await bot.sendChatAction(chatId, "typing");

    let result: DownloadResult;

    try {
      // 2. Check if audio-only (SoundCloud, etc.)
      const isAudioOnly = url.includes("soundcloud.com");

      // 3. Download media
      await bot.editMessageText("⬇️ Mengunduh media...", {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });

      result = await this.downloadService.downloadMedia(url, isAudioOnly);

      // 4. Check file size
      if (this.downloadService.isFileTooLarge(result.sizeBytes)) {
        // File too large - send direct link instead
        const directUrl = await this.downloadService.getDirectUrl(url);
        await bot.editMessageText(
          `⚠️ *File terlalu besar* (>${Math.round(result.sizeBytes / 1024 / 1024)}MB)\n\n` +
            `Telegram hanya mendukung hingga 50MB.\n` +
            `Download langsung: ${directUrl}`,
          {
            chat_id: chatId,
            message_id: statusMsg.message_id,
            parse_mode: "Markdown",
          },
        );
        // Cleanup the large file
        this.tempCleaner.deleteFile(result.filePath);
        return;
      }

      // 5. Send file
      await bot.deleteMessage(chatId, statusMsg.message_id);
      await bot.sendChatAction(chatId, result.isAudio ? "upload_voice" : "upload_video");

      if (result.isAudio) {
        await bot.sendAudio(chatId, fs.createReadStream(result.filePath), {
          caption: "🎵 Downloaded via Cobalt",
        });
      } else {
        await bot.sendVideo(chatId, fs.createReadStream(result.filePath), {
          caption: "🎬 Downloaded via Cobalt",
        });
      }

      // 6. Cleanup
      this.tempCleaner.deleteFile(result.filePath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan.";
      await bot.editMessageText(`❌ ${errorMessage}`, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
    }
  }
}
