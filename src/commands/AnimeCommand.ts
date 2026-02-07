/**
 * Anime search command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { AnimeService } from "../services/AnimeService.js";
import { MESSAGES } from "../config/messages.js";

export class AnimeCommand implements Command {
  pattern = /^\/anime\s+(.+)$/;
  private animeService: AnimeService;

  constructor(animeService: AnimeService) {
    this.animeService = animeService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const keyword = match?.[1]?.trim();

    if (!keyword) {
      await bot.sendMessage(chatId, MESSAGES.INVALID_FORMAT);
      return;
    }

    const searchingMessage = await bot.sendMessage(chatId, MESSAGES.SEARCHING_ANIME(keyword));

    try {
      const anime = await this.animeService.search(keyword);

      if (!anime) {
        await bot.editMessageText(MESSAGES.ERROR_ANIME, {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        });
        return;
      }

      const reply = `
🎥 *${anime.title}* (${anime.type})
📅 Tayang: ${anime.year ?? "N/A"}
⭐ Skor: ${anime.score ?? "N/A"}
🧾 ${anime.synopsis}...

🔗 [Lihat di MAL](${anime.url})
`;

      await bot.deleteMessage(chatId, searchingMessage.message_id);
      await bot.sendPhoto(chatId, anime.imageUrl, {
        caption: reply,
        parse_mode: "Markdown",
      });
    } catch {
      await bot.editMessageText(MESSAGES.ERROR_ANIME, {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      });
    }
  }
}
