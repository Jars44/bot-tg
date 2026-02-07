/**
 * Quote of the day command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { QuoteService } from "../services/QuoteService.js";
import { MESSAGES } from "../config/messages.js";

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
        await bot.editMessageText(MESSAGES.ERROR_QUOTE, {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        });
        return;
      }

      await bot.editMessageText(`"${quote.body}"\n\n- ${quote.author}`, {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      });
    } catch {
      await bot.editMessageText(MESSAGES.ERROR_QUOTE, {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      });
    }
  }
}
