/**
 * Chart Command
 * Generates and sends candlestick chart images
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler } from "./types.js";
import type { ChartService } from "../services/ChartService.js";
import { FinanceDataService } from "../services/FinanceDataService.js";
import { sessionManager } from "../utils/SessionManager.js";
import { safeEditMessage } from "../utils/uiHelper.js";
import { MESSAGES } from "../config/messages.js";

export class ChartCommand implements Command {
  pattern = /^\/chart(?:\s+(\w+)(?:\s+(\w+))?)?$/;
  private chartService: ChartService;

  constructor(chartService: ChartService) {
    this.chartService = chartService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const symbol = match?.[1]?.toUpperCase();
    const timeframe = match?.[2]?.toLowerCase() || "1h";

    // Validation - show help if no symbol
    if (!symbol) {
      await bot.sendMessage(chatId, MESSAGES.GUIDE_CHART, { parse_mode: "Markdown" });
      const promptMsg = await bot.sendMessage(chatId, MESSAGES.GUIDE_PROMPT_CHART);
      sessionManager.startChartWizard(chatId, promptMsg.message_id);
      return;
    }

    // Validate timeframe
    const validTimeframes = Object.keys(FinanceDataService.TIMEFRAMES);
    if (!validTimeframes.includes(timeframe)) {
      await bot.sendMessage(chatId, `× Timeframe tidak valid.\n\nGunakan: ${validTimeframes.join(", ")}`, {
        parse_mode: "Markdown",
      });
      return;
    }

    // Send loading message
    const loadingMsg = await bot.sendMessage(chatId, `⧗ Membuat grafik ${symbol} (${timeframe})...`);

    try {
      // Generate chart
      const chartBuffer = await this.chartService.generateChart(symbol, timeframe);

      // Delete loading message
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

      // Send chart image
      await bot.sendPhoto(chatId, chartBuffer, {
        caption: `*${symbol}* | ${timeframe.toUpperCase()}\n\n_Grafik candlestick dengan Bollinger Bands & RSI_`,
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error(`[ChartCommand] Error generating chart:`, error);

      // Edit loading message with error
      await safeEditMessage(
        bot,
        chatId,
        loadingMsg.message_id,
        `× Gagal membuat grafik untuk ${symbol}. Pastikan symbol valid.`,
      );
    }
  }
}

/**
 * Help command for chart
 */
export class ChartHelpCommand implements Command {
  pattern = /^\/chart$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId, MESSAGES.GUIDE_CHART, { parse_mode: "Markdown" });
  }
}

/**
 * Callback handler for chart inline button
 */
export class ChartCallbackHandler implements CallbackHandler {
  prefix = "chart:";
  private chartService: ChartService;

  constructor(chartService: ChartService) {
    this.chartService = chartService;
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    const symbol = data.replace("chart:", "");

    await bot.answerCallbackQuery(query.id, { text: `⧗ Membuat grafik ${symbol}...` });

    try {
      const chartBuffer = await this.chartService.generateChart(symbol, "1h");

      await bot.sendPhoto(chatId, chartBuffer, {
        caption: `*${symbol}* | 1H\n\n_Grafik candlestick dengan Bollinger Bands & RSI_`,
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error(`[ChartCallbackHandler] Error generating chart:`, error);
      await bot.sendMessage(chatId, `× Gagal membuat grafik untuk ${symbol}.`);
    }
  }
}
