import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { QuoteService } from "../services/QuoteService.js";
import { S } from "../config/symbols.js";
import { executeWithLoading } from "../utils/commandHandler.js";
import { toTitleCase } from "../utils/helpers.js";

export class QuoteCommand implements Command {
  pattern = /^\/quote$/;
  private quoteService: QuoteService;

  constructor(quoteService: QuoteService) {
    this.quoteService = quoteService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    await executeWithLoading({
      bot,
      chatId,
      loadingText: "Mengambil kutipan...",
      errorText: "Gagal mengambil kutipan.",
      action: async () => {
        const quote = await this.quoteService.getQuoteOfTheDay();
        if (!quote) throw new Error("No quote found");
        return `_"${quote.body}"_\n\n${S.DASH} *${toTitleCase(quote.author)}*`;
      },
    });
  }
}
