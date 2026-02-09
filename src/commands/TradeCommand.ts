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
        `🛒 *Beli Aset (Paper Trading)*\n\n` +
          `Melakukan simulasi pembelian aset crypto, saham, atau forex.\n\n` +
          `*Gunakan:* \`/buy [symbol] [quantity]\`\n\n` +
          `*Contoh:*\n` +
          `\`/buy BTC 0.01\` - Beli 0.01 Bitcoin\n` +
          `\`/buy ETH 0.5\` - Beli 0.5 Ethereum\n` +
          `\`/buy AAPL 10\` - Beli 10 saham Apple\n\n` +
          `_Gunakan /portfolio untuk melihat aset yang dimiliki._`,
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
        `💰 *Jual Aset (Paper Trading)*\n\n` +
          `Melakukan simulasi penjualan aset untuk mengambil profit.\n\n` +
          `*Gunakan:* \`/sell [symbol] [quantity]\`\n\n` +
          `*Contoh:*\n` +
          `\`/sell BTC 0.01\` - Jual 0.01 Bitcoin\n` +
          `\`/sell ETH 0.5\` - Jual 0.5 Ethereum\n` +
          `\`/sell AAPL 10\` - Jual 10 saham Apple\n\n` +
          `_Gunakan /portfolio untuk melihat aset yang dimiliki._`,
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
 * Close command for liquidating entire position
 * Usage: /close [symbol]
 */
export class CloseCommand implements Command {
  pattern = /^\/close(?:\s+(\w+))?$/;
  private tradingEngine: TradingEngine;

  constructor(tradingEngine: TradingEngine) {
    this.tradingEngine = tradingEngine;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;

    if (!match || !match[1]) {
      await bot.sendMessage(
        chatId,
        `⚠️ *Close Position*\n\n` +
          `Menutup seluruh posisi aset yang dimiliki secara instan.\n\n` +
          `*Gunakan:* \`/close [symbol]\`\n\n` +
          `*Contoh:*\n` +
          `\`/close BTC\` - Jual SEMUA Bitcoin\n` +
          `\`/close ETH\` - Jual SEMUA Ethereum\n\n` +
          `_Gunakan /portfolio untuk melihat aset yang dimiliki._`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    const symbolInput = match[1].toUpperCase();

    // Check if closing ALL positions
    if (symbolInput === "ALL") {
      await withLoading(bot, chatId, async () => {
        try {
          const summary = await this.tradingEngine.getPortfolioSummary(chatId);
          const activePositions = summary.positions.filter((p) => p.quantity > 0);

          if (activePositions.length === 0) {
            await bot.sendMessage(chatId, "ℹ️ Tidak ada posisi terbuka untuk ditutup.");
            return;
          }

          const totalValue = activePositions.reduce((sum, p) => sum + p.marketValue, 0);

          // Show confirmation dialog for closing ALL
          const confirmMessage =
            `⚠️ *KONFIRMASI CLOSE ALL*\n\n` +
            `📉 *Aksi:* CLOSE SEMUA POSISI\n` +
            `📦 *Jumlah Posisi:* ${activePositions.length}\n` +
            `💰 *Estimasi Total Nilai:* ${formatUSD(totalValue)}\n\n` +
            `Tindakan ini akan menjual SEMUA aset anda pada harga pasar saat ini.\n` +
            `Lanjutkan?`;

          const sentMessage = await bot.sendMessage(chatId, confirmMessage, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "✅ CONFIRM CLOSE ALL", callback_data: "tconf_closeall_yes" },
                  { text: "❌ CANCEL", callback_data: "tconf_closeall_no" },
                ],
              ],
            },
          });

          // Store pending trade in session with special symbol "ALL"
          sessionManager.startTradeConfirmation(chatId, {
            action: "sell",
            symbol: "ALL",
            quantity: 0, // Not used for close all
            price: 0, // Not used for close all
            messageId: sentMessage.message_id,
          });
        } catch (error) {
          console.error("[CloseCommand] Error fetching portfolio:", error);
          await bot.sendMessage(chatId, "❌ Gagal memproses permintaan. Silakan coba lagi.");
        }
      });
      return;
    }

    const symbol = symbolInput;

    // Fetch current position and price for confirmation
    await withLoading(bot, chatId, async () => {
      try {
        // Get portfolio to find position quantity
        const summary = await this.tradingEngine.getPortfolioSummary(chatId);
        const position = summary.positions.find((p) => p.symbol === symbol);

        if (!position || position.quantity <= 0) {
          await bot.sendMessage(chatId, `❌ Anda tidak memiliki posisi ${symbol} untuk ditutup.`);
          return;
        }

        const quantity = position.quantity;
        const priceData = await this.tradingEngine.getPrice(symbol);
        const price = priceData.price;
        const total = price * quantity;

        // Show confirmation dialog
        const confirmMessage =
          `⚠️ *KONFIRMASI CLOSE POSITION*\n\n` +
          `📊 *Pair:* ${symbol}\n` +
          `📉 *Aksi:* CLOSE ALL\n` +
          `📦 *Qty:* ${quantity}\n` +
          `💵 *Harga:* ${formatUSD(price)}\n` +
          `💰 *Total Estimated:* ${formatUSD(total)}\n\n` +
          `Lanjutkan tutup posisi ini?`;

        const sentMessage = await bot.sendMessage(chatId, confirmMessage, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ CONFIRM CLOSE", callback_data: "tconf_sell_yes" },
                { text: "❌ CANCEL", callback_data: "tconf_sell_no" },
              ],
            ],
          },
        });

        // Store pending trade in session (using "sell" action as close is a sell)
        sessionManager.startTradeConfirmation(chatId, {
          action: "sell",
          symbol,
          quantity,
          price,
          messageId: sentMessage.message_id,
        });
      } catch (error) {
        console.error("[CloseCommand] Error fetching position/price:", error);
        await bot.sendMessage(chatId, "❌ Gagal memproses permintaan. Silakan coba lagi.");
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
        // Handle CLOSE ALL
        if (action === "closeall") {
          const result = await this.tradingEngine.closeAllPositions(chatId);

          sessionManager.clearState(chatId);

          await bot.editMessageText(result.message, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
          });

          await bot.answerCallbackQuery(query.id, { text: result.success ? "✅ Closed All" : "❌ Failed" });
          return;
        }

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

        // For BUY orders, offer TP/SL protection
        if (action === "buy" && result.success && result.position) {
          const protectionMessage =
            `🛡️ *Set Protection?*\n\n` +
            `Entry: $${tradeData.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n` +
            `Protect your position with Take Profit / Stop Loss.`;

          await bot.sendMessage(chatId, protectionMessage, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🛡️ Set TP/SL",
                    callback_data: `tpsl:set:${result.position.id}:${tradeData.symbol}:${tradeData.price}`,
                  },
                  { text: "📊 See Chart", callback_data: `chart:${tradeData.symbol}` },
                ],
                [{ text: "⏩ Skip", callback_data: "tpsl:skip" }],
              ],
            },
          });
        }
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
