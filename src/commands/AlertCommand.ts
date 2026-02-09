/**
 * Alert Command
 * Set price alerts for assets
 * Tone: Professional Hybrid
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { withLoading, formatUSD } from "../utils/uiHelper.js";
import type { TradingEngine } from "../services/TradingEngine.js";

interface Alert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: "above" | "below";
  createdAt: number;
}

// In-memory alert storage (Mock implementation for now)
const alerts: Alert[] = [];

export class AlertCommand implements Command {
  pattern = /^\/alert(?:\s+(\w+)(?:\s+([\d.]+))?(?:\s+(above|below|>|<))?)?$/;
  private tradingEngine: TradingEngine;

  constructor(tradingEngine: TradingEngine) {
    this.tradingEngine = tradingEngine;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;

    if (!match || !match[1] || !match[2]) {
      await bot.sendMessage(
        chatId,
        `🔔 *Price Alert*\n\n` +
          `Set notifikasi harga aset.\n` +
          `Format: \`/alert [Symbol] [Price]\`\n\n` +
          `Contoh:\n` +
          `\`/alert BTC 50000\`\n` +
          `\`/alert ETH 3000\``,
        { parse_mode: "Markdown" },
      );
      return;
    }

    const symbol = match[1].toUpperCase();
    const targetPrice = parseFloat(match[2]);
    let condition = match[3] as "above" | "below" | ">" | "<" | undefined;

    if (isNaN(targetPrice) || targetPrice <= 0) {
      await bot.sendMessage(chatId, "⚠️ Harga tidak valid.");
      return;
    }

    await withLoading(bot, chatId, async () => {
      try {
        const priceData = await this.tradingEngine.getPrice(symbol);
        const currentPrice = priceData.price;

        // Auto-detect condition if not specified
        if (!condition) {
          condition = targetPrice > currentPrice ? "above" : "below";
        } else {
          // Normalize condition
          if (condition === ">") condition = "above";
          if (condition === "<") condition = "below";
        }

        const newAlert: Alert = {
          id: Date.now().toString(),
          symbol,
          targetPrice,
          condition: condition as "above" | "below",
          createdAt: Date.now(),
        };

        alerts.push(newAlert);

        const conditionText = condition === "above" ? "melebihi" : "kurang dari";

        await bot.sendMessage(
          chatId,
          `✅ *Alert Disimpan*\n` +
            `---------------------------\n` +
            `Asset:  ${symbol}\n` +
            `Target: ${formatUSD(targetPrice)}\n` +
            `Current:${formatUSD(currentPrice)}\n` +
            `Trigger: Saat harga ${conditionText} target.`,
          { parse_mode: "Markdown" },
        );
      } catch (error) {
        console.error("[AlertCommand] Error:", error);
        await bot.sendMessage(chatId, "⚠️ Gagal mengambil harga pasar.");
      }
    });
  }
}

/**
 * Alert Help Command
 */
export class AlertHelpCommand implements Command {
  pattern = /^\/alert$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    await bot.sendMessage(
      chatId,
      `🔔 *Price Alert*\n\n` +
        `Set notifikasi harga aset.\n` +
        `Format: \`/alert [Symbol] [Price]\`\n\n` +
        `Contoh:\n` +
        `\`/alert BTC 50000\`\n` +
        `\`/alert ETH 3000\``,
      { parse_mode: "Markdown" },
    );
  }
}

/**
 * View My Alerts
 */
export class MyAlertsCommand implements Command {
  pattern = /^\/myalerts$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (alerts.length === 0) {
      await bot.sendMessage(chatId, "ℹ️ Belum ada alert aktif.");
      return;
    }

    let message = "🔔 *Alert Aktif*\n---------------------------\n";

    alerts.forEach((alert, index) => {
      const condition = alert.condition === "above" ? ">" : "<";
      message += `${index + 1}. ${alert.symbol} ${condition} ${formatUSD(alert.targetPrice)}\n`;
    });

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }
}
