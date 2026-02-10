/**
 * News command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { NewsService } from "../services/NewsService.js";
import { MESSAGES } from "../config/messages.js";

export class NewsCommand implements Command {
  pattern = /^\/berita$/;
  private newsService: NewsService;

  constructor(newsService: NewsService) {
    this.newsService = newsService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const searchingMessage = await bot.sendMessage(chatId, MESSAGES.SEARCHING_NEWS);

    try {
      const article = await this.newsService.getTopHeadline();

      if (!article) {
        await bot.editMessageText(MESSAGES.ERROR_NEWS, {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        });
        return;
      }

      await bot.editMessageText(`Berita Terkini:\n${article.title}\n\n${article.description}\n\n${article.url}`, {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      });
    } catch {
      await bot.editMessageText(MESSAGES.ERROR_NEWS, {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      });
    }
  }
}
