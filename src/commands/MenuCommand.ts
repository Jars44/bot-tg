/**
 * Menu Command - Central Dashboard Hub
 * Provides button-based navigation to all bot features
 *
 * UX Fix: Uses Dependency Injection and Direct Execution instead of
 * sending text messages that the bot ignores.
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler } from "./types.js";
import { createMenuKeyboard, createTradingKeyboard, createFinanceKeyboard } from "../utils/uiHelper.js";
import { sessionManager } from "../utils/SessionManager.js";

// Import commands for DI
import type { NewsCommand } from "./NewsCommand.js";
import type { HelpCommand } from "./HelpCommand.js";
import type { PortfolioCommand } from "./TradeCommand.js";
import type { CalendarCommand } from "./CalendarCommand.js";
import type { MyAlertsCommand } from "./AlertCommand.js";

const MENU_MESSAGE = `
Jarvis

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
 * Helper to create a mock Message from a CallbackQuery
 * Preserves chat.id and user details for commands to know the requester
 */
function createMockMessage(query: TelegramBot.CallbackQuery): TelegramBot.Message {
  const chatId = query.message?.chat.id ?? 0;
  const chat = query.message?.chat ?? { id: chatId, type: "private" as const };

  return {
    message_id: query.message?.message_id ?? 0,
    date: Math.floor(Date.now() / 1000),
    chat,
    from: query.from,
    text: "",
  };
}

/**
 * Main menu command (/menu and /start)
 */
export class MenuCommand implements Command, CallbackHandler {
  pattern = /^\/(menu|start)$/;
  prefix = "menu_";

  // Injected command instances
  private newsCommand: NewsCommand;
  private helpCommand: HelpCommand;

  constructor(newsCommand: NewsCommand, helpCommand: HelpCommand) {
    this.newsCommand = newsCommand;
    this.helpCommand = helpCommand;
  }

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
        // Prompt for search AND set session state
        await bot.editMessageText("🎬 *Cari Anime*\n\nKetik judul anime:\n_Contoh: Naruto_", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "⬅️ Menu", callback_data: "menu_back" }]],
          },
        });
        // UX Fix: Register session state so SessionInputHandler catches the input
        sessionManager.startAnimeSearch(chatId, messageId);
        break;

      case "lyrics":
        // Prompt for search AND set session state
        await bot.editMessageText("🎵 *Cari Lirik*\n\nKetik artis - judul:\n_Contoh: Lana Del Rey - Brooklyn Baby_", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "⬅️ Menu", callback_data: "menu_back" }]],
          },
        });
        // UX Fix: Register session state so SessionInputHandler catches the input
        sessionManager.startLyricsSearch(chatId, messageId);
        break;

      case "movie":
        // Prompt for search AND set session state
        await bot.editMessageText("🎬 *Cari Film*\n\nKetik judul film:\n_Contoh: Interstellar_", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "⬅️ Menu", callback_data: "menu_back" }]],
          },
        });
        // UX Fix: Register session state so SessionInputHandler catches the input
        sessionManager.startMovieSearch(chatId, messageId);
        break;

      case "news":
        // UX Fix: Direct Execution instead of sending text message
        await bot.deleteMessage(chatId, messageId);
        await this.newsCommand.execute(bot, createMockMessage(query));
        break;

      case "help":
        // UX Fix: Direct Execution instead of sending text message
        await bot.deleteMessage(chatId, messageId);
        await this.helpCommand.execute(bot, createMockMessage(query));
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
 * Uses DI for direct command execution
 */
export class TradingMenuHandler implements CallbackHandler {
  prefix = "trade_";

  // Injected command instances
  private portfolioCommand: PortfolioCommand;
  private calendarCommand: CalendarCommand;
  private myAlertsCommand: MyAlertsCommand;

  constructor(portfolioCommand: PortfolioCommand, calendarCommand: CalendarCommand, myAlertsCommand: MyAlertsCommand) {
    this.portfolioCommand = portfolioCommand;
    this.calendarCommand = calendarCommand;
    this.myAlertsCommand = myAlertsCommand;
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    const action = data.replace("trade_", "");

    switch (action) {
      case "portfolio":
        // UX Fix: Direct Execution instead of sending text message
        await bot.deleteMessage(chatId, messageId);
        await this.portfolioCommand.execute(bot, createMockMessage(query));
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
        // UX Fix: Direct Execution instead of sending text message
        await bot.deleteMessage(chatId, messageId);
        await this.myAlertsCommand.execute(bot, createMockMessage(query));
        break;

      case "calendar":
        // UX Fix: Direct Execution instead of sending text message
        await bot.deleteMessage(chatId, messageId);
        await this.calendarCommand.execute(bot, createMockMessage(query));
        break;
    }

    await bot.answerCallbackQuery(query.id);
  }
}
