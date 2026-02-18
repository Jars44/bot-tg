import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { LyricsService } from "../services/LyricsService.js";
import { MESSAGES } from "../config/messages.js";
import { S } from "../config/symbols.js";
import { sessionManager } from "../utils/SessionManager.js";
import { executeWithLoading } from "../utils/commandHandler.js";
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

    const parts = input.split(" - ");
    if (parts.length !== 2) {
      await bot.sendMessage(chatId, `${S.FAIL} Format salah.\nGunakan: \`/lirik [Artis] - [Judul]\``, {
        parse_mode: "Markdown",
      });
      return;
    }

    const [artist, title] = parts.map((s) => s.trim());

    if (!artist || !title) {
      await bot.sendMessage(chatId, MESSAGES.ERROR_LYRICS_FORMAT);
      return;
    }

    await executeWithLoading({
      bot,
      chatId,
      loadingText: `Mencari lirik: ${toTitleCase(title)} - ${toTitleCase(artist)}...`,
      errorText: `Lirik tidak ditemukan: ${toTitleCase(title)} - ${toTitleCase(artist)}`,
      action: async () => {
        const lyrics = await this.lyricsService.getLyrics(artist, title);
        if (!lyrics) throw new Error("Lyrics not found");
        return `*${toTitleCase(title)}* ${S.DASH} ${toTitleCase(artist)}\n\n${lyrics}`;
      },
    });
  }
}
