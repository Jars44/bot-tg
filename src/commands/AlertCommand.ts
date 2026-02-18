import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { withLoading, formatUSD } from "../utils/uiHelper.js";
import { sessionManager } from "../utils/SessionManager.js";
import { MESSAGES } from "../config/messages.js";
import { S } from "../config/symbols.js";
import type { TradingEngine } from "../services/TradingEngine.js";

interface Alert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: "above" | "below";
  createdAt: number;
}

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
      await bot.sendMessage(chatId, MESSAGES.GUIDE_ALERT, { parse_mode: "Markdown" });
      const promptMsg = await bot.sendMessage(chatId, MESSAGES.GUIDE_PROMPT_ALERT);
      sessionManager.startAlertWizard(chatId, promptMsg.message_id);
      return;
    }

    const symbol = match[1].toUpperCase();
    const targetPrice = parseFloat(match[2]);
    let condition = match[3] as "above" | "below" | ">" | "<" | undefined;

    if (isNaN(targetPrice) || targetPrice <= 0) {
      await bot.sendMessage(chatId, MESSAGES.ALERT_INVALID_PRICE);
      return;
    }

    await withLoading(bot, chatId, async () => {
      try {
        const priceData = await this.tradingEngine.getPrice(symbol);
        const currentPrice = priceData.price;

        if (!condition) {
          condition = targetPrice > currentPrice ? "above" : "below";
        } else {
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
          `${S.SUCCESS} *Alert Disimpan*\n\n` +
            `Asset:   ${symbol}\n` +
            `Target:  ${formatUSD(targetPrice)}\n` +
            `Current: ${formatUSD(currentPrice)}\n\n` +
            `Trigger: Saat harga ${conditionText} target.`,
          { parse_mode: "Markdown" },
        );
      } catch (error) {
        console.error("[AlertCommand] Error:", error);
        await bot.sendMessage(chatId, MESSAGES.ALERT_FETCH_ERROR);
      }
    });
  }
}

export class MyAlertsCommand implements Command {
  pattern = /^\/myalerts$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (alerts.length === 0) {
      await bot.sendMessage(chatId, MESSAGES.ALERT_NONE);
      return;
    }

    let message = "*Alert Aktif*\n\n";

    alerts.forEach((alert, index) => {
      const condition = alert.condition === "above" ? ">" : "<";
      message += `${index + 1}. ${alert.symbol} ${condition} ${formatUSD(alert.targetPrice)}\n`;
    });

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }
}
