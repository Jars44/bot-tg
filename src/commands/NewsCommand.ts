/**
 * News command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { NewsService } from "../services/NewsService.js";
import { MESSAGES } from "../config/messages.js";
import { safeEditMessage } from "../utils/uiHelper.js";

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
        const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_NEWS);
        if (!edited) {
          await bot.sendMessage(chatId, MESSAGES.ERROR_NEWS);
        }
        return;
      }

      const newsText = `Berita Terkini:\n${article.title}\n\n${article.description}\n\n${article.url}`;
      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, newsText);
      if (!edited) {
        await bot.sendMessage(chatId, newsText);
      }
    } catch (error) {
      console.error("[NewsCommand] Error:", error);
      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_NEWS);
      if (!edited) {
        await bot.sendMessage(chatId, MESSAGES.ERROR_NEWS);
      }
    }
  }
}
