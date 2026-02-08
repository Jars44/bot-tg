/**
 * Movie search command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { MovieService } from "../services/MovieService.js";
import { MESSAGES } from "../config/messages.js";

export class MovieCommand implements Command {
  pattern = /^\/film(?:\s+(.+))?$/;
  private movieService: MovieService;

  constructor(movieService: MovieService) {
    this.movieService = movieService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const keyword = match?.[1]?.trim();

    if (!keyword) {
      await bot.sendMessage(
        chatId,
        `🎬 *Cari Film*\n\n` +
          `Mencari informasi film dari database TMDB.\n\n` +
          `*Gunakan:* \`/film [judul film]\`\n\n` +
          `*Contoh:*\n` +
          `\`/film Avengers\`\n` +
          `\`/film Interstellar\`\n` +
          `\`/film The Dark Knight\`\n\n` +
          `⚠️ _Fitur experimental - membutuhkan TMDB\\_API\\_KEY_`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    const searchingMessage = await bot.sendMessage(chatId, MESSAGES.SEARCHING_MOVIE(keyword));

    try {
      const movie = await this.movieService.searchMovie(keyword);

      if (!movie) {
        await bot.editMessageText(MESSAGES.ERROR_MOVIE, {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        });
        return;
      }

      const reply = `
Film: ${movie.title}
Tahun: ${movie.releaseDate}
Rating: ${movie.rating}
Deskripsi: ${movie.overview}
`;

      await bot.deleteMessage(chatId, searchingMessage.message_id);
      await bot.sendPhoto(chatId, movie.posterUrl, {
        caption: reply,
        parse_mode: "Markdown",
      });
    } catch {
      await bot.editMessageText(MESSAGES.ERROR_MOVIE, {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      });
    }
  }
}
