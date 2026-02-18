/**
 * Lyrics search command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { LyricsService } from "../services/LyricsService.js";
import { MESSAGES } from "../config/messages.js";
import { safeEditMessage } from "../utils/uiHelper.js";
import { sessionManager } from "../utils/SessionManager.js";
import { toTitleCase } from "../utils/helpers.js";

export class LyricsCommand implements Command {
  pattern = /^\/lirik(?:\s+(.+))?$/;
  private lyricsService: LyricsService;

  constructor(lyricsService: LyricsService) {
    this.lyricsService = lyricsService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const input = match?.[1]?.trim();

    if (!input) {
      await bot.sendMessage(chatId, MESSAGES.GUIDE_LYRICS, { parse_mode: "Markdown" });
      const promptMsg = await bot.sendMessage(chatId, MESSAGES.GUIDE_PROMPT_LYRICS);
      sessionManager.startLyricsSearch(chatId, promptMsg.message_id);
      return;
    }

    // Parse "Artist - Title" format
    const parts = input.split(" - ");
    if (parts.length !== 2) {
      await bot.sendMessage(chatId, "× Format salah.\nGunakan: `/lirik [Artis] - [Judul]`", {
        parse_mode: "Markdown",
      });
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
        const edited = await safeEditMessage(
          bot,
          chatId,
          searchingMessage.message_id,
          MESSAGES.ERROR_LYRICS(title, artist),
        );
        if (!edited) {
          await bot.sendMessage(chatId, MESSAGES.ERROR_LYRICS(title, artist));
        }
        return;
      }

      const lyricsText = `*${toTitleCase(title)}* — ${toTitleCase(artist)}\n\n${lyrics}`;
      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, lyricsText, {
        parse_mode: "Markdown",
      });
      if (!edited) {
        await bot.sendMessage(chatId, lyricsText, {
          parse_mode: "Markdown",
        });
      }
    } catch (error) {
      console.error("[LyricsCommand] Error:", error);
      const edited = await safeEditMessage(
        bot,
        chatId,
        searchingMessage.message_id,
        MESSAGES.ERROR_LYRICS(title, artist),
      );
      if (!edited) {
        await bot.sendMessage(chatId, MESSAGES.ERROR_LYRICS(title, artist));
      }
    }
  }
}
