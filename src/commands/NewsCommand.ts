import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { NewsService } from "../services/NewsService.js";
import { S } from "../config/symbols.js";
import { executeWithLoading } from "../utils/commandHandler.js";
import { toTitleCase } from "../utils/helpers.js";

export class NewsCommand implements Command {
  pattern = /^\/berita$/;
  private newsService: NewsService;

  constructor(newsService: NewsService) {
    this.newsService = newsService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    await executeWithLoading({
      bot,
      chatId,
      loadingText: "Mengambil berita terkini...",
      errorText: "Gagal mengambil berita.",
      action: async () => {
        const articles = await this.newsService.getTopHeadlines(5);
        if (!articles || articles.length === 0) throw new Error("No articles found");

        let newsText = `*Berita Terkini:*\n\n`;
        for (const article of articles) {
          const rawTitle = article.title.length > 150 ? article.title.substring(0, 147) + "..." : article.title;
          const title = toTitleCase(rawTitle);
          if (article.url && article.url.startsWith("http")) {
            newsText += `${S.BULLET} [${title}](${article.url})\n`;
          } else {
            newsText += `${S.BULLET} ${title}\n`;
          }
        }
        return newsText;
      },
    });
  }
}
