/**
 * Economic Calendar Command
 * View high-impact forex events
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import type { EconomicCalendarService } from "../services/EconomicCalendarService.js";

/**
 * View today's economic events
 */
export class CalendarCommand implements Command {
  pattern = /^\/calendar$/;
  private calendarService: EconomicCalendarService;

  constructor(calendarService: EconomicCalendarService) {
    this.calendarService = calendarService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId, "📅 Mengambil data economic calendar...");

    try {
      const events = await this.calendarService.getTodayEvents();
      const message = this.calendarService.formatEvents(events);

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[CalendarCommand] Error:", error);
      await bot.sendMessage(chatId, "❌ Gagal mengambil calendar. Silakan coba lagi.");
    }
  }
}

/**
 * View high-impact events only
 */
export class HighImpactCommand implements Command {
  pattern = /^\/highimpact$/;
  private calendarService: EconomicCalendarService;

  constructor(calendarService: EconomicCalendarService) {
    this.calendarService = calendarService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId, "🔴 Mengambil high-impact events...");

    try {
      const events = await this.calendarService.getHighImpactEvents();

      if (events.length === 0) {
        await bot.sendMessage(chatId, "📅 Tidak ada high-impact event hari ini.");
        return;
      }

      let message = "🔴 *High Impact Events - Today*\n\n";

      for (const event of events) {
        const flag = this.getCountryFlag(event.country);
        message += `• ${event.time} ${flag} ${event.title}\n`;
        if (event.forecast || event.previous) {
          message += `  F: ${event.forecast || "N/A"} | P: ${event.previous || "N/A"}\n`;
        }
      }

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[HighImpactCommand] Error:", error);
      await bot.sendMessage(chatId, "❌ Gagal mengambil data. Silakan coba lagi.");
    }
  }

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
    };
    return flags[country.toUpperCase()] || "🌍";
  }
}
