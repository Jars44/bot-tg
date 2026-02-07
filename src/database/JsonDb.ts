/**
 * JSON-based database using lowdb for persistence
 * Data survives application restarts
 */

import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import type { DatabaseSchema, Reminder, UserRateLimit } from "./types.js";
import { CONFIG } from "../config/index.js";

const DEFAULT_DATA: DatabaseSchema = {
  reminders: [],
  rateLimits: [],
};

export class JsonDb {
  private db: Low<DatabaseSchema>;
  private initialized = false;

  constructor(dbPath?: string) {
    const dataDir = path.resolve(process.cwd(), "data");

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filePath = dbPath ?? path.join(dataDir, "db.json");
    const adapter = new JSONFile<DatabaseSchema>(filePath);
    this.db = new Low(adapter, DEFAULT_DATA);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.db.read();
    this.db.data ||= DEFAULT_DATA;
    await this.db.write();
    this.initialized = true;
  }

  private ensureInit(): void {
    if (!this.initialized) {
      throw new Error("Database not initialized. Call init() first.");
    }
  }

  // ==================== Reminder Operations ====================

  async addReminder(chatId: number, time: string, message: string): Promise<Reminder> {
    this.ensureInit();

    const reminder: Reminder = {
      id: randomUUID(),
      chatId,
      time,
      message,
      createdAt: Date.now(),
    };

    this.db.data.reminders.push(reminder);
    await this.db.write();
    return reminder;
  }

  async removeReminder(id: string): Promise<boolean> {
    this.ensureInit();

    const initialLength = this.db.data.reminders.length;
    this.db.data.reminders = this.db.data.reminders.filter((r) => r.id !== id);

    if (this.db.data.reminders.length < initialLength) {
      await this.db.write();
      return true;
    }
    return false;
  }

  async getRemindersForTime(time: string): Promise<Reminder[]> {
    this.ensureInit();
    return this.db.data.reminders.filter((r) => r.time === time);
  }

  async getAllReminders(): Promise<Reminder[]> {
    this.ensureInit();
    return [...this.db.data.reminders];
  }

  async removeReminders(ids: string[]): Promise<void> {
    this.ensureInit();
    const idSet = new Set(ids);
    this.db.data.reminders = this.db.data.reminders.filter((r) => !idSet.has(r.id));
    await this.db.write();
  }

  // ==================== Rate Limit Operations ====================

  async getUserLimit(userId: number): Promise<UserRateLimit> {
    this.ensureInit();

    let userLimit = this.db.data.rateLimits.find((r) => r.userId === userId);

    if (!userLimit) {
      userLimit = {
        userId,
        stickerCount: 0,
        lastReset: Date.now(),
      };
      this.db.data.rateLimits.push(userLimit);
      await this.db.write();
    }

    // Check if rate limit should be reset
    if (Date.now() - userLimit.lastReset >= CONFIG.RATE_LIMIT_RESET_MS) {
      userLimit.stickerCount = 0;
      userLimit.lastReset = Date.now();
      await this.db.write();
    }

    return userLimit;
  }

  async incrementStickerCount(userId: number): Promise<number> {
    this.ensureInit();

    const userLimit = await this.getUserLimit(userId);
    userLimit.stickerCount++;
    await this.db.write();
    return userLimit.stickerCount;
  }

  async canCreateSticker(userId: number): Promise<{ allowed: boolean; remaining: number }> {
    const userLimit = await this.getUserLimit(userId);
    const allowed = userLimit.stickerCount < CONFIG.STICKER_LIMIT;
    const remaining = Math.max(0, CONFIG.STICKER_LIMIT - userLimit.stickerCount);
    return { allowed, remaining };
  }

  // ==================== Cleanup Operations ====================

  async cleanExpiredRateLimits(): Promise<void> {
    this.ensureInit();

    const now = Date.now();
    this.db.data.rateLimits = this.db.data.rateLimits.filter((r) => now - r.lastReset < CONFIG.RATE_LIMIT_RESET_MS);
    await this.db.write();
  }
}
