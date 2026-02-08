/**
 * Price Alert Commands
 * Set and manage price alerts for cryptocurrencies and forex
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import type { JsonDb } from "../database/JsonDb.js";
import type { AlertCondition } from "../database/types.js";

/**
 * Create a price alert
 * Usage: /alert [symbol] [price] [condition]
 */
export class AlertCommand implements Command {
  pattern = /^\/alert\s+(\w+)\s+([\d.]+)\s*([><]=?)$/;
  private db: JsonDb;

  constructor(db: JsonDb) {
    this.db = db;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;

    if (!match || !match[1] || !match[2] || !match[3]) {
      await bot.sendMessage(
        chatId,
        "❌ Format salah!\n\n" +
          "Gunakan: `/alert [symbol] [price] [condition]`\n" +
          "Contoh: `/alert BTC 100000 >`\n" +
          "(Alert jika BTC > $100,000)\n\n" +
          "Kondisi yang tersedia: `>`, `<`, `>=`, `<=`",
        { parse_mode: "Markdown" },
      );
      return;
    }

    const symbol = match[1].toUpperCase();
    const targetPrice = parseFloat(match[2]);
    const condition = match[3] as AlertCondition;

    if (isNaN(targetPrice) || targetPrice <= 0) {
      await bot.sendMessage(chatId, "❌ Harga target harus angka positif.");
      return;
    }

    try {
      await this.db.addAlert(chatId, symbol, targetPrice, condition);

      const conditionText = this.getConditionText(condition);

      const message =
        `🔔 *Alert Berhasil Dibuat!*\n\n` +
        `📊 Symbol: ${symbol}\n` +
        `🎯 Target: ${conditionText} $${targetPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n\n` +
        `_Kamu akan menerima notifikasi saat harga mencapai target._`;

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[AlertCommand] Error:", error);
      await bot.sendMessage(chatId, "❌ Gagal membuat alert. Silakan coba lagi.");
    }
  }

  private getConditionText(condition: AlertCondition): string {
    const map: Record<AlertCondition, string> = {
      ">": "Lebih dari",
      "<": "Kurang dari",
      ">=": "Lebih dari atau sama dengan",
      "<=": "Kurang dari atau sama dengan",
    };
    return map[condition] || condition;
  }
}

/**
 * View user's active alerts
 */
export class MyAlertsCommand implements Command {
  pattern = /^\/alerts$/;
  private db: JsonDb;

  constructor(db: JsonDb) {
    this.db = db;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
      const alerts = await this.db.getAlertsByUser(chatId);

      if (alerts.length === 0) {
        await bot.sendMessage(chatId, "📭 Kamu belum punya alert aktif.\n\nBuat dengan: `/alert BTC 100000 >`", {
          parse_mode: "Markdown",
        });
        return;
      }

      let message = "🔔 *Daftar Alert Aktif*\n\n";

      for (const alert of alerts) {
        message += `• ${alert.symbol} ${alert.condition} $${alert.targetPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n`;
      }

      message += `\n_Total: ${alerts.length} alert_`;

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[MyAlertsCommand] Error:", error);
      await bot.sendMessage(chatId, "❌ Gagal mengambil daftar alert.");
    }
  }
}

/**
 * Help for alert command
 */
export class AlertHelpCommand implements Command {
  pattern = /^\/alert$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const message =
      "🔔 *Price Alert*\n\n" +
      "Buat notifikasi otomatis saat harga mencapai target.\n\n" +
      "*Format:*\n" +
      "`/alert [symbol] [price] [condition]`\n\n" +
      "*Contoh:*\n" +
      "`/alert BTC 100000 >` _(BTC > $100k)_\n" +
      "`/alert ETH 3000 <` _(ETH < $3k)_\n" +
      "`/alert XAUUSD 2500 >=`\n\n" +
      "*Kondisi:*\n" +
      "• `>` lebih dari\n" +
      "• `<` kurang dari\n" +
      "• `>=` lebih/sama dengan\n" +
      "• `<=` kurang/sama dengan\n\n" +
      "*Lainnya:*\n" +
      "`/alerts` - Lihat alert aktif";

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }
}
