/**
 * Alert Scheduler Service
 * Cron-based monitoring for price alerts, whale trades, and arbitrage opportunities
 */

import TelegramBot from "node-telegram-bot-api";
import cron from "node-cron";
import type { JsonDb } from "../database/JsonDb.js";
import type { FinanceDataService } from "./FinanceDataService.js";
import type { EconomicCalendarService } from "./EconomicCalendarService.js";
import { CONFIG } from "../config/index.js";

export class AlertScheduler {
  private db: JsonDb;
  private financeService: FinanceDataService;
  private economicCalendarService: EconomicCalendarService;
  private bot: TelegramBot | null = null;
  private priceAlertJob: cron.ScheduledTask | null = null;
  private whaleJob: cron.ScheduledTask | null = null;
  private arbitrageJob: cron.ScheduledTask | null = null;
  private calendarJob: cron.ScheduledTask | null = null;
  private positionMonitorJob: cron.ScheduledTask | null = null;
  private subscribedChats: Set<number> = new Set();

  constructor(db: JsonDb, financeService: FinanceDataService, economicCalendarService: EconomicCalendarService) {
    this.db = db;
    this.financeService = financeService;
    this.economicCalendarService = economicCalendarService;
  }

  /**
   * Start all monitoring jobs
   */
  startAll(bot: TelegramBot): void {
    this.bot = bot;

    this.startPriceAlertMonitor();
    this.startWhaleMonitor();
    this.startArbitrageMonitor();
    this.startEconomicCalendarNotifier();
    this.startPositionMonitor();

    console.log("[AlertScheduler] All monitoring jobs started");
  }

  /**
   * Subscribe a chat to economic calendar notifications
   */
  subscribeToCalendar(chatId: number): void {
    this.subscribedChats.add(chatId);
  }

  /**
   * Unsubscribe a chat from economic calendar notifications
   */
  unsubscribeFromCalendar(chatId: number): void {
    this.subscribedChats.delete(chatId);
  }

  /**
   * Price alert monitor - runs every minute
   */
  private startPriceAlertMonitor(): void {
    this.priceAlertJob = cron.schedule("* * * * *", async () => {
      await this.checkPriceAlerts();
    });

    console.log("[AlertScheduler] Price alert monitor started");
  }

  /**
   * Check all pending price alerts
   */
  private async checkPriceAlerts(): Promise<void> {
    if (!this.bot) return;

    try {
      const pendingAlerts = await this.db.getPendingAlerts();

      if (pendingAlerts.length === 0) return;

      // Group alerts by symbol for efficient price fetching
      const symbolAlerts = new Map<string, typeof pendingAlerts>();
      for (const alert of pendingAlerts) {
        const existing = symbolAlerts.get(alert.symbol) || [];
        existing.push(alert);
        symbolAlerts.set(alert.symbol, existing);
      }

      // Check each symbol
      for (const [symbol, alerts] of symbolAlerts) {
        try {
          const priceData = await this.financeService.getPrice(symbol);
          const currentPrice = priceData.price;

          for (const alert of alerts) {
            let triggered = false;

            switch (alert.condition) {
              case ">":
                triggered = currentPrice > alert.targetPrice;
                break;
              case "<":
                triggered = currentPrice < alert.targetPrice;
                break;
              case ">=":
                triggered = currentPrice >= alert.targetPrice;
                break;
              case "<=":
                triggered = currentPrice <= alert.targetPrice;
                break;
            }

            if (triggered) {
              await this.sendAlertNotification(alert.chatId, symbol, currentPrice, alert);
              await this.db.triggerAlert(alert.id);
            }
          }
        } catch (error) {
          console.error(`[AlertScheduler] Error checking price for ${symbol}:`, error);
        }
      }
    } catch (error) {
      console.error("[AlertScheduler] Error in price alert check:", error);
    }
  }

  /**
   * Send price alert notification
   */
  private async sendAlertNotification(
    chatId: number,
    symbol: string,
    currentPrice: number,
    alert: { targetPrice: number; condition: string },
  ): Promise<void> {
    if (!this.bot) return;

    const message =
      `🔔 *Price Alert Triggered!*\n\n` +
      `📊 ${symbol}\n` +
      `💰 Current Price: $${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n` +
      `🎯 Target: ${alert.condition} $${alert.targetPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

    try {
      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error(`[AlertScheduler] Failed to send alert to ${chatId}:`, error);
    }
  }

  /**
   * Whale monitor - runs every minute
   */
  private startWhaleMonitor(): void {
    this.whaleJob = cron.schedule("* * * * *", async () => {
      await this.checkWhaleTrades();
    });

    console.log("[AlertScheduler] Whale monitor started");
  }

  /**
   * Check for whale trades on major crypto pairs
   */
  private async checkWhaleTrades(): Promise<void> {
    if (!this.bot) return;

    const watchList = ["BTC", "ETH"];

    for (const symbol of watchList) {
      try {
        const largeTrades = await this.financeService.getRecentLargeTrades(symbol, CONFIG.ALERTS.WHALE_THRESHOLD_USD);

        for (const trade of largeTrades) {
          // Only notify for trades in the last minute
          if (Date.now() - trade.timestamp > 60000) continue;

          await this.broadcastWhaleAlert(symbol, trade);
        }
      } catch (error) {
        console.error(`[AlertScheduler] Error checking whale trades for ${symbol}:`, error);
      }
    }
  }

  /**
   * Broadcast whale alert to subscribed users
   */
  private async broadcastWhaleAlert(
    symbol: string,
    trade: { price: number; amount: number; valueUSD: number },
  ): Promise<void> {
    if (!this.bot) return;

    const message =
      `🐋 *Whale Alert!*\n\n` +
      `📊 ${symbol}/USDT\n` +
      `💰 Value: $${trade.valueUSD.toLocaleString("en-US", { minimumFractionDigits: 0 })}\n` +
      `📦 Amount: ${trade.amount.toFixed(4)} ${symbol}\n` +
      `💵 Price: $${trade.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

    // Broadcast to subscribed chats
    for (const chatId of this.subscribedChats) {
      try {
        await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error(`[AlertScheduler] Failed to send whale alert to ${chatId}:`, error);
      }
    }
  }

  /**
   * Arbitrage monitor - runs every 5 minutes
   */
  private startArbitrageMonitor(): void {
    this.arbitrageJob = cron.schedule("*/5 * * * *", async () => {
      await this.checkArbitrageOpportunities();
    });

    console.log("[AlertScheduler] Arbitrage monitor started");
  }

  /**
   * Check for arbitrage opportunities
   */
  private async checkArbitrageOpportunities(): Promise<void> {
    if (!this.bot) return;

    const watchSymbols = ["BTC", "ETH"];

    for (const symbol of watchSymbols) {
      try {
        const result = await this.financeService.checkArbitrage(symbol, CONFIG.ALERTS.ARBITRAGE_THRESHOLD_PCT);

        if (result.hasOpportunity) {
          await this.broadcastArbitrageAlert(symbol, result.spreadPercent, result.exchanges);
        }
      } catch (error) {
        console.error(`[AlertScheduler] Error checking arbitrage for ${symbol}:`, error);
      }
    }
  }

  /**
   * Broadcast arbitrage opportunity alert
   */
  private async broadcastArbitrageAlert(
    symbol: string,
    spreadPercent: number,
    exchanges: Map<string, number>,
  ): Promise<void> {
    if (!this.bot) return;

    let priceList = "";
    for (const [exchange, price] of exchanges) {
      priceList += `• ${exchange}: $${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n`;
    }

    const message =
      `⚖️ *Arbitrage Opportunity!*\n\n` +
      `📊 ${symbol}/USDT\n` +
      `📈 Spread: ${spreadPercent.toFixed(2)}%\n\n` +
      `*Prices:*\n${priceList}`;

    for (const chatId of this.subscribedChats) {
      try {
        await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error(`[AlertScheduler] Failed to send arbitrage alert to ${chatId}:`, error);
      }
    }
  }

  /**
   * Economic calendar notifier - runs daily at 08:00 AM
   */
  private startEconomicCalendarNotifier(): void {
    this.calendarJob = cron.schedule("0 8 * * *", async () => {
      await this.sendDailyCalendar();
    });

    console.log("[AlertScheduler] Economic calendar notifier started");
  }

  /**
   * Send daily high-impact events summary
   */
  private async sendDailyCalendar(): Promise<void> {
    if (!this.bot) return;

    try {
      const events = await this.economicCalendarService.getHighImpactEvents();

      if (events.length === 0) return;

      let message = `📅 *Economic Calendar - Today*\n\n`;
      message += `🔴 *HIGH IMPACT EVENTS*\n\n`;

      for (const event of events.slice(0, 5)) {
        message += `• ${event.time} ${this.getCountryFlag(event.country)} ${event.title}\n`;
        if (event.forecast || event.previous) {
          message += `  Forecast: ${event.forecast || "N/A"} | Previous: ${event.previous || "N/A"}\n`;
        }
      }

      for (const chatId of this.subscribedChats) {
        try {
          await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
        } catch (error) {
          console.error(`[AlertScheduler] Failed to send calendar to ${chatId}:`, error);
        }
      }
    } catch (error) {
      console.error("[AlertScheduler] Error sending daily calendar:", error);
    }
  }

  /**
   * Get flag emoji for country code
   */
  private getCountryFlag(country: string): string {
    const flags: Record<string, string> = {
      USD: "🇺🇸",
      EUR: "🇪🇺",
      GBP: "🇬🇧",
      JPY: "🇯🇵",
      CHF: "🇨🇭",
      AUD: "🇦🇺",
      CAD: "🇨🇦",
      NZD: "🇳🇿",
      CNY: "🇨🇳",
    };
    return flags[country] || "🌍";
  }

  /**
   * Position TP/SL monitor - runs every minute
   * Auto-closes positions when Take Profit or Stop Loss is hit
   */
  private startPositionMonitor(): void {
    this.positionMonitorJob = cron.schedule("* * * * *", async () => {
      await this.checkPositionTpSl();
    });

    console.log("[AlertScheduler] Position TP/SL monitor started");
  }

  /**
   * Check all positions with TP/SL set
   */
  private async checkPositionTpSl(): Promise<void> {
    if (!this.bot) return;

    try {
      const positions = await this.db.getAllPositionsWithTpSl();

      if (positions.length === 0) return;

      // Group by symbol for efficient price fetching
      const symbolPositions = new Map<string, typeof positions>();
      for (const item of positions) {
        const existing = symbolPositions.get(item.position.symbol) || [];
        existing.push(item);
        symbolPositions.set(item.position.symbol, existing);
      }

      // Check each symbol
      for (const [symbol, items] of symbolPositions) {
        try {
          const priceData = await this.financeService.getPrice(symbol);
          const currentPrice = priceData.price;

          for (const { chatId, position } of items) {
            let triggered: "tp" | "sl" | null = null;

            // Check Take Profit (price >= TP)
            if (position.takeProfit && currentPrice >= position.takeProfit) {
              triggered = "tp";
            }
            // Check Stop Loss (price <= SL)
            else if (position.stopLoss && currentPrice <= position.stopLoss) {
              triggered = "sl";
            }

            if (triggered) {
              await this.executePositionClose(chatId, position.id, symbol, currentPrice, triggered);
            }
          }
        } catch (error) {
          console.error(`[AlertScheduler] Error checking TP/SL for ${symbol}:`, error);
        }
      }
    } catch (error) {
      console.error("[AlertScheduler] Error in position TP/SL check:", error);
    }
  }

  /**
   * Execute position close for TP/SL hit
   */
  private async executePositionClose(
    chatId: number,
    positionId: string,
    symbol: string,
    price: number,
    type: "tp" | "sl",
  ): Promise<void> {
    if (!this.bot) return;

    try {
      const tradeRecord = await this.db.closePosition(chatId, positionId, price);

      if (!tradeRecord) {
        console.error(`[AlertScheduler] Failed to close position ${positionId}`);
        return;
      }

      const emoji = type === "tp" ? "✅" : "🛑";
      const label = type === "tp" ? "Take Profit" : "Stop Loss";
      const pnl = tradeRecord.pnl ?? 0;
      const pnlEmoji = pnl >= 0 ? "🟢" : "🔴";

      const message =
        `${emoji} *${label} Hit!*\n\n` +
        `📊 ${symbol}\n` +
        `💰 Exit Price: $${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n` +
        `📦 Quantity: ${tradeRecord.quantity}\n` +
        `${pnlEmoji} P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n\n` +
        `_Position closed automatically._`;

      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error(`[AlertScheduler] Failed to execute TP/SL close for ${positionId}:`, error);
    }
  }

  /**
   * Stop all jobs
   */
  stopAll(): void {
    this.priceAlertJob?.stop();
    this.whaleJob?.stop();
    this.arbitrageJob?.stop();
    this.calendarJob?.stop();
    this.positionMonitorJob?.stop();

    console.log("[AlertScheduler] All monitoring jobs stopped");
  }
}
