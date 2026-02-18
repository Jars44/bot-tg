import TelegramBot from "node-telegram-bot-api";
import { S } from "../config/symbols.js";
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
import { toTitleCase } from "../utils/helpers.js";
import { MESSAGES } from "../config/messages.js";
import type { NewsCommand } from "./NewsCommand.js";
import type { HelpCommand } from "./HelpCommand.js";
import type { PortfolioCommand } from "./TradeCommand.js";
import type { CalendarCommand } from "./CalendarCommand.js";
import type { MyAlertsCommand } from "./AlertCommand.js";
import type { GeoGuessrCommand } from "./GeoGuessrCommand.js";
import type { QuoteService } from "../services/QuoteService.js";
import type { ExpenseCommand, LaporanCommand, RekapCommand } from "./ExpenseCommand.js";
import type { VibeCommand } from "./VibeCommand.js";
import type { HuntCommand } from "./HuntCommand.js";
import type { BrainstormCommand } from "./BrainstormCommand.js";

export class MenuCommand implements Command, CallbackHandler {
  pattern = /^\/(start|menu)$/;
  prefix = "menu_";
  private newsCommand: NewsCommand;
  private helpCommand: HelpCommand;
  private geoGuessrCommand: GeoGuessrCommand;
  private quoteService: QuoteService;
  private vibeCommand: VibeCommand;
  private huntCommand: HuntCommand;
  private brainstormCommand: BrainstormCommand;

  constructor(
    newsCommand: NewsCommand,
    helpCommand: HelpCommand,
    geoGuessrCommand: GeoGuessrCommand,
    quoteService: QuoteService,
    vibeCommand: VibeCommand,
    huntCommand: HuntCommand,
    brainstormCommand: BrainstormCommand,
  ) {
    this.newsCommand = newsCommand;
    this.helpCommand = helpCommand;
    this.geoGuessrCommand = geoGuessrCommand;
    this.quoteService = quoteService;
    this.vibeCommand = vibeCommand;
    this.huntCommand = huntCommand;
    this.brainstormCommand = brainstormCommand;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text || "";

    let messageText = `Jarvis Bot Dashboard\n` + `\n` + `Pilih layanan yang tersedia:`;
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

      case "news":
        await bot.deleteMessage(chatId, messageId);
        await this.newsCommand.execute(bot, createMockMessage(query));
        break;

      case "help":
        await bot.deleteMessage(chatId, messageId);
        await this.helpCommand.execute(bot, createMockMessage(query));
        break;

      case "geoguessr":
        await bot.deleteMessage(chatId, messageId);
        await this.geoGuessrCommand.execute(bot, createMockMessage(query));
        break;
      case "vibe":
        await bot.deleteMessage(chatId, messageId);
        await this.vibeCommand.execute(bot, createMockMessage(query), null);
        break;

      case "moodboard":
        sessionManager.startMoodboardMenu(chatId, messageId);
        await safeEditMessage(
          bot,
          chatId,
          messageId,
          `${S.PALETTE} Masukkan keyword estetik (contoh: *Cyberpunk*, *Old Money*, *Dark Academia*):`,
          {
            reply_markup: {
              inline_keyboard: createGrid([{ text: "Batal", callback_data: "menu_back" }]),
            },
          },
        );
        break;

      case "hunt":
        await bot.deleteMessage(chatId, messageId);
        await this.huntCommand.execute(bot, createMockMessage(query));
        break;

      case "brainstorm":
        await bot.deleteMessage(chatId, messageId);
        await this.brainstormCommand.execute(bot, createMockMessage(query), null);
        break;

      case "anime":
      case "lyrics":
      case "movie": {
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
        break;

      case "quote": {
        try {
          await safeEditMessage(bot, chatId, messageId, `${S.LOADING} Mengambil kutipan...`);
        } catch {
          await bot.deleteMessage(chatId, messageId);
          await bot.sendMessage(chatId, `${S.LOADING} Mengambil kutipan...`);
        }

        try {
          const quote = await this.quoteService.getQuoteOfTheDay();
          if (quote) {
            await safeEditMessage(bot, chatId, messageId, `_"${quote.body}"_\n\n— *${toTitleCase(quote.author)}*`, {
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
        sessionManager.startWeatherMenu(chatId, messageId);
        await safeEditMessage(bot, chatId, messageId, "Silakan ketik nama kota untuk melihat cuaca:", {
          reply_markup: {
            inline_keyboard: createGrid([{ text: "Batal", callback_data: "menu_back" }]),
          },
        });
        break;

      case "prayer":
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

export class TradingMenuHandler implements CallbackHandler {
  prefix = "trade_";
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
        await this.myAlertsCommand.execute(bot, createMockMessage(query));
        break;
      default:
        await bot.answerCallbackQuery(query.id, { text: "Fitur dalam pengembangan" });
    }

    await bot.answerCallbackQuery(query.id);
  }
}

export class FinanceMenuHandler implements CallbackHandler {
  prefix = "fin_";
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

function createMockMessage(query: TelegramBot.CallbackQuery): TelegramBot.Message {
  return {
    message_id: query.message?.message_id || 0,
    chat: query.message?.chat || { id: 0, type: "private" },
    date: query.message?.date || Date.now(),
    from: query.from,
    text: "",
  };
}
