/**
 * Movie search command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { MovieService } from "../services/MovieService.js";
import { MESSAGES } from "../config/messages.js";
import { safeEditMessage } from "../utils/uiHelper.js";
import { sessionManager } from "../utils/SessionManager.js";

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
      await bot.sendMessage(chatId, MESSAGES.GUIDE_MOVIE, { parse_mode: "Markdown" });
      const promptMsg = await bot.sendMessage(chatId, MESSAGES.GUIDE_PROMPT_MOVIE);
      sessionManager.startMovieSearch(chatId, promptMsg.message_id);
      return;
    }

    const searchingMessage = await bot.sendMessage(chatId, MESSAGES.SEARCHING_MOVIE(keyword));

    try {
      const movie = await this.movieService.searchMovie(keyword);

      if (!movie) {
        const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_MOVIE);
        if (!edited) {
          await bot.sendMessage(chatId, MESSAGES.ERROR_MOVIE);
        }
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
    } catch (error) {
      console.error("[MovieCommand] Error:", error);
      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_MOVIE);
      if (!edited) {
        await bot.sendMessage(chatId, MESSAGES.ERROR_MOVIE);
      }
    }
  }
}
