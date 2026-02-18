/**
 * Anime search command with selection list
 * Shows multiple results and allows user to select
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler } from "./types.js";
import { AnimeService, type AnimeResult } from "../services/AnimeService.js";
import { MESSAGES } from "../config/messages.js";
import { sessionManager } from "../utils/SessionManager.js";
import { createNumberedButtons, safeEditMessage } from "../utils/uiHelper.js";
import { toTitleCase } from "../utils/helpers.js";

export class AnimeCommand implements Command {
  pattern = /^\/anime(?:\s+(.+))?$/;
  private animeService: AnimeService;

  constructor(animeService: AnimeService) {
    this.animeService = animeService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const keyword = match?.[1]?.trim();

    if (!keyword) {
      await bot.sendMessage(chatId, MESSAGES.GUIDE_ANIME, { parse_mode: "Markdown" });
      const promptMsg = await bot.sendMessage(chatId, MESSAGES.GUIDE_PROMPT_ANIME);
      sessionManager.startAnimeSearch(chatId, promptMsg.message_id);
      return;
    }

    const searchingMessage = await bot.sendMessage(chatId, MESSAGES.SEARCHING_ANIME(keyword));

    try {
      // Search for multiple results
      const results = await this.animeService.searchMultiple(keyword, 5);

      if (results.length === 0) {
        const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_ANIME);
        if (!edited) {
          await bot.sendMessage(chatId, MESSAGES.ERROR_ANIME);
        }
        return;
      }

      // If only one result, show it directly
      if (results.length === 1) {
        await bot.deleteMessage(chatId, searchingMessage.message_id);
        await this.showAnimeDetail(bot, chatId, results[0]);
        return;
      }

      // Build selection list
      let message = `*Hasil untuk "${toTitleCase(keyword)}":*\n\n`;

      results.forEach((anime, index) => {
        const score = anime.score ? `${anime.score}` : "";
        message += `${index + 1}. *${toTitleCase(anime.title)}* (${anime.type}) ${score}\n`;
      });

      message += "\n_Pilih nomor untuk melihat detail:_";

      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: createNumberedButtons("anime_sel_", results.length),
        },
      });

      if (!edited) {
        // Fallback: send new message if edit fails
        await bot.sendMessage(chatId, message, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: createNumberedButtons("anime_sel_", results.length),
          },
        });
      }

      // Store results in session
      sessionManager.startAnimeSelection(chatId, {
        results: results.map((r) => ({
          id: 0, // Not needed
          title: r.title,
          type: r.type,
          score: r.score,
          imageUrl: r.imageUrl,
          url: r.url,
          synopsis: r.synopsis,
          year: r.year,
        })),
        messageId: searchingMessage.message_id,
      });
    } catch (error) {
      console.error("[AnimeCommand] Error:", error);
      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_ANIME);
      if (!edited) {
        await bot.sendMessage(chatId, MESSAGES.ERROR_ANIME);
      }
    }
  }

  private async showAnimeDetail(bot: TelegramBot, chatId: number, anime: AnimeResult): Promise<void> {
    const reply = `
*${toTitleCase(anime.title)}* (${anime.type})
Tayang: ${anime.year ?? "N/A"}
Skor: ${anime.score ?? "N/A"}
${anime.synopsis}...

→ [Lihat di MAL](${anime.url})
`;

    await bot.sendPhoto(chatId, anime.imageUrl, {
      caption: reply,
      parse_mode: "Markdown",
    });
  }
}

/**
 * Callback handler for anime selection
 */
export class AnimeSelectionHandler implements CallbackHandler {
  prefix = "anime_sel_";

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    const state = sessionManager.getState(chatId);
    if (!state || state.flow !== "anime") {
      await bot.answerCallbackQuery(query.id, { text: "Sesi sudah kadaluarsa" });
      return;
    }

    const index = parseInt(data.replace("anime_sel_", "")) - 1;
    const results = state.data.results;

    if (index < 0 || index >= results.length) {
      await bot.answerCallbackQuery(query.id, { text: "Pilihan tidak valid" });
      return;
    }

    const anime = results[index];

    // Clear session
    sessionManager.clearState(chatId);

    // Delete selection message
    await bot.deleteMessage(chatId, messageId);

    // Show anime detail
    const reply = `
*${toTitleCase(anime.title)}* (${anime.type})
Tayang: ${anime.year ?? "N/A"}
Skor: ${anime.score ?? "N/A"}
${anime.synopsis}...

→ [Lihat di MAL](${anime.url})
`;

    await bot.sendPhoto(chatId, anime.imageUrl, {
      caption: reply,
      parse_mode: "Markdown",
    });

    await bot.answerCallbackQuery(query.id);
  }
}
