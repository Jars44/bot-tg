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
} from "../utils/uiHelper.js";
import { sessionManager } from "../utils/SessionManager.js";
import type { NewsCommand } from "./NewsCommand.js";
import type { HelpCommand } from "./HelpCommand.js";
import type { PortfolioCommand } from "./TradeCommand.js";
import type { CalendarCommand } from "./CalendarCommand.js";
import type { MyAlertsCommand } from "./AlertCommand.js";

/**
 * Main menu command handler
 */
export class MenuCommand implements Command, CallbackHandler {
  pattern = /^\/menu$/;
  prefix = "menu_";

  // Dependencies injected via constructor
  private newsCommand: NewsCommand;
  private helpCommand: HelpCommand;

  constructor(newsCommand: NewsCommand, helpCommand: HelpCommand) {
    this.newsCommand = newsCommand;
    this.helpCommand = helpCommand;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    await bot.sendMessage(
      chatId,
      `🏦 *Jars44 Bot Dashboard*\n` + `---------------------------\n` + `Pilih layanan yang tersedia:`,
      {
        reply_markup: {
          inline_keyboard: createMenuKeyboard(),
        },
        parse_mode: "Markdown",
      },
    );
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
          `📉 *Trading Center*\n` + `---------------------------\n` + `Akses fitur paper trading dan analisa:`,
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
          `💰 *Keuangan Pribadi*\n` + `---------------------------\n` + `Kelola pencatatan keuangan anda:`,
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
          `🏦 *Jars44 Bot Dashboard*\n` + `---------------------------\n` + `Pilih layanan yang tersedia:`,
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
      case "movie":
        // Interactive inputs - Prompt user
        let prompt = "";
        if (action === "anime") {
          prompt = "🎬 Masukkan judul Anime:";
          sessionManager.startAnimeSearch(chatId, messageId);
        } else if (action === "lyrics") {
          prompt = "🎵 Masukkan judul lagu (Artist - Title):";
          sessionManager.startLyricsSearch(chatId, messageId);
        } else if (action === "movie") {
          prompt = "🎬 Masukkan judul Film:";
          sessionManager.startMovieSearch(chatId, messageId);
        }

        await safeEditMessage(bot, chatId, messageId, prompt, {
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
        await bot.sendMessage(chatId, "Gunakan perintah manual: /buy [Symbol] [Qty]");
        break;
      case "sell":
        await bot.sendMessage(chatId, "Gunakan perintah manual: /sell [Symbol] [Qty]");
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

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    const action = data.replace("fin_", "");

    switch (action) {
      case "catat":
        await bot.sendMessage(chatId, "Gunakan perintah: /catat");
        break;
      case "rekap":
        await bot.sendMessage(chatId, "Gunakan perintah: /rekap");
        break;
      case "laporan":
        await bot.sendMessage(chatId, "Gunakan perintah: /laporan");
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
