/**
 * Lyrics search command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { LyricsService } from "../services/LyricsService.js";
import { MESSAGES } from "../config/messages.js";

export class LyricsCommand implements Command {
  pattern = /^\/lirik\s+(.+)$/;
  private lyricsService: LyricsService;

  constructor(lyricsService: LyricsService) {
    this.lyricsService = lyricsService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const input = match?.[1]?.trim();

    if (!input) {
      await bot.sendMessage(chatId, MESSAGES.ERROR_LYRICS_FORMAT);
      return;
    }

    // Parse "Artist - Title" format
    const parts = input.split(" - ");
    if (parts.length !== 2) {
      await bot.sendMessage(chatId, MESSAGES.ERROR_LYRICS_FORMAT);
      return;
    }

    const [artist, title] = parts.map((s) => s.trim());

    if (!artist || !title) {
      await bot.sendMessage(chatId, MESSAGES.ERROR_LYRICS_FORMAT);
      return;
    }

    const searchingMessage = await bot.sendMessage(chatId, MESSAGES.SEARCHING_LYRICS(title, artist));

    try {
      const lyrics = await this.lyricsService.getLyrics(artist, title);

      if (!lyrics) {
        await bot.editMessageText(MESSAGES.ERROR_LYRICS(title, artist), {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        });
        return;
      }

      await bot.editMessageText(`🎵 *${title}* - ${artist}\n\n${lyrics}`, {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
        parse_mode: "Markdown",
      });
    } catch {
      await bot.editMessageText(MESSAGES.ERROR_LYRICS(title, artist), {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      });
    }
  }
}
