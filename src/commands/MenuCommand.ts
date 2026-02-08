/**
 * Menu Command - Central Dashboard Hub
 * Provides button-based navigation to all bot features
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler } from "./types.js";
import { createMenuKeyboard, createTradingKeyboard, createFinanceKeyboard } from "../utils/uiHelper.js";
import { sessionManager } from "../utils/SessionManager.js";

const MENU_MESSAGE = `
🤖 *Jars44 Bot*

Pilih menu di bawah untuk memulai:
`;

const TRADING_MESSAGE = `
📉 *Trading Menu*

Pilih fitur trading:
`;

const FINANCE_MESSAGE = `
💰 *Keuangan Menu*

Pilih fitur keuangan:
`;

/**
 * Main menu command (/menu and /start)
 */
export class MenuCommand implements Command, CallbackHandler {
  pattern = /^\/(menu|start)$/;
  prefix = "menu_";

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    // Clear any existing session when returning to menu
    sessionManager.clearState(chatId);

    await bot.sendMessage(chatId, MENU_MESSAGE, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: createMenuKeyboard(),
      },
    });
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    const action = data.replace("menu_", "");

    switch (action) {
      case "weather":
        // Prompt for location
        await bot.editMessageText("🌤 *Cuaca*\n\nKetik nama kota:\n_Contoh: Malang_", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "⬅️ Menu", callback_data: "menu_back" }]],
          },
        });
        sessionManager.startLocationRequest(chatId, "weather");
        break;

      case "prayer":
        // Prompt for location
        await bot.editMessageText("🕌 *Jadwal Sholat*\n\nKetik nama kota:\n_Contoh: Jakarta_", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "⬅️ Menu", callback_data: "menu_back" }]],
          },
        });
        sessionManager.startLocationRequest(chatId, "prayer");
        break;

      case "expense":
        // Show finance sub-menu
        await bot.editMessageText(FINANCE_MESSAGE, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: createFinanceKeyboard(),
          },
        });
        break;

      case "trading":
        // Show trading sub-menu
        await bot.editMessageText(TRADING_MESSAGE, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: createTradingKeyboard(),
          },
        });
        break;

      case "anime":
        // Prompt for search
        await bot.editMessageText("🎬 *Cari Anime*\n\nKetik judul anime:\n_Contoh: Naruto_", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "⬅️ Menu", callback_data: "menu_back" }]],
          },
        });
        break;

      case "lyrics":
        // Prompt for search
        await bot.editMessageText("🎵 *Cari Lirik*\n\nKetik artis - judul:\n_Contoh: Lana Del Rey - Brooklyn Baby_", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "⬅️ Menu", callback_data: "menu_back" }]],
          },
        });
        break;

      case "news":
        // Send news command
        await bot.deleteMessage(chatId, messageId);
        await bot.sendMessage(chatId, "/berita");
        break;

      case "help":
        // Send help command
        await bot.deleteMessage(chatId, messageId);
        await bot.sendMessage(chatId, "/help");
        break;

      case "back":
        // Return to main menu
        sessionManager.clearState(chatId);
        await bot.editMessageText(MENU_MESSAGE, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: createMenuKeyboard(),
          },
        });
        break;
    }

    await bot.answerCallbackQuery(query.id);
  }
}

/**
 * Finance sub-menu callback handler
 */
export class FinanceMenuHandler implements CallbackHandler {
  prefix = "fin_";

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    const action = data.replace("fin_", "");

    switch (action) {
      case "catat":
        // Start expense flow - delete menu and send /catat
        await bot.deleteMessage(chatId, messageId);
        // Trigger expense command by sending internal message
        await bot.sendMessage(chatId, "💰 *Catat Keuangan*\n\nMau catat apa?", {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📉 Pengeluaran", callback_data: "exp_type_expense" },
                { text: "📈 Pemasukan", callback_data: "exp_type_income" },
              ],
            ],
          },
        });
        sessionManager.startExpenseFlow(chatId);
        break;

      case "rekap":
        // Delete menu and show rekap options
        await bot.deleteMessage(chatId, messageId);
        await bot.sendMessage(chatId, "📊 *Pilih Periode Laporan:*", {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📅 Harian", callback_data: "rekap_daily" },
                { text: "🗓️ Bulanan", callback_data: "rekap_monthly" },
              ],
              [{ text: "📊 Semua Waktu", callback_data: "rekap_all" }],
            ],
          },
        });
        break;

      case "laporan":
        // Delete menu and send /laporan
        await bot.deleteMessage(chatId, messageId);
        await bot.sendMessage(chatId, "/laporan");
        break;
    }

    await bot.answerCallbackQuery(query.id);
  }
}

/**
 * Trading sub-menu callback handler
 */
export class TradingMenuHandler implements CallbackHandler {
  prefix = "trade_";

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    const action = data.replace("trade_", "");

    switch (action) {
      case "portfolio":
        await bot.deleteMessage(chatId, messageId);
        await bot.sendMessage(chatId, "/portfolio");
        break;

      case "buy":
        await bot.editMessageText(
          "📈 *Buy Asset*\n\nKetik perintah:\n`/buy [symbol] [qty]`\n\n_Contoh: /buy BTC 0.01_",
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "⬅️ Kembali", callback_data: "menu_trading" }]],
            },
          },
        );
        break;

      case "sell":
        await bot.editMessageText(
          "📉 *Sell Asset*\n\nKetik perintah:\n`/sell [symbol] [qty]`\n\n_Contoh: /sell ETH 0.5_",
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "⬅️ Kembali", callback_data: "menu_trading" }]],
            },
          },
        );
        break;

      case "alerts":
        await bot.deleteMessage(chatId, messageId);
        await bot.sendMessage(chatId, "/alerts");
        break;

      case "calendar":
        await bot.deleteMessage(chatId, messageId);
        await bot.sendMessage(chatId, "/calendar");
        break;
    }

    await bot.answerCallbackQuery(query.id);
  }
}
