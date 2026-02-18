/**
 * Quote of the day command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { QuoteService } from "../services/QuoteService.js";
import { MESSAGES } from "../config/messages.js";
import { safeEditMessage } from "../utils/uiHelper.js";
import { toTitleCase } from "../utils/helpers.js";

export class QuoteCommand implements Command {
  pattern = /^\/quote$/;
  private quoteService: QuoteService;

  constructor(quoteService: QuoteService) {
    this.quoteService = quoteService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const searchingMessage = await bot.sendMessage(chatId, MESSAGES.SEARCHING_QUOTE);

    try {
      const quote = await this.quoteService.getQuoteOfTheDay();

      if (!quote) {
        const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_QUOTE);
        if (!edited) {
          await bot.sendMessage(chatId, MESSAGES.ERROR_QUOTE);
        }
        return;
      }

      const quoteText = `_"${quote.body}"_\n\n— *${toTitleCase(quote.author)}*`;
      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, quoteText, {
        parse_mode: "Markdown",
      });
      if (!edited) {
        await bot.sendMessage(chatId, quoteText, {
          parse_mode: "Markdown",
        });
      }
    } catch (error) {
      console.error("[QuoteCommand] Error:", error);
      const edited = await safeEditMessage(bot, chatId, searchingMessage.message_id, MESSAGES.ERROR_QUOTE);
      if (!edited) {
        await bot.sendMessage(chatId, MESSAGES.ERROR_QUOTE);
      }
    }
  }
}
