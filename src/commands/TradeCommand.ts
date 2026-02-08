/**
 * Paper Trading Commands with Confirmation
 * Buy, Sell, and Portfolio commands for virtual trading
 * Enhanced with confirmation dialogs for safety
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler } from "./types.js";
import type { TradingEngine } from "../services/TradingEngine.js";
import { sessionManager, type TradeSessionData } from "../utils/SessionManager.js";
import { createConfirmButtons, formatUSD, withLoading } from "../utils/uiHelper.js";

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

    await withLoading(bot, chatId, async () => {
      try {
        const summary = await this.tradingEngine.getPortfolioSummary(chatId);
        const message = this.tradingEngine.formatPortfolioSummary(summary);

        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error("[PortfolioCommand] Error:", error);
        await bot.sendMessage(chatId, "❌ Gagal mengambil data portfolio. Silakan coba lagi.");
      }
    });
  }
}

/**
 * Buy command for paper trading with confirmation
 * Usage: /buy [symbol] [quantity]
 */
export class BuyCommand implements Command {
  pattern = /^\/buy(?:\s+(\w+)(?:\s+([\d.]+))?)?$/;
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

    // Fetch current price for confirmation
    await withLoading(bot, chatId, async () => {
      try {
        const priceData = await this.tradingEngine.getPrice(symbol);
        const price = priceData.price;
        const total = price * quantity;

        // Show confirmation dialog
        const confirmMessage =
          `⚠️ *KONFIRMASI ORDER*\n\n` +
          `📊 *Pair:* ${symbol}\n` +
          `📈 *Aksi:* BUY\n` +
          `📦 *Qty:* ${quantity}\n` +
          `💵 *Harga:* ${formatUSD(price)}\n` +
          `💰 *Total:* ${formatUSD(total)}\n\n` +
          `Lanjutkan transaksi?`;

        const sentMessage = await bot.sendMessage(chatId, confirmMessage, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: createConfirmButtons("tconf_buy_yes", "tconf_buy_no"),
          },
        });

        // Store pending trade in session
        sessionManager.startTradeConfirmation(chatId, {
          action: "buy",
          symbol,
          quantity,
          price,
          messageId: sentMessage.message_id,
        });
      } catch (error) {
        console.error("[BuyCommand] Error fetching price:", error);
        await bot.sendMessage(chatId, "❌ Gagal mengambil harga. Silakan coba lagi.");
      }
    });
  }
}

/**
 * Sell command for paper trading with confirmation
 * Usage: /sell [symbol] [quantity]
 */
export class SellCommand implements Command {
  pattern = /^\/sell(?:\s+(\w+)(?:\s+([\d.]+))?)?$/;
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

    // Fetch current price for confirmation
    await withLoading(bot, chatId, async () => {
      try {
        const priceData = await this.tradingEngine.getPrice(symbol);
        const price = priceData.price;
        const total = price * quantity;

        // Show confirmation dialog
        const confirmMessage =
          `⚠️ *KONFIRMASI ORDER*\n\n` +
          `📊 *Pair:* ${symbol}\n` +
          `📉 *Aksi:* SELL\n` +
          `📦 *Qty:* ${quantity}\n` +
          `💵 *Harga:* ${formatUSD(price)}\n` +
          `💰 *Total:* ${formatUSD(total)}\n\n` +
          `Lanjutkan transaksi?`;

        const sentMessage = await bot.sendMessage(chatId, confirmMessage, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: createConfirmButtons("tconf_sell_yes", "tconf_sell_no"),
          },
        });

        // Store pending trade in session
        sessionManager.startTradeConfirmation(chatId, {
          action: "sell",
          symbol,
          quantity,
          price,
          messageId: sentMessage.message_id,
        });
      } catch (error) {
        console.error("[SellCommand] Error fetching price:", error);
        await bot.sendMessage(chatId, "❌ Gagal mengambil harga. Silakan coba lagi.");
      }
    });
  }
}

/**
 * Trade confirmation callback handler
 */
export class TradeConfirmHandler implements CallbackHandler {
  prefix = "tconf_";
  private tradingEngine: TradingEngine;

  constructor(tradingEngine: TradingEngine) {
    this.tradingEngine = tradingEngine;
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    const state = sessionManager.getState(chatId);
    if (!state || state.flow !== "trade") {
      await bot.answerCallbackQuery(query.id, { text: "Order kadaluarsa. Silakan ulangi." });
      await bot.deleteMessage(chatId, messageId);
      return;
    }

    const tradeData = state.data as TradeSessionData;
    const [action, decision] = data.replace("tconf_", "").split("_");

    if (decision === "no") {
      // Cancel trade
      sessionManager.clearState(chatId);
      await bot.editMessageText("❌ Order dibatalkan.", {
        chat_id: chatId,
        message_id: messageId,
      });
      await bot.answerCallbackQuery(query.id, { text: "Dibatalkan" });
      return;
    }

    // Execute trade
    await withLoading(bot, chatId, async () => {
      try {
        let result;
        if (action === "buy") {
          result = await this.tradingEngine.executeBuy(chatId, tradeData.symbol, tradeData.quantity);
        } else {
          result = await this.tradingEngine.executeSell(chatId, tradeData.symbol, tradeData.quantity);
        }

        // Clear session
        sessionManager.clearState(chatId);

        await bot.editMessageText(result.message, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
        });

        await bot.answerCallbackQuery(query.id, { text: "✅ Order berhasil!" });
      } catch (error) {
        console.error("[TradeConfirmHandler] Error:", error);
        sessionManager.clearState(chatId);
        await bot.editMessageText("❌ Gagal memproses order. Silakan coba lagi.", {
          chat_id: chatId,
          message_id: messageId,
        });
        await bot.answerCallbackQuery(query.id, { text: "Gagal" });
      }
    });
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
      let message = "📜 *Trade History*\n\n";
      message += "_Gunakan /portfolio untuk melihat posisi saat ini._";

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[HistoryCommand] Error:", error);
      await bot.sendMessage(chatId, "❌ Gagal mengambil history. Silakan coba lagi.");
    }
  }
}
