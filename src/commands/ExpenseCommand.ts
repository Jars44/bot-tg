/**
 * Expense Tracker Command with State Machine
 * Interactive multi-step flow for recording expenses and income
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler, MessageHandler } from "./types.js";
import type { JsonDb } from "../database/JsonDb.js";
import type { TransactionType } from "../database/types.js";

export class ExpenseCommand implements Command, MessageHandler {
  pattern = /^\/catat$/;
  private db: JsonDb;

  constructor(db: JsonDb) {
    this.db = db;
  }

  /**
   * Start expense recording flow
   */
  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    // Set initial state
    await this.db.setConversationState(chatId, "expense", "type", {});

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📉 Pengeluaran", callback_data: "exp_type_expense" },
            { text: "📈 Pemasukan", callback_data: "exp_type_income" },
          ],
        ],
      },
    };

    await bot.sendMessage(chatId, "💰 *Catat Keuangan*\n\nMau catat apa?", {
      ...options,
      parse_mode: "Markdown",
    });
  }

  /**
   * Get callback handler for button interactions
   */
  getCallbackHandler(): CallbackHandler {
    return {
      prefix: "exp_",
      handle: async (bot, query, data) => {
        const chatId = query.message?.chat.id;
        if (!chatId || !query.message) return;

        const state = await this.db.getConversationState(chatId);
        if (!state || state.command !== "expense") {
          await bot.answerCallbackQuery(query.id, { text: "Sesi sudah kadaluarsa" });
          return;
        }

        // Handle type selection
        if (data.startsWith("exp_type_")) {
          const type = data.replace("exp_type_", "") as TransactionType;

          await this.db.setConversationState(chatId, "expense", "amount", { type });

          const typeLabel = type === "expense" ? "Pengeluaran" : "Pemasukan";

          await bot.editMessageText(`📝 *${typeLabel}*\n\nMasukkan jumlah (angka saja):\n_Contoh: 50000_`, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
          });
        }

        await bot.answerCallbackQuery(query.id);
      },
    };
  }

  /**
   * Check if this handler should process the message
   */
  shouldHandle(msg: TelegramBot.Message): boolean {
    if (!msg.text) return false;
    // Will be checked in handle() with async state lookup
    return true; // Let handle() decide based on state
  }

  /**
   * Handle text input for amount and description
   */
  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text ?? "";

    // Skip if text looks like a command
    if (text.startsWith("/")) return;

    const state = await this.db.getConversationState(chatId);
    if (!state || state.command !== "expense") return;

    // Handle amount input
    if (state.step === "amount") {
      const amount = parseFloat(text.replace(/[^0-9.]/g, ""));

      if (isNaN(amount) || amount <= 0) {
        await bot.sendMessage(chatId, "❌ Jumlah tidak valid. Masukkan angka positif.");
        return;
      }

      const stateData = state.data as { type: TransactionType };
      await this.db.setConversationState(chatId, "expense", "description", {
        type: stateData.type,
        amount,
      });

      await bot.sendMessage(
        chatId,
        `💵 Jumlah: Rp${amount.toLocaleString("id-ID")}\n\nSekarang masukkan deskripsi/kategori:`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    // Handle description input
    if (state.step === "description") {
      const stateData = state.data as { type: TransactionType; amount: number };
      const description = text.trim();

      if (!description) {
        await bot.sendMessage(chatId, "❌ Deskripsi tidak boleh kosong.");
        return;
      }

      // Save transaction
      await this.db.addTransaction(chatId, stateData.type, stateData.amount, description);

      // Clear state
      await this.db.clearConversationState(chatId);

      // Get updated summary
      const summary = await this.db.getTransactionSummary(chatId);

      const typeEmoji = stateData.type === "expense" ? "📉" : "📈";
      const typeLabel = stateData.type === "expense" ? "Pengeluaran" : "Pemasukan";

      const message =
        `✅ *${typeLabel} Tercatat!*\n\n` +
        `${typeEmoji} *Jumlah:* Rp${stateData.amount.toLocaleString("id-ID")}\n` +
        `📝 *Deskripsi:* ${description}\n\n` +
        `📊 *Ringkasan:*\n` +
        `├ Total Pemasukan: Rp${summary.totalIncome.toLocaleString("id-ID")}\n` +
        `├ Total Pengeluaran: Rp${summary.totalExpense.toLocaleString("id-ID")}\n` +
        `└ Saldo: Rp${summary.balance.toLocaleString("id-ID")}`;

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    }
  }
}

/**
 * View transaction summary and history
 */
export class LaporanCommand implements Command {
  pattern = /^\/laporan$/;
  private db: JsonDb;

  constructor(db: JsonDb) {
    this.db = db;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const summary = await this.db.getTransactionSummary(chatId);
    const recentTransactions = await this.db.getTransactionsByUser(chatId, { limit: 5 });

    let message = `📊 *Laporan Keuangan*\n\n`;
    message += `📈 Total Pemasukan: Rp${summary.totalIncome.toLocaleString("id-ID")}\n`;
    message += `📉 Total Pengeluaran: Rp${summary.totalExpense.toLocaleString("id-ID")}\n`;
    message += `💰 Saldo: Rp${summary.balance.toLocaleString("id-ID")}\n`;
    message += `📝 Total Transaksi: ${summary.count}\n`;

    if (recentTransactions.length > 0) {
      message += `\n*Transaksi Terakhir:*\n`;

      for (const tx of recentTransactions) {
        const emoji = tx.type === "expense" ? "📉" : "📈";
        const date = new Date(tx.createdAt).toLocaleDateString("id-ID");
        message += `${emoji} Rp${tx.amount.toLocaleString("id-ID")} - ${tx.description} (${date})\n`;
      }
    }

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }
}

/**
 * Reporting Command
 * View daily, monthly, and all-time financial reports
 */
export class RekapCommand implements Command, CallbackHandler {
  pattern = /^\/rekap$/;
  prefix = "rekap_";
  private db: JsonDb;

  constructor(db: JsonDb) {
    this.db = db;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📅 Harian (Hari Ini)", callback_data: "rekap_daily" },
            { text: "🗓️ Bulanan (Bulan Ini)", callback_data: "rekap_monthly" },
          ],
          [{ text: "📊 Semua Waktu", callback_data: "rekap_all" }],
        ],
      },
    };

    await bot.sendMessage(chatId, "📊 *Pilih Periode Laporan:*", {
      ...options,
      parse_mode: "Markdown",
    });
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    if (!chatId || !query.message) return;

    const type = data.replace("rekap_", "");
    let transactions: import("../database/types.js").Transaction[] = [];
    let title = "";

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    if (type === "daily") {
      transactions = await this.db.getTransactionsByDateRange(chatId, startOfDay, endOfToday);
      title = `📅 *Laporan Harian* (${now.toLocaleDateString("id-ID")})`;
    } else if (type === "monthly") {
      transactions = await this.db.getTransactionsByDateRange(chatId, startOfMonth, Date.now());
      title = `🗓️ *Laporan Bulanan* (${now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })})`;
    } else if (type === "all") {
      transactions = await this.db.getTransactionsByUser(chatId);
      title = "📊 *Laporan Semua Waktu*";
    }

    if (transactions.length === 0) {
      await bot.editMessageText(`${title}\n\n_Belum ada data transaksi untuk periode ini._`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "Markdown",
      });
      await bot.answerCallbackQuery(query.id);
      return;
    }

    // Calculate totals
    const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    let message = `${title}\n\n`;
    message += `💰 *Saldo Periode:* Rp${balance.toLocaleString("id-ID")}\n`;
    message += `📈 *Pemasukan:* Rp${totalIncome.toLocaleString("id-ID")}\n`;
    message += `📉 *Pengeluaran:* Rp${totalExpense.toLocaleString("id-ID")}\n\n`;

    // Grouping for Monthly/All Time
    if (type === "monthly" || type === "all") {
      // Group by category (first word of description as naive category if no category field)
      // Since we don't strictly enforce category yet, we'll try to guess or use description for small lists
      // For now, let's group by "Income" vs "Expense" details

      message += `*Rincian Pengeluaran:*\n`;
      const expenses = transactions
        .filter((t) => t.type === "expense")
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      if (expenses.length > 0) {
        for (const tx of expenses) {
          message += `• ${tx.description}: Rp${tx.amount.toLocaleString("id-ID")}\n`;
        }
        if (transactions.filter((t) => t.type === "expense").length > 10) {
          message += `_...dan lainnya_\n`;
        }
      } else {
        message += `_Tidak ada pengeluaran_\n`;
      }
    } else {
      // Daily: Show all transactions
      message += `*Rincian Transaksi:*\n`;
      for (const tx of transactions) {
        const emoji = tx.type === "income" ? "📈" : "📉";
        message += `${emoji} ${tx.description}: Rp${tx.amount.toLocaleString("id-ID")}\n`;
      }
    }

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: "Markdown",
    });

    await bot.answerCallbackQuery(query.id);
  }
}
