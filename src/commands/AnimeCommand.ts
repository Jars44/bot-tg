/**
 * Anime search command with selection list
 * Shows multiple results and allows user to select
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler } from "./types.js";
import { AnimeService, type AnimeResult } from "../services/AnimeService.js";
import { MESSAGES } from "../config/messages.js";
import { sessionManager } from "../utils/SessionManager.js";
import { createNumberedButtons, withLoading } from "../utils/uiHelper.js";

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
      await bot.sendMessage(chatId, "❌ Format tidak lengkap!\nContoh: `/anime Naruto`", { parse_mode: "Markdown" });
      return;
    }

    await withLoading(bot, chatId, async () => {
      try {
        // Search for multiple results
        const results = await this.animeService.searchMultiple(keyword, 5);

        if (results.length === 0) {
          await bot.sendMessage(chatId, MESSAGES.ERROR_ANIME);
          return;
        }

        // If only one result, show it directly
        if (results.length === 1) {
          await this.showAnimeDetail(bot, chatId, results[0]);
          return;
        }

        // Build selection list
        let message = `🔍 *Hasil untuk "${keyword}":*\n\n`;

        results.forEach((anime, index) => {
          const score = anime.score ? `⭐ ${anime.score}` : "";
          message += `${index + 1}. *${anime.title}* (${anime.type}) ${score}\n`;
        });

        message += "\n_Pilih nomor untuk melihat detail:_";

        const sentMessage = await bot.sendMessage(chatId, message, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: createNumberedButtons("anime_sel_", results.length),
          },
        });

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
          messageId: sentMessage.message_id,
        });
      } catch {
        await bot.sendMessage(chatId, MESSAGES.ERROR_ANIME);
      }
    });
  }

  private async showAnimeDetail(bot: TelegramBot, chatId: number, anime: AnimeResult): Promise<void> {
    const reply = `
🎥 *${anime.title}* (${anime.type})
📅 Tayang: ${anime.year ?? "N/A"}
⭐ Skor: ${anime.score ?? "N/A"}
🧾 ${anime.synopsis}...

🔗 [Lihat di MAL](${anime.url})
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
🎥 *${anime.title}* (${anime.type})
📅 Tayang: ${anime.year ?? "N/A"}
⭐ Skor: ${anime.score ?? "N/A"}
🧾 ${anime.synopsis}...

🔗 [Lihat di MAL](${anime.url})
`;

    await bot.sendPhoto(chatId, anime.imageUrl, {
      caption: reply,
      parse_mode: "Markdown",
    });

    await bot.answerCallbackQuery(query.id);
  }
}
