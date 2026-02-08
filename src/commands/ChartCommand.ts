/**
 * Chart Command
 * Generates and sends candlestick chart images
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler } from "./types.js";
import type { ChartService } from "../services/ChartService.js";
import { FinanceDataService } from "../services/FinanceDataService.js";

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
      const helpMessage =
        `📊 *Technical Chart*\n\n` +
        `Gunakan: \`/chart [symbol] [timeframe]\`\n\n` +
        `*Contoh:*\n` +
        `\`/chart BTC 1h\` - Bitcoin 1 jam\n` +
        `\`/chart ETH 4h\` - Ethereum 4 jam\n` +
        `\`/chart XAUUSD 1d\` - Gold harian\n\n` +
        `*Timeframes:*\n` +
        `• \`1m\` - 1 menit\n` +
        `• \`5m\` - 5 menit\n` +
        `• \`15m\` - 15 menit\n` +
        `• \`1h\` - 1 jam\n` +
        `• \`4h\` - 4 jam\n` +
        `• \`1d\` - 1 hari`;

      await bot.sendMessage(chatId, helpMessage, { parse_mode: "Markdown" });
      return;
    }

    // Validate timeframe
    const validTimeframes = Object.keys(FinanceDataService.TIMEFRAMES);
    if (!validTimeframes.includes(timeframe)) {
      await bot.sendMessage(chatId, `❌ Timeframe tidak valid.\n\nGunakan: ${validTimeframes.join(", ")}`, {
        parse_mode: "Markdown",
      });
      return;
    }

    // Send loading message
    const loadingMsg = await bot.sendMessage(chatId, `📊 Generating chart for ${symbol} (${timeframe})...`);

    try {
      // Generate chart
      const chartBuffer = await this.chartService.generateChart(symbol, timeframe);

      // Delete loading message
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

      // Send chart image
      await bot.sendPhoto(chatId, chartBuffer, {
        caption: `📊 *${symbol}* | ${timeframe.toUpperCase()}\n\n_Candlestick chart with SMA(20)_`,
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error(`[ChartCommand] Error generating chart:`, error);

      // Edit loading message with error
      await bot.editMessageText(`❌ Gagal membuat chart untuk ${symbol}. Pastikan symbol valid.`, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
      });
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

    const helpMessage =
      `📊 *Technical Chart*\n\n` +
      `Gunakan: \`/chart [symbol] [timeframe]\`\n\n` +
      `*Contoh:*\n` +
      `\`/chart BTC 1h\` - Bitcoin 1 jam\n` +
      `\`/chart ETH 4h\` - Ethereum 4 jam\n` +
      `\`/chart XAUUSD 1d\` - Gold harian\n\n` +
      `*Timeframes:*\n` +
      `• \`1m\` - 1 menit\n` +
      `• \`5m\` - 5 menit\n` +
      `• \`15m\` - 15 menit\n` +
      `• \`1h\` - 1 jam\n` +
      `• \`4h\` - 4 jam\n` +
      `• \`1d\` - 1 hari`;

    await bot.sendMessage(chatId, helpMessage, { parse_mode: "Markdown" });
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

    await bot.answerCallbackQuery(query.id, { text: `📊 Generating ${symbol} chart...` });

    try {
      const chartBuffer = await this.chartService.generateChart(symbol, "1h");

      await bot.sendPhoto(chatId, chartBuffer, {
        caption: `📊 *${symbol}* | 1H\n\n_Candlestick chart with SMA(20)_`,
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error(`[ChartCallbackHandler] Error generating chart:`, error);
      await bot.sendMessage(chatId, `❌ Failed to generate chart for ${symbol}.`);
    }
  }
}
