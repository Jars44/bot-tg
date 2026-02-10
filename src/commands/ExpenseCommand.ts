/**
 * Expense Tracker Command with State Machine
 * Interactive multi-step flow for recording expenses and income
 * Tone: Professional Hybrid
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler, MessageHandler } from "./types.js";
import type { JsonDb } from "../database/JsonDb.js";
import type { TransactionType } from "../database/types.js";

const EXPENSE_CATEGORIES: Record<string, string> = {
  food: "Makanan",
  transport: "Transport",
  bills: "Tagihan",
  shopping: "Belanja",
  entertainment: "Hiburan",
  custom: "Lainnya",
};

const INCOME_CATEGORIES: Record<string, string> = {
  salary: "Gaji",
  bonus: "Bonus",
  investment: "Investasi",
  allowance: "Uang Saku",
  custom: "Lainnya",
};

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
            { text: "Pengeluaran", callback_data: "exp_type_expense" },
            { text: "Pemasukan", callback_data: "exp_type_income" },
          ],
        ],
      },
    };

    await bot.sendMessage(chatId, "*Input Transaksi*\n\nPilih jenis transaksi:", {
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
          await bot.answerCallbackQuery(query.id, { text: "Sesi berakhir." });
          return;
        }

        // Handle type selection
        if (data.startsWith("exp_type_")) {
          const type = data.replace("exp_type_", "") as TransactionType;

          await this.db.setConversationState(chatId, "expense", "amount", { type });

          const typeLabel = type === "expense" ? "Pengeluaran" : "Pemasukan";

          await bot.editMessageText(`*${typeLabel}*\n\nMasukkan nominal transaksi (angka):\n_Contoh: 50000_`, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
          });
        }

        // Handle category selection
        if (data.startsWith("exp_cat_")) {
          const stateData = state.data as { type: TransactionType; amount: number };

          // Determine which category map to use based on transaction type
          const categoryMap = stateData.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

          const categoryKey = data.replace("exp_cat_", "");
          const category = categoryMap[categoryKey] || categoryKey; // Fallback to key if not found

          if (categoryKey === "custom") {
            // Prompt for custom description
            await this.db.setConversationState(chatId, "expense", "description", {
              type: stateData.type,
              amount: stateData.amount,
            });

            await bot.editMessageText("Masukkan deskripsi kategori:", {
              chat_id: chatId,
              message_id: query.message.message_id,
              parse_mode: "Markdown",
            });
          } else {
            // Save transaction with selected category
            await this.db.addTransaction(chatId, stateData.type, stateData.amount, category);
            await this.db.clearConversationState(chatId);

            // Get updated summary
            const summary = await this.db.getTransactionSummary(chatId);
            const typeLabel = stateData.type === "expense" ? "Pengeluaran" : "Pemasukan";

            const message =
              `✓ *TRANSAKSI BERHASIL*\n\n` +
              `\`\`\`\n` +
              `Type:     ${typeLabel}\n` +
              `Jumlah:   Rp${stateData.amount.toLocaleString("id-ID")}\n` +
              `Kategori: ${category}\n` +
              `\`\`\`\n\n` +
              `*Ringkasan Saldo*\n` +
              `Masuk:  Rp${summary.totalIncome.toLocaleString("id-ID")}\n` +
              `Keluar: Rp${summary.totalExpense.toLocaleString("id-ID")}\n` +
              `Total:  Rp${summary.balance.toLocaleString("id-ID")}`;

            await bot.editMessageText(message, {
              chat_id: chatId,
              message_id: query.message.message_id,
              parse_mode: "Markdown",
            });
          }
        }

        await bot.answerCallbackQuery(query.id);
      },
    };
  }

  /**
   * Check if this handler should process the message
   */
  async shouldHandle(msg: TelegramBot.Message): Promise<boolean> {
    if (!msg.text) return false;

    // Skip commands (starting with /) to avoid swallowing other commands
    if (msg.text.startsWith("/")) return false;

    // Check if user is in expense flow state
    const state = await this.db.getConversationState(msg.chat.id);
    return state?.command === "expense";
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
        await bot.sendMessage(chatId, "⚠︎ Nominal tidak valid. Masukkan angka positif.");
        return;
      }

      const stateData = state.data as { type: TransactionType };
      await this.db.setConversationState(chatId, "expense", "category", {
        type: stateData.type,
        amount,
      });

      // Generate category buttons dynamically based on type
      let inline_keyboard: TelegramBot.InlineKeyboardButton[][] = [];

      if (stateData.type === "expense") {
        inline_keyboard = [
          [
            { text: EXPENSE_CATEGORIES.food, callback_data: "exp_cat_food" },
            { text: EXPENSE_CATEGORIES.transport, callback_data: "exp_cat_transport" },
          ],
          [
            { text: EXPENSE_CATEGORIES.bills, callback_data: "exp_cat_bills" },
            { text: EXPENSE_CATEGORIES.shopping, callback_data: "exp_cat_shopping" },
          ],
          [
            { text: EXPENSE_CATEGORIES.entertainment, callback_data: "exp_cat_entertainment" },
            { text: EXPENSE_CATEGORIES.custom, callback_data: "exp_cat_custom" },
          ],
        ];
      } else {
        // Income categories
        inline_keyboard = [
          [
            { text: INCOME_CATEGORIES.salary, callback_data: "exp_cat_salary" },
            { text: INCOME_CATEGORIES.bonus, callback_data: "exp_cat_bonus" },
          ],
          [
            { text: INCOME_CATEGORIES.investment, callback_data: "exp_cat_investment" },
            { text: INCOME_CATEGORIES.allowance, callback_data: "exp_cat_allowance" },
          ],
          [{ text: INCOME_CATEGORIES.custom, callback_data: "exp_cat_custom" }],
        ];
      }

      // Show category buttons instead of text prompt
      await bot.sendMessage(chatId, `Nominal: Rp${amount.toLocaleString("id-ID")}\n\nPilih kategori:`, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard,
        },
      });
      return;
    }

    // Handle description input
    if (state.step === "description") {
      const stateData = state.data as { type: TransactionType; amount: number };
      const description = text.trim();

      if (!description) {
        await bot.sendMessage(chatId, "⚠︎ Deskripsi wajib diisi.");
        return;
      }

      // Save transaction
      await this.db.addTransaction(chatId, stateData.type, stateData.amount, description);

      // Clear state
      await this.db.clearConversationState(chatId);

      // Get updated summary
      const summary = await this.db.getTransactionSummary(chatId);

      const typeLabel = stateData.type === "expense" ? "Pengeluaran" : "Pemasukan";

      const message =
        `✓ *TRANSAKSI BERHASIL*\n\n` +
        `\`\`\`\n` +
        `Type:      ${typeLabel}\n` +
        `Jumlah:    Rp${stateData.amount.toLocaleString("id-ID")}\n` +
        `Deskripsi: ${description}\n` +
        `\`\`\`\n\n` +
        `*Ringkasan Saldo*\n` +
        `Masuk:  Rp${summary.totalIncome.toLocaleString("id-ID")}\n` +
        `Keluar: Rp${summary.totalExpense.toLocaleString("id-ID")}\n` +
        `Total:  Rp${summary.balance.toLocaleString("id-ID")}`;

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

    let message = `*Laporan Keuangan*\n\n`;
    message += `Masuk:  Rp${summary.totalIncome.toLocaleString("id-ID")}\n`;
    message += `Keluar: Rp${summary.totalExpense.toLocaleString("id-ID")}\n`;
    message += `Saldo:  Rp${summary.balance.toLocaleString("id-ID")}\n`;
    message += `Total Transaksi: ${summary.count}\n`;

    if (recentTransactions.length > 0) {
      message += `\n*Transaksi Terakhir*\n`;

      for (const tx of recentTransactions) {
        const typeSymbol = tx.type === "expense" ? "OUT" : "IN";
        message += `• [${typeSymbol}] Rp${tx.amount.toLocaleString("id-ID")} — ${tx.description}\n`;
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
            { text: "Harian", callback_data: "rekap_daily" },
            { text: "Bulanan", callback_data: "rekap_monthly" },
          ],
          [{ text: "Total", callback_data: "rekap_all" }],
        ],
      },
    };

    await bot.sendMessage(chatId, "*Pilih Periode Laporan:*", {
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
      title = `*Laporan Harian* (${now.toLocaleDateString("id-ID")})`;
    } else if (type === "monthly") {
      transactions = await this.db.getTransactionsByDateRange(chatId, startOfMonth, Date.now());
      title = `*Laporan Bulanan* (${now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })})`;
    } else if (type === "all") {
      transactions = await this.db.getTransactionsByUser(chatId);
      title = "*Laporan Total*";
    }

    if (transactions.length === 0) {
      await bot.editMessageText(`${title}\n\n_Tidak ada data transaksi._`, {
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
    message += `*Saldo:* Rp${balance.toLocaleString("id-ID")}\n`;
    message += `Masuk: Rp${totalIncome.toLocaleString("id-ID")}\n`;
    message += `Keluar: Rp${totalExpense.toLocaleString("id-ID")}\n\n`;

    // Grouping for Monthly/All Time
    if (type === "monthly" || type === "all") {
      message += `*5 Pengeluaran Terbesar:*\n`;
      const expenses = transactions
        .filter((t) => t.type === "expense")
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      if (expenses.length > 0) {
        for (const tx of expenses) {
          message += `• ${tx.description}: Rp${tx.amount.toLocaleString("id-ID")}\n`;
        }
      } else {
        message += `_Nihil_\n`;
      }
    } else {
      // Daily: Show all transactions
      message += `*Rincian Transaksi:*\n`;
      for (const tx of transactions) {
        const typeSymbol = tx.type === "income" ? "+" : "-";
        message += `${typeSymbol} Rp${tx.amount.toLocaleString("id-ID")} (${tx.description})\n`;
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
