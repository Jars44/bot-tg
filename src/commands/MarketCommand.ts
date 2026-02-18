/**
 * Market Command - Asset-Centric Dashboard Hub
 * UX Improvement: Centralized view for any asset with all trading actions in one place
 * Uses editMessageText for anti-spam navigation
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler } from "./types.js";
import type { TradingEngine } from "../services/TradingEngine.js";
import type { ChartService } from "../services/ChartService.js";
import type { SentimentAnalyzer } from "../services/SentimentAnalyzer.js";
import { sessionManager } from "../utils/SessionManager.js";
import { createMarketDashboard, safeEditMessage, formatUSD } from "../utils/uiHelper.js";

/**
 * Market Hub Command
 * Usage: /market [symbol] or /m [symbol]
 */
export class MarketCommand implements Command {
  pattern = /^\/(?:market|m)(?:\s+(\w+))?$/i;
  private tradingEngine: TradingEngine;

  constructor(tradingEngine: TradingEngine) {
    this.tradingEngine = tradingEngine;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const symbol = match?.[1]?.toUpperCase();

    if (!symbol) {
      // UX Improvement: Prompt for symbol input instead of showing error
      const sentMessage = await bot.sendMessage(
        chatId,
        "*Market Hub*\n\n" + "Masukkan simbol aset yang ingin dilihat:\n\n" + "_Contoh: BTC, ETH, XAUUSD, AAPL_",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "BTC", callback_data: "mkt_sym_BTC" },
                { text: "ETH", callback_data: "mkt_sym_ETH" },
                { text: "XAUUSD", callback_data: "mkt_sym_XAUUSD" },
              ],
              [{ text: "Batal", callback_data: "menu_back" }],
            ],
          },
        },
      );

      // Set session to wait for symbol input
      await sessionManager.setState(chatId, {
        flow: "market_hub",
        step: "symbol_input",
        data: { symbol: "", messageId: sentMessage.message_id },
      });
      return;
    }

    // Show dashboard directly
    await this.showDashboard(bot, chatId, symbol);
  }

  /**
   * Display the Market Hub dashboard for a symbol
   */
  async showDashboard(bot: TelegramBot, chatId: number, symbol: string, messageId?: number): Promise<void> {
    try {
      // Fetch current price data
      const priceData = await this.tradingEngine.getPrice(symbol);
      const price = priceData.price;
      const change24h = priceData.change24h ?? 0;
      // Calculate percent from price change
      const changePercent = price > 0 ? (change24h / (price - change24h)) * 100 : 0;

      const changeIndicator = change24h >= 0 ? "↑" : "↓";
      const changeSign = change24h >= 0 ? "+" : "";

      const dashboardText =
        `*Market Hub: ${symbol}*\n\n` +
        `Harga: ${formatUSD(price)}\n` +
        `${changeIndicator} 24h: ${changeSign}${formatUSD(change24h)} (${changeSign}${changePercent.toFixed(2)}%)\n\n` +
        `_Pilih aksi di bawah:_`;

      if (messageId) {
        // Edit existing message
        const success = await safeEditMessage(bot, chatId, messageId, dashboardText, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: createMarketDashboard(symbol) },
        });

        if (!success) {
          // Fallback: send new message if edit fails
          await bot.sendMessage(chatId, dashboardText, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: createMarketDashboard(symbol) },
          });
        }
      } else {
        // Send new message
        await bot.sendMessage(chatId, dashboardText, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: createMarketDashboard(symbol) },
        });
      }

      // Update session
      await sessionManager.clearState(chatId);
    } catch (error) {
      console.error("[MarketCommand] Error fetching price:", error);
      const errorMsg = `× Gagal mengambil data untuk ${symbol}.\nPastikan simbol valid.`;

      if (messageId) {
        await safeEditMessage(bot, chatId, messageId, errorMsg, {
          reply_markup: {
            inline_keyboard: [[{ text: "Kembali", callback_data: "menu_back" }]],
          },
        });
      } else {
        await bot.sendMessage(chatId, errorMsg, {
          reply_markup: {
            inline_keyboard: [[{ text: "Kembali", callback_data: "menu_back" }]],
          },
        });
      }
    }
  }
}

/**
 * Market Hub Callback Handler
 * Handles all mkt_* callbacks for dashboard navigation
 */
export class MarketCallbackHandler implements CallbackHandler {
  prefix = "mkt_";
  private marketCommand: MarketCommand;
  private tradingEngine: TradingEngine;
  private chartService: ChartService;
  private sentimentAnalyzer: SentimentAnalyzer;

  constructor(
    marketCommand: MarketCommand,
    tradingEngine: TradingEngine,
    chartService: ChartService,
    sentimentAnalyzer: SentimentAnalyzer,
  ) {
    this.marketCommand = marketCommand;
    this.tradingEngine = tradingEngine;
    this.chartService = chartService;
    this.sentimentAnalyzer = sentimentAnalyzer;
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    const action = data.replace("mkt_", "");

    // Handle symbol selection from quick buttons
    if (action.startsWith("sym_")) {
      const symbol = action.replace("sym_", "");
      await this.marketCommand.showDashboard(bot, chatId, symbol, messageId);
      await bot.answerCallbackQuery(query.id);
      return;
    }

    // Extract symbol from callback data (format: action_SYMBOL)
    const parts = action.split("_");
    const command = parts[0];
    const symbol = parts.slice(1).join("_").toUpperCase();

    switch (command) {
      case "chart": {
        // UX Improvement: Show chart inline with back button
        await safeEditMessage(bot, chatId, messageId, `⧗ Membuat grafik untuk ${symbol}...`);

        try {
          const chartBuffer = await this.chartService.generateChart(symbol, "1d");

          // Delete the loading message
          await bot.deleteMessage(chatId, messageId);

          // Send chart as photo
          await bot.sendPhoto(chatId, chartBuffer, {
            caption: `*${symbol} Grafik (1D)*\n_Klik tombol untuk kembali ke dashboard_`,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "Kembali ke Dashboard", callback_data: `mkt_back_${symbol}` }]],
            },
          });
        } catch (error) {
          console.error("[MarketCallback] Chart error:", error);
          await safeEditMessage(bot, chatId, messageId, `× Gagal membuat grafik untuk ${symbol}`, {
            reply_markup: {
              inline_keyboard: [[{ text: "Kembali ke Dashboard", callback_data: `mkt_back_${symbol}` }]],
            },
          });
        }
        break;
      }

      case "sent": {
        // UX Improvement: Show sentiment analysis
        await safeEditMessage(bot, chatId, messageId, `🧠 Analyzing sentiment for ${symbol}...`);

        try {
          const result = await this.sentimentAnalyzer.analyzeSentiment(symbol);
          const message = this.sentimentAnalyzer.formatSentimentResult(result);

          await safeEditMessage(bot, chatId, messageId, message + `\n\n_Klik untuk kembali_`, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "Kembali ke Dashboard", callback_data: `mkt_back_${symbol}` }]],
            },
          });
        } catch (error) {
          console.error("[MarketCallback] Sentiment error:", error);
          await safeEditMessage(bot, chatId, messageId, `× Gagal menganalisis sentimen untuk ${symbol}`, {
            reply_markup: {
              inline_keyboard: [[{ text: "Kembali ke Dashboard", callback_data: `mkt_back_${symbol}` }]],
            },
          });
        }
        break;
      }

      case "risk": {
        // UX Improvement: Quick access to risk calculator with symbol context
        await safeEditMessage(
          bot,
          chatId,
          messageId,
          `🧮 *Risk Calculator*\n\nSymbol: ${symbol}\n\n` +
            `Ketik: \`/risk [capital] [risk%] [sl_pips]\`\n` +
            `Contoh: \`/risk 10000 2 50\``,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🧮 Start Wizard", callback_data: "risk_start" }],
                [{ text: "Kembali ke Dashboard", callback_data: `mkt_back_${symbol}` }],
              ],
            },
          },
        );
        break;
      }

      case "alert": {
        // UX Improvement: Quick access to set alert
        try {
          const priceData = await this.tradingEngine.getPrice(symbol);

          await safeEditMessage(
            bot,
            chatId,
            messageId,
            `*Set Alert: ${symbol}*\n\n` +
              `Harga saat ini: ${formatUSD(priceData.price)}\n\n` +
              `Ketik: \`/alert ${symbol} [target] [kondisi]\`\n\n` +
              `Contoh:\n` +
              `\`/alert ${symbol} ${(priceData.price * 1.05).toFixed(2)} >\`\n` +
              `_(Alert jika naik 5%)_`,
            {
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [[{ text: "Kembali ke Dashboard", callback_data: `mkt_back_${symbol}` }]],
              },
            },
          );
        } catch {
          await safeEditMessage(bot, chatId, messageId, `× Gagal mengambil harga ${symbol}`, {
            reply_markup: {
              inline_keyboard: [[{ text: "Kembali", callback_data: `mkt_back_${symbol}` }]],
            },
          });
        }
        break;
      }

      case "buy": {
        // UX Improvement: Pre-filled buy instruction
        try {
          const priceData = await this.tradingEngine.getPrice(symbol);

          await safeEditMessage(
            bot,
            chatId,
            messageId,
            `*Beli ${symbol}*\n\n` +
              `Harga saat ini: ${formatUSD(priceData.price)}\n\n` +
              `Ketik: \`/buy ${symbol} [qty]\`\n\n` +
              `Contoh: \`/buy ${symbol} 0.01\``,
            {
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [[{ text: "Kembali ke Dashboard", callback_data: `mkt_back_${symbol}` }]],
              },
            },
          );
        } catch {
          await safeEditMessage(bot, chatId, messageId, `× Gagal mengambil harga ${symbol}`, {
            reply_markup: {
              inline_keyboard: [[{ text: "Kembali", callback_data: `mkt_back_${symbol}` }]],
            },
          });
        }
        break;
      }

      case "sell": {
        // UX Improvement: Pre-filled sell instruction
        try {
          const priceData = await this.tradingEngine.getPrice(symbol);

          await safeEditMessage(
            bot,
            chatId,
            messageId,
            `*Jual ${symbol}*\n\n` +
              `Harga saat ini: ${formatUSD(priceData.price)}\n\n` +
              `Ketik: \`/sell ${symbol} [qty]\`\n\n` +
              `Contoh: \`/sell ${symbol} 0.01\``,
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [[{ text: "Kembali ke Dashboard", callback_data: `mkt_back_${symbol}` }]],
              },
            },
          );
        } catch {
          await safeEditMessage(bot, chatId, messageId, `× Gagal mengambil harga ${symbol}`, {
            reply_markup: {
              inline_keyboard: [[{ text: "Kembali", callback_data: `mkt_back_${symbol}` }]],
            },
          });
        }
        break;
      }

      case "back": {
        // Return to dashboard for the symbol
        await this.marketCommand.showDashboard(bot, chatId, symbol, messageId);
        break;
      }
    }

    await bot.answerCallbackQuery(query.id);
  }
}
