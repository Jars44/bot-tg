/**
 * Sentiment Analysis Command
 * Analyze market sentiment based on news headlines
 */

import TelegramBot from "node-telegram-bot-api";
import { MESSAGES } from "../config/messages.js";
import { sessionManager } from "../utils/SessionManager.js";
import { safeEditMessage } from "../utils/uiHelper.js";
import type { Command } from "./types.js";
import type { SentimentAnalyzer } from "../services/SentimentAnalyzer.js";

/**
 * Sentiment analysis command
 * Usage: /sentimen [keyword]
 */
export class SentimentCommand implements Command {
  pattern = /^\/sentimen(?:\s+(.+))?$/;
  private sentimentAnalyzer: SentimentAnalyzer;

  constructor(sentimentAnalyzer: SentimentAnalyzer) {
    this.sentimentAnalyzer = sentimentAnalyzer;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;

    if (!match || !match[1]) {
      await bot.sendMessage(chatId, MESSAGES.GUIDE_SENTIMENT, { parse_mode: "Markdown" });
      const promptMsg = await bot.sendMessage(chatId, MESSAGES.GUIDE_PROMPT_SENTIMENT);
      sessionManager.startSentimentWizard(chatId, promptMsg.message_id);
      return;
    }

    const keyword = match[1].trim();

    const analyzingMsg = await bot.sendMessage(chatId, MESSAGES.SENTIMENT_ANALYZING(keyword));

    try {
      const result = await this.sentimentAnalyzer.analyzeSentiment(keyword);
      const message = this.sentimentAnalyzer.formatSentimentResult(result);

      // Edit the analyzing message with the result
      const edited = await safeEditMessage(bot, chatId, analyzingMsg.message_id, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true, // Disable preview to keep it clean
      });

      if (!edited) {
        // Fallback if edit fails
        await bot.sendMessage(chatId, message, { parse_mode: "Markdown", disable_web_page_preview: true });
      }
    } catch (error) {
      console.error("[SentimentCommand] Error:", error);
      await safeEditMessage(bot, chatId, analyzingMsg.message_id, MESSAGES.SENTIMENT_ERROR);
    }
  }
}
