/**
 * Paper Trading Commands with Confirmation
 * Buy, Sell, and Portfolio commands for virtual trading
 * Enhanced with confirmation dialogs for safety
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler } from "./types.js";
import type { TradingEngine } from "../services/TradingEngine.js";
import { sessionManager, type TradeSessionData } from "../utils/SessionManager.js";
import { createConfirmButtons, formatUSD, withLoading, safeEditMessage } from "../utils/uiHelper.js";
import { MESSAGES } from "../config/messages.js";

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
        await bot.sendMessage(chatId, "× Gagal mengambil data portfolio. Silakan coba lagi.");
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
        `*Order: BUY*\n\n` +
          `Format: \`/buy [Symbol] [Qty]\`\n\n` +
          `Contoh:\n` +
          `\`/buy BTC 0.01\`\n` +
          `\`/buy ETH 0.5\`\n` +
          `\`/buy AAPL 10\``,
        { parse_mode: "Markdown" },
      );
      const promptMsg = await bot.sendMessage(chatId, MESSAGES.GUIDE_PROMPT_BUY);
      sessionManager.startBuyWizard(chatId, promptMsg.message_id);
      return;
    }

    const symbol = match[1].toUpperCase();
    const quantity = parseFloat(match[2]);

    if (isNaN(quantity) || quantity <= 0) {
      await bot.sendMessage(chatId, "⚠︎ Quantity harus angka positif.");
      return;
    }

    // Fetch current price for confirmation
    await withLoading(bot, chatId, async () => {
      try {
        const priceData = await this.tradingEngine.getPrice(symbol);
        const price = priceData.price;
        const total = price * quantity;

        // Show confirmation dialog (Receipt Style)
        const confirmMessage =
          `*KONFIRMASI ORDER*\n\n` +
          `\`\`\`\n` +
          `Type:   BUY\n` +
          `Symbol: ${symbol}\n` +
          `Qty:    ${quantity}\n` +
          `Price:  ${formatUSD(price)}\n` +
          `Total:  ${formatUSD(total)}\n` +
          `\`\`\`\n\n` +
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
        await bot.sendMessage(chatId, "× Gagal mengambil harga pasar.");
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
        `*Order: SELL*\n\n` +
          `Format: \`/sell [Symbol] [Qty]\`\n\n` +
          `Contoh:\n` +
          `\`/sell BTC 0.01\`\n` +
          `\`/sell ETH 0.5\``,
        { parse_mode: "Markdown" },
      );
      const promptMsg = await bot.sendMessage(chatId, MESSAGES.GUIDE_PROMPT_SELL);
      sessionManager.startSellWizard(chatId, promptMsg.message_id);
      return;
    }

    const symbol = match[1].toUpperCase();
    const quantity = parseFloat(match[2]);

    if (isNaN(quantity) || quantity <= 0) {
      await bot.sendMessage(chatId, "⚠︎ Quantity harus angka positif.");
      return;
    }

    // Fetch current price for confirmation
    await withLoading(bot, chatId, async () => {
      try {
        const priceData = await this.tradingEngine.getPrice(symbol);
        const price = priceData.price;
        const total = price * quantity;

        // Show confirmation dialog (Receipt Style)
        const confirmMessage =
          `*KONFIRMASI ORDER*\n\n` +
          `\`\`\`\n` +
          `Type:   SELL\n` +
          `Symbol: ${symbol}\n` +
          `Qty:    ${quantity}\n` +
          `Price:  ${formatUSD(price)}\n` +
          `Total:  ${formatUSD(total)}\n` +
          `\`\`\`\n\n` +
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
        await bot.sendMessage(chatId, "× Gagal mengambil harga pasar.");
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
        `*Close Position*\n\n` +
          `Menutup posisi aset secara instan.\n` +
          `Format: \`/close [Symbol]\`\n\n` +
          `Contoh:\n` +
          `\`/close BTC\` — Jual semua Bitcoin\n` +
          `\`/close ALL\` — Jual semua aset`,
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
            await bot.sendMessage(chatId, "Tidak ada posisi terbuka.");
            return;
          }

          const totalValue = activePositions.reduce((sum, p) => sum + p.marketValue, 0);

          // Show confirmation dialog for closing ALL
          const confirmMessage =
            `⚠︎ *KONFIRMASI: CLOSE ALL*\n\n` +
            `\`\`\`\n` +
            `Action:     LIQUIDATE ALL\n` +
            `Posisi:     ${activePositions.length}\n` +
            `Est. Value: ${formatUSD(totalValue)}\n` +
            `\`\`\`\n\n` +
            `Tindakan ini akan menjual semua aset pada harga pasar.`;

          const sentMessage = await bot.sendMessage(chatId, confirmMessage, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "Konfirmasi", callback_data: "tconf_closeall_yes" },
                  { text: "Batal", callback_data: "tconf_closeall_no" },
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
          await bot.sendMessage(chatId, "× Gagal memproses permintaan.");
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
          await bot.sendMessage(chatId, `× Tidak ada posisi ${symbol} terbuka.`);
          return;
        }

        const quantity = position.quantity;
        const priceData = await this.tradingEngine.getPrice(symbol);
        const price = priceData.price;
        const total = price * quantity;

        // Show confirmation dialog
        const confirmMessage =
          `⚠︎ *KONFIRMASI: CLOSE POSISI*\n\n` +
          `\`\`\`\n` +
          `Action:     CLOSE ${symbol}\n` +
          `Qty:        ${quantity}\n` +
          `Price:      ${formatUSD(price)}\n` +
          `Est. Total: ${formatUSD(total)}\n` +
          `\`\`\``;

        const sentMessage = await bot.sendMessage(chatId, confirmMessage, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Konfirmasi", callback_data: "tconf_sell_yes" },
                { text: "Batal", callback_data: "tconf_sell_no" },
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
        await bot.sendMessage(chatId, "× Gagal memproses permintaan.");
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
      await bot.answerCallbackQuery(query.id, { text: "Order kadaluarsa." });
      await bot.deleteMessage(chatId, messageId);
      return;
    }

    const tradeData = state.data as TradeSessionData;
    const [action, decision] = data.replace("tconf_", "").split("_");

    if (decision === "no") {
      // Cancel trade
      sessionManager.clearState(chatId);
      await safeEditMessage(bot, chatId, messageId, "× Transaksi dibatalkan.");
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

          await safeEditMessage(bot, chatId, messageId, result.message, {
            parse_mode: "Markdown",
          });

          await bot.answerCallbackQuery(query.id, { text: result.success ? "✓ Berhasil" : "× Gagal" });
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

        await safeEditMessage(bot, chatId, messageId, result.message, {
          parse_mode: "Markdown",
        });

        await bot.answerCallbackQuery(query.id, { text: "✓ Order Tereksekusi" });

        // For BUY orders, offer TP/SL protection
        if (action === "buy" && result.success && result.position) {
          const protectionMessage =
            `*Take Profit / Stop Loss*\n\n` +
            `Entry: $${tradeData.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n` +
            `Lindungi posisi anda dengan TP/SL.`;

          await bot.sendMessage(chatId, protectionMessage, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Set TP/SL",
                    callback_data: `tpsl:set:${result.position.id}:${tradeData.symbol}:${tradeData.price}`,
                  },
                  { text: "Lihat Chart", callback_data: `chart:${tradeData.symbol}` },
                ],
                [{ text: "Lewati", callback_data: "tpsl:skip" }],
              ],
            },
          });
        }
      } catch (error) {
        console.error("[TradeConfirmHandler] Error:", error);
        sessionManager.clearState(chatId);
        await safeEditMessage(bot, chatId, messageId, "× Gagal memproses order.");
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
      let message = "*Riwayat Trading*\n\n";
      message += "_Gunakan /portfolio untuk melihat posisi aktif._";

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[HistoryCommand] Error:", error);
      await bot.sendMessage(chatId, "× Gagal mengambil riwayat.");
    }
  }
}
