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
      const articles = await this.newsService.getTopHeadlines(5);

      if (!articles || articles.length === 0) {
        const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_NEWS);
        if (!edited) {
          await bot.sendMessage(chatId, MESSAGES.ERROR_NEWS);
        }
        return;
      }

      let newsText = `*Berita Terkini:*\n\n`;

      for (const article of articles) {
        // Ensure title is not too long for the link text
        const title = article.title.length > 150 ? article.title.substring(0, 147) + "..." : article.title;

        if (article.url && article.url.startsWith("http")) {
          newsText += `• [${title}](${article.url})\n`;
        } else {
          newsText += `• ${title}\n`;
        }
      }

      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, newsText, {
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      });

      if (!edited) {
        await bot.sendMessage(chatId, newsText, {
          parse_mode: "Markdown",
          disable_web_page_preview: false,
        });
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
