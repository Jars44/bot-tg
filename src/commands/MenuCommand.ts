/**
 * Menu Command
 * Displays the main interactive menu for the bot
 * Tone: Professional Hybrid
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler } from "./types.js";
import {
  createMenuKeyboard,
  createTradingKeyboard,
  createFinanceKeyboard,
  safeEditMessage,
  createGrid,
  getBackToMenuButton,
} from "../utils/uiHelper.js";
import { sessionManager } from "../utils/SessionManager.js";
import { MESSAGES } from "../config/messages.js";
import type { NewsCommand } from "./NewsCommand.js";
import type { HelpCommand } from "./HelpCommand.js";
import type { PortfolioCommand } from "./TradeCommand.js";
import type { CalendarCommand } from "./CalendarCommand.js";
import type { MyAlertsCommand } from "./AlertCommand.js";
import type { QuoteService } from "../services/QuoteService.js";
import type { ExpenseCommand, LaporanCommand, RekapCommand } from "./ExpenseCommand.js";

/**
 * Main menu command handler
 */
export class MenuCommand implements Command, CallbackHandler {
  pattern = /^\/(start|menu)$/;
  prefix = "menu_";

  // Dependencies injected via constructor
  private newsCommand: NewsCommand;
  private helpCommand: HelpCommand;
  private quoteService: QuoteService;

  constructor(newsCommand: NewsCommand, helpCommand: HelpCommand, quoteService: QuoteService) {
    this.newsCommand = newsCommand;
    this.helpCommand = helpCommand;
    this.quoteService = quoteService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text || "";

    let messageText = `Jarvis Bot Dashboard\n` + `\n` + `Pilih layanan yang tersedia:`;

    // Add welcome message for /start command
    if (text.startsWith("/start")) {
      messageText = `${MESSAGES.WELCOME}\n\n${messageText}`;
    }

    await bot.sendMessage(chatId, messageText, {
      reply_markup: {
        inline_keyboard: createMenuKeyboard(),
      },
      parse_mode: "Markdown",
    });
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    const action = data.replace("menu_", "");

    // Navigation Logic
    switch (action) {
      case "trading":
        await safeEditMessage(
          bot,
          chatId,
          messageId,
          `Trading Center\n` + `---------------------------\n` + `Akses fitur paper trading dan analisa:`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: createTradingKeyboard(),
            },
          },
        );
        break;

      case "expense":
        await safeEditMessage(
          bot,
          chatId,
          messageId,
          `Keuangan Pribadi\n` + `---------------------------\n` + `Kelola pencatatan keuangan anda:`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: createFinanceKeyboard(),
            },
          },
        );
        break;

      case "back":
        await safeEditMessage(
          bot,
          chatId,
          messageId,
          `Jarvis Bot Dashboard\n` + `---------------------------\n` + `Pilih layanan yang tersedia:`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: createMenuKeyboard(),
            },
          },
        );
        break;

      // Feature Execution Logic
      // For some features, we execute them directly and delete the menu message to avoid clutter

      case "news":
        // Direct execution of NewsCommand
        await bot.deleteMessage(chatId, messageId);
        await this.newsCommand.execute(bot, createMockMessage(query));
        break;

      case "help":
        // Direct execution of HelpCommand
        await bot.deleteMessage(chatId, messageId);
        await this.helpCommand.execute(bot, createMockMessage(query));
        break;

      case "anime":
      case "lyrics":
      case "movie": {
        // Interactive inputs - Prompt user
        let prompt = "";
        if (action === "anime") {
          prompt = "Masukkan judul Anime:";
          sessionManager.startAnimeSearch(chatId, messageId);
        } else if (action === "lyrics") {
          prompt = "Masukkan judul lagu (Artist - Title):";
          sessionManager.startLyricsSearch(chatId, messageId);
        } else if (action === "movie") {
          prompt = "Masukkan judul Film:";
          sessionManager.startMovieSearch(chatId, messageId);
        }

        await safeEditMessage(bot, chatId, messageId, prompt, {
          reply_markup: {
            inline_keyboard: createGrid([{ text: "Batal", callback_data: "menu_back" }]),
          },
        });
        break;
      }

      case "noop":
        // Do nothing for separator
        break;

      case "quote": {
        // Direct execution: Fetch and display quote immediately
        try {
          await safeEditMessage(bot, chatId, messageId, "⏳ Mengambil kutipan...");
        } catch {
          // If edit fails, delete and send new message
          await bot.deleteMessage(chatId, messageId);
          await bot.sendMessage(chatId, "⏳ Mengambil kutipan...");
        }

        try {
          const quote = await this.quoteService.getQuoteOfTheDay();
          if (quote) {
            await safeEditMessage(bot, chatId, messageId, `_"${quote.body}"_\n\n— *${quote.author}*`, {
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: getBackToMenuButton() },
            });
          } else {
            await safeEditMessage(bot, chatId, messageId, MESSAGES.ERROR_QUOTE, {
              reply_markup: { inline_keyboard: getBackToMenuButton() },
            });
          }
        } catch {
          await safeEditMessage(bot, chatId, messageId, MESSAGES.ERROR_QUOTE, {
            reply_markup: { inline_keyboard: getBackToMenuButton() },
          });
        }
        break;
      }

      case "weather":
        // Wizard flow: Ask for city name
        sessionManager.startWeatherMenu(chatId, messageId);
        await safeEditMessage(bot, chatId, messageId, "Silakan ketik nama kota untuk melihat cuaca:", {
          reply_markup: {
            inline_keyboard: createGrid([{ text: "Batal", callback_data: "menu_back" }]),
          },
        });
        break;

      case "prayer":
        // Wizard flow: Ask for city name
        sessionManager.startPrayerMenu(chatId, messageId);
        await safeEditMessage(bot, chatId, messageId, "Silakan ketik nama kota untuk melihat jadwal sholat:", {
          reply_markup: {
            inline_keyboard: createGrid([{ text: "Batal", callback_data: "menu_back" }]),
          },
        });
        break;

      default:
        await bot.answerCallbackQuery(query.id, { text: "Menu belum tersedia" });
    }

    await bot.answerCallbackQuery(query.id);
  }
}

/**
 * Handler for Trading Menu sub-actions
 */
export class TradingMenuHandler implements CallbackHandler {
  prefix = "trade_";

  // Dependencies
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
      case "buy":
        // Start buy wizard - prompt for symbol
        sessionManager.startBuyWizard(chatId, messageId);
        await safeEditMessage(
          bot,
          chatId,
          messageId,
          "*Buy Wizard*\n\nMasukkan simbol aset (contoh: BTC, ETH, AAPL):",
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "Batal", callback_data: "menu_back" }]],
            },
          },
        );
        break;
      case "sell":
        // Start sell wizard - prompt for symbol
        sessionManager.startSellWizard(chatId, messageId);
        await safeEditMessage(
          bot,
          chatId,
          messageId,
          "*Sell Wizard*\n\nMasukkan simbol aset (contoh: BTC, ETH, AAPL):",
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "Batal", callback_data: "menu_back" }]],
            },
          },
        );
        break;
      case "portfolio":
        await bot.deleteMessage(chatId, messageId);
        await this.portfolioCommand.execute(bot, createMockMessage(query));
        break;
      case "calendar":
        await bot.deleteMessage(chatId, messageId);
        await this.calendarCommand.execute(bot, createMockMessage(query));
        break;
      case "alerts":
        await bot.deleteMessage(chatId, messageId);
        // Execute MyAlerts logic (assuming it's implemented in AlertCommand or similar)
        // For now, let's assume MyAlertsCommand has execute
        await this.myAlertsCommand.execute(bot, createMockMessage(query));
        break;
      default:
        await bot.answerCallbackQuery(query.id, { text: "Fitur dalam pengembangan" });
    }

    await bot.answerCallbackQuery(query.id);
  }
}

/**
 * Handler for Finance Menu sub-actions
 */
export class FinanceMenuHandler implements CallbackHandler {
  prefix = "fin_";

  // Dependencies
  private catatCommand: ExpenseCommand;
  private rekapCommand: RekapCommand;
  private laporanCommand: LaporanCommand;

  constructor(catatCommand: ExpenseCommand, rekapCommand: RekapCommand, laporanCommand: LaporanCommand) {
    this.catatCommand = catatCommand;
    this.rekapCommand = rekapCommand;
    this.laporanCommand = laporanCommand;
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    const action = data.replace("fin_", "");

    switch (action) {
      case "catat":
        await bot.deleteMessage(chatId, messageId);
        await this.catatCommand.execute(bot, createMockMessage(query));
        break;
      case "rekap":
        await bot.deleteMessage(chatId, messageId);
        await this.rekapCommand.execute(bot, createMockMessage(query));
        break;
      case "laporan":
        await bot.deleteMessage(chatId, messageId);
        await this.laporanCommand.execute(bot, createMockMessage(query));
        break;
    }

    await bot.answerCallbackQuery(query.id);
  }
}

/**
 * Helper to create a mock message from callback query
 * Preserves user info for command execution
 */
function createMockMessage(query: TelegramBot.CallbackQuery): TelegramBot.Message {
  return {
    message_id: query.message?.message_id || 0,
    chat: query.message?.chat || { id: 0, type: "private" },
    date: query.message?.date || Date.now(),
    from: query.from,
    text: "",
  };
}
