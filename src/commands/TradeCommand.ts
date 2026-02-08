/**
 * Paper Trading Commands
 * Buy, Sell, and Portfolio commands for virtual trading
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import type { TradingEngine } from "../services/TradingEngine.js";

/**
 * View paper trading portfolio
 */
export class PortfolioCommand implements Command {
  pattern = /^\/portfolio$/;
  private tradingEngine: TradingEngine;

  constructor(tradingEngine: TradingEngine) {
    this.tradingEngine = tradingEngine;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId, "📊 Mengambil data portfolio...");

    try {
      const summary = await this.tradingEngine.getPortfolioSummary(chatId);
      const message = this.tradingEngine.formatPortfolioSummary(summary);

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[PortfolioCommand] Error:", error);
      await bot.sendMessage(chatId, "❌ Gagal mengambil data portfolio. Silakan coba lagi.");
    }
  }
}

/**
 * Buy command for paper trading
 * Usage: /buy [symbol] [quantity]
 */
export class BuyCommand implements Command {
  pattern = /^\/buy\s+(\w+)\s+([\d.]+)$/;
  private tradingEngine: TradingEngine;

  constructor(tradingEngine: TradingEngine) {
    this.tradingEngine = tradingEngine;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;

    if (!match || !match[1] || !match[2]) {
      await bot.sendMessage(
        chatId,
        "❌ Format salah!\n\nGunakan: `/buy [symbol] [quantity]`\nContoh: `/buy BTC 0.01`",
        { parse_mode: "Markdown" },
      );
      return;
    }

    const symbol = match[1].toUpperCase();
    const quantity = parseFloat(match[2]);

    if (isNaN(quantity) || quantity <= 0) {
      await bot.sendMessage(chatId, "❌ Quantity harus angka positif.");
      return;
    }

    await bot.sendMessage(chatId, `⏳ Memproses pembelian ${quantity} ${symbol}...`);

    try {
      const result = await this.tradingEngine.executeBuy(chatId, symbol, quantity);
      await bot.sendMessage(chatId, result.message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[BuyCommand] Error:", error);
      await bot.sendMessage(chatId, "❌ Gagal memproses pembelian. Silakan coba lagi.");
    }
  }
}

/**
 * Sell command for paper trading
 * Usage: /sell [symbol] [quantity]
 */
export class SellCommand implements Command {
  pattern = /^\/sell\s+(\w+)\s+([\d.]+)$/;
  private tradingEngine: TradingEngine;

  constructor(tradingEngine: TradingEngine) {
    this.tradingEngine = tradingEngine;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;

    if (!match || !match[1] || !match[2]) {
      await bot.sendMessage(
        chatId,
        "❌ Format salah!\n\nGunakan: `/sell [symbol] [quantity]`\nContoh: `/sell BTC 0.01`",
        { parse_mode: "Markdown" },
      );
      return;
    }

    const symbol = match[1].toUpperCase();
    const quantity = parseFloat(match[2]);

    if (isNaN(quantity) || quantity <= 0) {
      await bot.sendMessage(chatId, "❌ Quantity harus angka positif.");
      return;
    }

    await bot.sendMessage(chatId, `⏳ Memproses penjualan ${quantity} ${symbol}...`);

    try {
      const result = await this.tradingEngine.executeSell(chatId, symbol, quantity);
      await bot.sendMessage(chatId, result.message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[SellCommand] Error:", error);
      await bot.sendMessage(chatId, "❌ Gagal memproses penjualan. Silakan coba lagi.");
    }
  }
}

/**
 * View trade history
 */
export class HistoryCommand implements Command {
  pattern = /^\/history$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
      // Access trade history through the portfolio
      let message = "📜 *Trade History*\n\n";
      message += "_Gunakan /portfolio untuk melihat posisi saat ini._";

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[HistoryCommand] Error:", error);
      await bot.sendMessage(chatId, "❌ Gagal mengambil history. Silakan coba lagi.");
    }
  }
}
