import TelegramBot from "node-telegram-bot-api";
import { MESSAGES } from "../config/messages.js";
import type { Command } from "./types.js";
import type { EconomicCalendarService } from "../services/EconomicCalendarService.js";
import { withLoading } from "../utils/uiHelper.js";
import { getCountryFlag } from "../utils/helpers.js";

export class CalendarCommand implements Command {
  pattern = /^\/calendar$/;
  private calendarService: EconomicCalendarService;

  constructor(calendarService: EconomicCalendarService) {
    this.calendarService = calendarService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    await withLoading(bot, chatId, async () => {
      try {
        const events = await this.calendarService.getTodayEvents();
        const message = this.calendarService.formatEvents(events);

        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error("[CalendarCommand] Error:", error);
        await bot.sendMessage(chatId, MESSAGES.CALENDAR_ERROR);
      }
    });
  }
}

export class HighImpactCommand implements Command {
  pattern = /^\/highimpact$/;
  private calendarService: EconomicCalendarService;

  constructor(calendarService: EconomicCalendarService) {
    this.calendarService = calendarService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    await withLoading(bot, chatId, async () => {
      try {
        const events = await this.calendarService.getHighImpactEvents();

        if (events.length === 0) {
          await bot.sendMessage(chatId, MESSAGES.CALENDAR_NO_EVENTS);
          return;
        }

        let message = "*High Impact Events — Today*\n\n";

        for (const event of events) {
          const flag = getCountryFlag(event.country);
          message += `• ${event.time} ${flag} ${event.title}\n`;
          if (event.forecast || event.previous) {
            message += `  F: ${event.forecast || "N/A"} | P: ${event.previous || "N/A"}\n`;
          }
        }

        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error("[HighImpactCommand] Error:", error);
        await bot.sendMessage(chatId, MESSAGES.CALENDAR_ERROR);
      }
    });
  }
}
