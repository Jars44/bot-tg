/**
 * Main entry point for the Telegram Bot
 * Production-grade modular TypeScript application
 * Extended with Financial Suite features
 */

import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";

// Config
import { getEnvVar, ENV_KEYS } from "./config/index.js";

// Database
import { JsonDb } from "./database/JsonDb.js";

// Services
import { HttpClient } from "./services/HttpClient.js";
import { TempCleanerService } from "./services/TempCleanerService.js";
import { WeatherService } from "./services/WeatherService.js";
import { AnimeService } from "./services/AnimeService.js";
import { QuoteService } from "./services/QuoteService.js";
import { NewsService } from "./services/NewsService.js";
import { PrayerService } from "./services/PrayerService.js";
import { LyricsService } from "./services/LyricsService.js";
import { MovieService } from "./services/MovieService.js";
import { EarthquakeService } from "./services/EarthquakeService.js";
import { DownloadService } from "./services/DownloadService.js";
import { StickerService } from "./services/StickerService.js";

// Financial Services
import { FinanceDataService } from "./services/FinanceDataService.js";
import { TradingEngine } from "./services/TradingEngine.js";
import { SentimentAnalyzer } from "./services/SentimentAnalyzer.js";
import { EconomicCalendarService } from "./services/EconomicCalendarService.js";
import { AlertScheduler } from "./services/AlertScheduler.js";

// Commands
import type { Command, MessageHandler, CallbackHandler } from "./commands/types.js";
import { StopCommand } from "./commands/StartCommand.js";
import { HelpCommand } from "./commands/HelpCommand.js";
import { WeatherCommand } from "./commands/WeatherCommand.js";
import { ReminderCommand } from "./commands/ReminderCommand.js";
import { RandomReplyHandler } from "./commands/RandomReplyHandler.js";
import { StickerCommand } from "./commands/StickerCommand.js";
import { AnimeCommand, AnimeSelectionHandler } from "./commands/AnimeCommand.js";
import { MovieCommand } from "./commands/MovieCommand.js";
import { QuoteCommand } from "./commands/QuoteCommand.js";
import { NewsCommand } from "./commands/NewsCommand.js";
import { EarthquakeCommand } from "./commands/EarthquakeCommand.js";
import { PrayerCommand } from "./commands/PrayerCommand.js";
import { LyricsCommand } from "./commands/LyricsCommand.js";
import { DownloadCommand } from "./commands/DownloadCommand.js";
import { InvalidCommandHandler } from "./commands/InvalidCommandHandler.js";
import { MenuCommand, FinanceMenuHandler, TradingMenuHandler } from "./commands/MenuCommand.js";

// Financial Commands
import { ExpenseCommand, LaporanCommand, RekapCommand } from "./commands/ExpenseCommand.js";
import { PortfolioCommand, BuyCommand, SellCommand, TradeConfirmHandler } from "./commands/TradeCommand.js";
import { RiskCommand, RiskHelpCommand } from "./commands/RiskCommand.js";
import { AlertCommand, MyAlertsCommand, AlertHelpCommand } from "./commands/AlertCommand.js";
import { SentimentCommand, SentimentHelpCommand } from "./commands/SentimentCommand.js";
import { CalendarCommand, HighImpactCommand } from "./commands/CalendarCommand.js";

// Utils
import { setupErrorHandlers } from "./utils/errorHandler.js";

async function main(): Promise<void> {
  console.log("[Bot] Starting initialization...");

  // Setup global error handlers
  setupErrorHandlers();

  // Initialize database
  const db = new JsonDb();
  await db.init();
  console.log("[Bot] Database initialized");

  // Initialize HTTP client
  const httpClient = new HttpClient();

  // Initialize temp cleaner
  const tempCleaner = new TempCleanerService();
  tempCleaner.start();

  // Initialize services (Dependency Injection)
  const weatherService = new WeatherService(httpClient);
  const animeService = new AnimeService();
  const quoteService = new QuoteService(httpClient);
  const newsService = new NewsService(httpClient);
  const prayerService = new PrayerService(httpClient);
  const lyricsService = new LyricsService(httpClient);
  const movieService = new MovieService(httpClient);
  const earthquakeService = new EarthquakeService(httpClient);
  const downloadService = new DownloadService(httpClient, tempCleaner);
  const stickerService = new StickerService(tempCleaner);

  // Financial Services
  const financeDataService = new FinanceDataService();
  const tradingEngine = new TradingEngine(db, financeDataService);
  const sentimentAnalyzer = new SentimentAnalyzer(newsService);
  const economicCalendarService = new EconomicCalendarService(httpClient);
  const alertScheduler = new AlertScheduler(db, financeDataService, economicCalendarService);
  console.log("[Bot] Financial services initialized");

  // Initialize bot
  const token = getEnvVar(ENV_KEYS.BOT_TOKEN);
  const bot = new TelegramBot(token, { polling: true });
  console.log("[Bot] Telegram bot initialized");

  // Initialize commands with DI
  const reminderCommand = new ReminderCommand(db);
  const downloadCommand = new DownloadCommand(downloadService, tempCleaner);
  const expenseCommand = new ExpenseCommand(db);
  const menuCommand = new MenuCommand();

  const commands: Command[] = [
    // Core commands - MenuCommand handles /start and /menu
    menuCommand,
    new StopCommand(),
    new HelpCommand(),
    new WeatherCommand(weatherService),
    reminderCommand,
    new StickerCommand(stickerService, tempCleaner, db),
    new AnimeCommand(animeService),
    new MovieCommand(movieService),
    new QuoteCommand(quoteService),
    new NewsCommand(newsService),
    new EarthquakeCommand(earthquakeService),
    new PrayerCommand(prayerService),
    new LyricsCommand(lyricsService),
    downloadCommand,

    // Financial Suite Commands
    expenseCommand, // /catat
    new LaporanCommand(db), // /laporan
    new RekapCommand(db), // /rekap

    // Paper Trading
    new PortfolioCommand(tradingEngine), // /portfolio
    new BuyCommand(tradingEngine), // /buy [symbol] [qty]
    new SellCommand(tradingEngine), // /sell [symbol] [qty]

    // Risk Calculator
    new RiskHelpCommand(), // /risk (help)
    new RiskCommand(), // /risk [capital] [%] [pips]

    // Price Alerts
    new AlertHelpCommand(), // /alert (help)
    new AlertCommand(db), // /alert [symbol] [price] [cond]
    new MyAlertsCommand(db), // /alerts

    // Sentiment Analysis
    new SentimentHelpCommand(), // /sentimen (help)
    new SentimentCommand(sentimentAnalyzer), // /sentimen [keyword]

    // Economic Calendar
    new CalendarCommand(economicCalendarService), // /calendar
    new HighImpactCommand(economicCalendarService), // /highimpact
  ];

  // Message handlers (for non-command messages)
  const messageHandlers: MessageHandler[] = [
    expenseCommand, // Handle expense flow text input
    downloadCommand, // Handle download links
    new RandomReplyHandler(stickerService),
    new InvalidCommandHandler(),
  ];

  // Callback handlers (for inline buttons)
  const callbackHandlers: CallbackHandler[] = [
    // Menu navigation
    menuCommand, // menu_ prefix
    new FinanceMenuHandler(), // fin_ prefix
    new TradingMenuHandler(), // trade_ menu prefix (different from tconf_)

    // Financial commands
    expenseCommand.getCallbackHandler(), // exp_ prefix
    new RekapCommand(db), // rekap_ prefix
    new TradeConfirmHandler(tradingEngine), // tconf_ prefix

    // Search selection
    new AnimeSelectionHandler(), // anime_sel_ prefix

    // Download
    downloadCommand.getCallbackHandler(),
  ];

  // Start cron jobs
  reminderCommand.startCron(bot);
  alertScheduler.startAll(bot);
  console.log("[Bot] All schedulers started (reminders, alerts, whale monitor, arbitrage)");

  // Register command handlers
  for (const command of commands) {
    bot.onText(command.pattern, async (msg, match) => {
      try {
        await command.execute(bot, msg, match);
      } catch (err) {
        console.error(`[Bot] Error in command ${command.pattern}:`, err);
      }
    });
  }

  // Register callback query handler
  bot.on("callback_query", async (query) => {
    const data = query.data ?? "";

    for (const handler of callbackHandlers) {
      if (data.startsWith(handler.prefix)) {
        try {
          await handler.handle(bot, query, data);
        } catch (err) {
          console.error(`[Bot] Error in callback handler ${handler.prefix}:`, err);
        }
        return;
      }
    }
  });

  // Register message handlers
  bot.on("message", async (msg) => {
    // Skip if no text or handled by commands
    if (!msg.text) return;

    for (const handler of messageHandlers) {
      if (handler.shouldHandle(msg)) {
        try {
          await handler.handle(bot, msg);
        } catch (err) {
          console.error("[Bot] Error in message handler:", err);
        }
        return; // Only one handler per message
      }
    }
  });

  console.log("[Bot] All handlers registered");
  console.log(
    "[Bot] Financial Suite: Portfolio (/portfolio), Trading (/buy, /sell), Expense (/catat), Alerts (/alert)",
  );
  console.log("[Bot] Bot is running! Press Ctrl+C to stop.");
}

// Run the bot
main().catch((err) => {
  console.error("[Bot] Fatal error during initialization:", err);
  process.exit(1);
});
