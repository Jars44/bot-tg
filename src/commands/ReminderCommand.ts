/**
 * Reminder command with database persistence
 */

import TelegramBot from "node-telegram-bot-api";
import cron from "node-cron";
import type { Command } from "./types.js";
import { JsonDb } from "../database/JsonDb.js";
import { MESSAGES } from "../config/messages.js";
import { getCurrentTimeString } from "../utils/helpers.js";

export class ReminderCommand implements Command {
  pattern = /^\/ingatkan(?:\s+(\d{1,2}:\d{2})(?:\s+(.+))?)?$/;
  private db: JsonDb;
  private bot: TelegramBot | null = null;
  private cronJob: cron.ScheduledTask | null = null;

  constructor(db: JsonDb) {
    this.db = db;
  }

  /**
   * Start the reminder cron job
   */
  startCron(bot: TelegramBot): void {
    this.bot = bot;

    // Check reminders every minute
    this.cronJob = cron.schedule("* * * * *", async () => {
      await this.checkReminders();
    });

    // Morning greeting at 7:00 AM
    cron.schedule("0 7 * * *", async () => {
      await this.sendMorningGreeting();
    });

    console.log("[ReminderCommand] Cron job started");
  }

  /**
   * Check and trigger due reminders
   */
  private async checkReminders(): Promise<void> {
    if (!this.bot) return;

    const currentTime = getCurrentTimeString();
    const dueReminders = await this.db.getRemindersForTime(currentTime);

    if (dueReminders.length === 0) return;

    for (const reminder of dueReminders) {
      try {
        await this.bot.sendMessage(reminder.chatId, MESSAGES.REMINDER_TRIGGER(reminder.message));
        await this.db.removeReminders([reminder.id]);
      } catch (err) {
        console.error(`[ReminderCommand] Failed to send reminder:`, err);
      }
    }
  }

  /**
   * Send morning greeting to active users
   */
  private async sendMorningGreeting(): Promise<void> {
    if (!this.bot) return;

    const allReminders = await this.db.getAllReminders();
    const uniqueChatIds = [...new Set(allReminders.map((r) => r.chatId))];

    for (const chatId of uniqueChatIds) {
      try {
        await this.bot.sendMessage(chatId, MESSAGES.GOOD_MORNING);
      } catch (err) {
        console.error(`[ReminderCommand] Failed to send morning greeting to ${chatId}:`, err);
      }
    }
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const time = match?.[1];
    const message = match?.[2]?.trim();

    if (!time) {
      await bot.sendMessage(
        chatId,
        `*Pengingat Waktu*\n\n` +
          `Membuat pengingat waktu personal yang akan dikirimkan pada jam yang ditentukan.\n\n` +
          `*Gunakan:* \`/ingatkan [HH:MM] [pesan]\`\n\n` +
          `*Contoh:*\n` +
          `\`/ingatkan 12:00 Makan siang\`\n` +
          `\`/ingatkan 08:30 Meeting pagi\`\n` +
          `\`/ingatkan 17:00 Pulang kerja\`\n\n` +
          `_Format waktu: 24 jam (contoh: 14:30 untuk jam 2:30 siang)_`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    if (!message) {
      await bot.sendMessage(
        chatId,
        "× Format salah. Pesan tidak boleh kosong.\nContoh: `/ingatkan 12:00 Makan siang`",
        { parse_mode: "Markdown" },
      );
      return;
    }

    // Store reminder in database (persists across restarts)
    await this.db.addReminder(chatId, time, message);

    await bot.sendMessage(chatId, MESSAGES.REMINDER_SET(time, message));
  }

  /**
   * Stop the cron job
   */
  stopCron(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
  }
}
