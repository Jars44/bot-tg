/**
 * Sentiment Analysis Command
 * Analyze market sentiment based on news headlines
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import type { SentimentAnalyzer } from "../services/SentimentAnalyzer.js";

/**
 * Sentiment analysis command
 * Usage: /sentimen [keyword]
 */
export class SentimentCommand implements Command {
  pattern = /^\/sentimen\s+(.+)$/;
  private sentimentAnalyzer: SentimentAnalyzer;

  constructor(sentimentAnalyzer: SentimentAnalyzer) {
    this.sentimentAnalyzer = sentimentAnalyzer;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;

    if (!match || !match[1]) {
      await bot.sendMessage(chatId, "× Format salah.\n\nGunakan: `/sentimen [keyword]`\nContoh: `/sentimen bitcoin`", {
        parse_mode: "Markdown",
      });
      return;
    }

    const keyword = match[1].trim();

    await bot.sendMessage(chatId, `⧗ Menganalisis sentimen untuk "${keyword}"...`);

    try {
      const result = await this.sentimentAnalyzer.analyzeSentiment(keyword);
      const message = this.sentimentAnalyzer.formatSentimentResult(result);

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[SentimentCommand] Error:", error);
      await bot.sendMessage(chatId, "× Gagal menganalisis sentimen. Silakan coba lagi.");
    }
  }
}

/**
 * Help for sentiment command
 */
export class SentimentHelpCommand implements Command {
  pattern = /^\/sentimen$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const message =
      "*Sentiment Analysis*\n\n" +
      "Analisis sentimen pasar berdasarkan berita terkini.\n\n" +
      "*Format:*\n" +
      "`/sentimen [keyword]`\n\n" +
      "*Contoh:*\n" +
      "`/sentimen bitcoin`\n" +
      "`/sentimen ethereum`\n" +
      "`/sentimen crypto`\n" +
      "`/sentimen forex`\n\n" +
      "_Analisis menggunakan keyword scoring dari headline berita._";

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }
}
