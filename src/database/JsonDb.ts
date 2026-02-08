/**
 * JSON-based database using lowdb for persistence
 * Extended for Financial Suite with collection-based CRUD
 */

import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import type {
  DatabaseSchema,
  Reminder,
  UserRateLimit,
  Transaction,
  TransactionType,
  Portfolio,
  Position,
  TradeRecord,
  PriceAlert,
  AlertCondition,
  ConversationState,
  TransactionSummary,
} from "./types.js";
import { CONFIG } from "../config/index.js";

const DEFAULT_DATA: DatabaseSchema = {
  reminders: [],
  rateLimits: [],
  transactions: [],
  portfolios: [],
  alerts: [],
  conversationStates: [],
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
    // Ensure all collections exist
    this.db.data.reminders ||= [];
    this.db.data.rateLimits ||= [];
    this.db.data.transactions ||= [];
    this.db.data.portfolios ||= [];
    this.db.data.alerts ||= [];
    this.db.data.conversationStates ||= [];
    await this.db.write();
    this.initialized = true;
  }

  private ensureInit(): void {
    if (!this.initialized) {
      throw new Error("Database not initialized. Call init() first.");
    }
  }

  // ==================== Generic Collection Access ====================

  getCollection<K extends keyof DatabaseSchema>(key: K): DatabaseSchema[K] {
    this.ensureInit();
    return this.db.data[key];
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

  // ==================== Transaction Operations ====================

  async addTransaction(
    chatId: number,
    type: TransactionType,
    amount: number,
    description: string,
    category?: string,
  ): Promise<Transaction> {
    this.ensureInit();

    const transaction: Transaction = {
      id: randomUUID(),
      chatId,
      type,
      amount,
      description,
      category,
      createdAt: Date.now(),
    };

    this.db.data.transactions.push(transaction);
    await this.db.write();
    return transaction;
  }

  async getTransactionsByUser(
    chatId: number,
    options?: { limit?: number; type?: TransactionType },
  ): Promise<Transaction[]> {
    this.ensureInit();

    let transactions = this.db.data.transactions.filter((t) => t.chatId === chatId);

    if (options?.type) {
      transactions = transactions.filter((t) => t.type === options.type);
    }

    // Sort by createdAt descending (newest first)
    transactions.sort((a, b) => b.createdAt - a.createdAt);

    if (options?.limit) {
      transactions = transactions.slice(0, options.limit);
    }

    return transactions;
  }

  async getTransactionsByDateRange(chatId: number, startDate: number, endDate: number): Promise<Transaction[]> {
    this.ensureInit();

    return this.db.data.transactions.filter(
      (t) => t.chatId === chatId && t.createdAt >= startDate && t.createdAt <= endDate,
    );
  }

  async getTransactionSummary(chatId: number): Promise<TransactionSummary> {
    this.ensureInit();

    const transactions = this.db.data.transactions.filter((t) => t.chatId === chatId);

    const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      count: transactions.length,
    };
  }

  // ==================== Portfolio Operations ====================

  async getOrCreatePortfolio(chatId: number): Promise<Portfolio> {
    this.ensureInit();

    let portfolio = this.db.data.portfolios.find((p) => p.chatId === chatId);

    if (!portfolio) {
      portfolio = {
        chatId,
        cashBalance: CONFIG.PAPER_TRADING.INITIAL_BALANCE,
        positions: [],
        tradeHistory: [],
        createdAt: Date.now(),
      };
      this.db.data.portfolios.push(portfolio);
      await this.db.write();
    }

    return portfolio;
  }

  async updatePortfolio(chatId: number, updates: Partial<Portfolio>): Promise<void> {
    this.ensureInit();

    const portfolio = this.db.data.portfolios.find((p) => p.chatId === chatId);
    if (portfolio) {
      Object.assign(portfolio, updates);
      await this.db.write();
    }
  }

  async addPosition(chatId: number, position: Omit<Position, "id">): Promise<Position> {
    this.ensureInit();

    const portfolio = await this.getOrCreatePortfolio(chatId);
    const newPosition: Position = {
      ...position,
      id: randomUUID(),
    };

    portfolio.positions.push(newPosition);
    await this.db.write();
    return newPosition;
  }

  async getPosition(chatId: number, symbol: string): Promise<Position | undefined> {
    this.ensureInit();

    const portfolio = this.db.data.portfolios.find((p) => p.chatId === chatId);
    return portfolio?.positions.find((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
  }

  async closePosition(chatId: number, positionId: string, sellPrice: number): Promise<TradeRecord | null> {
    this.ensureInit();

    const portfolio = this.db.data.portfolios.find((p) => p.chatId === chatId);
    if (!portfolio) return null;

    const positionIndex = portfolio.positions.findIndex((p) => p.id === positionId);
    if (positionIndex === -1) return null;

    const position = portfolio.positions[positionIndex];
    const grossPnL = (sellPrice - position.entryPrice) * position.quantity;
    const commission = sellPrice * position.quantity * CONFIG.PAPER_TRADING.COMMISSION_RATE;
    const netPnL = grossPnL - commission;

    const tradeRecord: TradeRecord = {
      id: randomUUID(),
      symbol: position.symbol,
      action: "sell",
      price: sellPrice,
      quantity: position.quantity,
      commission,
      pnl: netPnL,
      executedAt: Date.now(),
    };

    // Update cash balance
    portfolio.cashBalance += sellPrice * position.quantity - commission;

    // Remove position
    portfolio.positions.splice(positionIndex, 1);

    // Add to trade history
    portfolio.tradeHistory.push(tradeRecord);

    await this.db.write();
    return tradeRecord;
  }

  /**
   * Update position TP/SL levels
   */
  async updatePositionTpSl(positionId: string, takeProfit?: number, stopLoss?: number): Promise<void> {
    this.ensureInit();

    for (const portfolio of this.db.data.portfolios) {
      const position = portfolio.positions.find((p) => p.id === positionId);
      if (position) {
        if (takeProfit !== undefined) position.takeProfit = takeProfit;
        if (stopLoss !== undefined) position.stopLoss = stopLoss;
        await this.db.write();
        return;
      }
    }
  }

  /**
   * Get all positions with TP/SL set (for monitoring)
   */
  async getAllPositionsWithTpSl(): Promise<Array<{ chatId: number; position: Position }>> {
    this.ensureInit();

    const result: Array<{ chatId: number; position: Position }> = [];

    for (const portfolio of this.db.data.portfolios) {
      for (const position of portfolio.positions) {
        if (position.takeProfit || position.stopLoss) {
          result.push({ chatId: portfolio.chatId, position });
        }
      }
    }

    return result;
  }

  async addTradeRecord(chatId: number, trade: Omit<TradeRecord, "id">): Promise<TradeRecord> {
    this.ensureInit();

    const portfolio = await this.getOrCreatePortfolio(chatId);
    const tradeRecord: TradeRecord = {
      ...trade,
      id: randomUUID(),
    };

    portfolio.tradeHistory.push(tradeRecord);
    await this.db.write();
    return tradeRecord;
  }

  // ==================== Alert Operations ====================

  async addAlert(chatId: number, symbol: string, targetPrice: number, condition: AlertCondition): Promise<PriceAlert> {
    this.ensureInit();

    const alert: PriceAlert = {
      id: randomUUID(),
      chatId,
      symbol: symbol.toUpperCase(),
      targetPrice,
      condition,
      createdAt: Date.now(),
      triggered: false,
    };

    this.db.data.alerts.push(alert);
    await this.db.write();
    return alert;
  }

  async getPendingAlerts(): Promise<PriceAlert[]> {
    this.ensureInit();
    return this.db.data.alerts.filter((a) => !a.triggered);
  }

  async getAlertsByUser(chatId: number): Promise<PriceAlert[]> {
    this.ensureInit();
    return this.db.data.alerts.filter((a) => a.chatId === chatId && !a.triggered);
  }

  async triggerAlert(alertId: string): Promise<void> {
    this.ensureInit();

    const alert = this.db.data.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.triggered = true;
      await this.db.write();
    }
  }

  async removeAlert(id: string): Promise<boolean> {
    this.ensureInit();

    const initialLength = this.db.data.alerts.length;
    this.db.data.alerts = this.db.data.alerts.filter((a) => a.id !== id);

    if (this.db.data.alerts.length < initialLength) {
      await this.db.write();
      return true;
    }
    return false;
  }

  // ==================== Conversation State Operations ====================

  async setConversationState(
    chatId: number,
    command: string,
    step: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    this.ensureInit();

    // Remove existing state for this chat
    this.db.data.conversationStates = this.db.data.conversationStates.filter((s) => s.chatId !== chatId);

    const state: ConversationState = {
      chatId,
      command,
      step,
      data,
      expiresAt: Date.now() + CONFIG.ALERTS.STATE_EXPIRY_MS,
    };

    this.db.data.conversationStates.push(state);
    await this.db.write();
  }

  async getConversationState(chatId: number): Promise<ConversationState | null> {
    await this.ensureInit();
    const state = this.db.data.conversationStates.find((s) => s.chatId === chatId);
    return state || null;
  }

  /**
   * Get all conversation states (for session manager initialization)
   */
  async getAllConversationStates(): Promise<ConversationState[]> {
    await this.ensureInit();
    return this.db.data.conversationStates;
  }

  async clearConversationState(chatId: number): Promise<void> {
    this.ensureInit();

    this.db.data.conversationStates = this.db.data.conversationStates.filter((s) => s.chatId !== chatId);
    await this.db.write();
  }

  // ==================== Cleanup Operations ====================

  async cleanExpiredRateLimits(): Promise<void> {
    this.ensureInit();

    const now = Date.now();
    this.db.data.rateLimits = this.db.data.rateLimits.filter((r) => now - r.lastReset < CONFIG.RATE_LIMIT_RESET_MS);
    await this.db.write();
  }

  async cleanExpiredConversationStates(): Promise<void> {
    this.ensureInit();

    const now = Date.now();
    this.db.data.conversationStates = this.db.data.conversationStates.filter((s) => s.expiresAt > now);
    await this.db.write();
  }

  async cleanTriggeredAlerts(): Promise<void> {
    this.ensureInit();

    // Remove alerts that were triggered more than 24 hours ago
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.db.data.alerts = this.db.data.alerts.filter((a) => !a.triggered || a.createdAt > oneDayAgo);
    await this.db.write();
  }
}
