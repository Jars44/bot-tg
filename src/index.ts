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
import { ChartService } from "./services/ChartService.js";

// Commands
import type { Command, MessageHandler, CallbackHandler } from "./commands/types.js";
import { StopCommand } from "./commands/StartCommand.js";
import { HelpCommand } from "./commands/HelpCommand.js";
import { WeatherCommand } from "./commands/WeatherCommand.js";
import { ReminderCommand } from "./commands/ReminderCommand.js";
import { RandomReplyHandler } from "./commands/RandomReplyHandler.js";
import { StickerCommand } from "./commands/StickerCommand.js";
import { StickerHandler } from "./commands/StickerHandler.js";
import { AnimeCommand, AnimeSelectionHandler } from "./commands/AnimeCommand.js";
import { MovieCommand } from "./commands/MovieCommand.js";
import { QuoteCommand } from "./commands/QuoteCommand.js";
import { NewsCommand } from "./commands/NewsCommand.js";
import { EarthquakeCommand } from "./commands/EarthquakeCommand.js";
import { PrayerCommand } from "./commands/PrayerCommand.js";
import { LyricsCommand } from "./commands/LyricsCommand.js";
import { DownloadCommand, DownloadCallbackHandler, DownloadInputHandler } from "./commands/DownloadCommand.js";
import { InvalidCommandHandler } from "./commands/InvalidCommandHandler.js";
import { MenuCommand, FinanceMenuHandler, TradingMenuHandler } from "./commands/MenuCommand.js";
import { SessionInputHandler } from "./commands/SessionInputHandler.js";
import { LocationHandler } from "./commands/LocationHandler.js";
import { LocationCallbackHandler } from "./commands/LocationCallbackHandler.js";
import { SmartPasteHandler, SmartPasteCallbackHandler } from "./commands/SmartPasteHandler.js";

// Financial Commands
import { ExpenseCommand, LaporanCommand, RekapCommand } from "./commands/ExpenseCommand.js";
import {
  PortfolioCommand,
  BuyCommand,
  SellCommand,
  CloseCommand,
  TradeConfirmHandler,
} from "./commands/TradeCommand.js";
import { RiskCommand, RiskInputHandler } from "./commands/RiskCommand.js";
import { MarketCommand, MarketCallbackHandler } from "./commands/MarketCommand.js";
import { AlertCommand, MyAlertsCommand } from "./commands/AlertCommand.js";
import { SentimentCommand } from "./commands/SentimentCommand.js";
import { CalendarCommand, HighImpactCommand } from "./commands/CalendarCommand.js";
import { ChartCommand, ChartCallbackHandler } from "./commands/ChartCommand.js";
import { TpSlInputHandler, TpSlCallbackHandler } from "./commands/TpSlHandler.js";

// Utils
import { setupErrorHandlers } from "./utils/errorHandler.js";
import { sessionManager } from "./utils/SessionManager.js";

async function main(): Promise<void> {
  console.log("[Bot] Starting initialization...");

  // Setup global error handlers
  setupErrorHandlers();

  // Initialize database
  const db = new JsonDb();
  await db.init();
  console.log("[Bot] Database initialized");

  // Initialize session manager persistence
  await sessionManager.initialize(db);
  console.log("[Bot] Session persistence initialized");

  // Initialize HTTP client
  const httpClient = new HttpClient();

  // Initialize temp cleaner
  const tempCleaner = new TempCleanerService();
  tempCleaner.start();

  // Initialize services (Dependency Injection)
  const weatherService = new WeatherService(httpClient);
  const animeService = new AnimeService();
  const quoteService = new QuoteService(httpClient);
  const newsService = new NewsService();
  const prayerService = new PrayerService(httpClient);
  const lyricsService = new LyricsService(httpClient);
  const movieService = new MovieService(httpClient);
  const earthquakeService = new EarthquakeService(httpClient);
  const downloadService = new DownloadService(tempCleaner);
  const stickerService = new StickerService(tempCleaner);

  // Financial Services
  const financeDataService = new FinanceDataService();
  const tradingEngine = new TradingEngine(db, financeDataService);
  const sentimentAnalyzer = new SentimentAnalyzer(newsService);
  const economicCalendarService = new EconomicCalendarService(httpClient);
  const alertScheduler = new AlertScheduler(db, financeDataService, economicCalendarService);
  const chartService = new ChartService(financeDataService);
  console.log("[Bot] Financial services initialized");

  // Initialize bot
  const token = getEnvVar(ENV_KEYS.BOT_TOKEN);
  const bot = new TelegramBot(token, { polling: true });
  console.log("[Bot] Telegram bot initialized");

  // Initialize commands with DI
  const reminderCommand = new ReminderCommand(db);
  const downloadCommand = new DownloadCommand();
  const downloadCallbackHandler = new DownloadCallbackHandler(downloadService);
  const downloadInputHandler = new DownloadInputHandler(downloadService);
  const expenseCommand = new ExpenseCommand(db);
  const weatherCommand = new WeatherCommand(weatherService);
  const prayerCommand = new PrayerCommand(prayerService);
  const animeCommand = new AnimeCommand(animeService);
  const lyricsCommand = new LyricsCommand(lyricsService);
  const movieCommand = new MovieCommand(movieService);
  const stickerCommand = new StickerCommand(stickerService, tempCleaner, db);
  const chartCommand = new ChartCommand(chartService);
  const sentimentCommand = new SentimentCommand(sentimentAnalyzer);
  const alertCommand = new AlertCommand(tradingEngine);
  const buyCommand = new BuyCommand(tradingEngine);
  const sellCommand = new SellCommand(tradingEngine);

  // DI for MenuCommand
  const newsCommand = new NewsCommand(newsService);
  const helpCommand = new HelpCommand();
  const menuCommand = new MenuCommand(newsCommand, helpCommand, quoteService);

  // Market Hub Command (with DI)
  const marketCommand = new MarketCommand(tradingEngine);

  // DI for TradingMenuHandler
  const portfolioCommand = new PortfolioCommand(tradingEngine);
  const calendarCommand = new CalendarCommand(economicCalendarService);
  const myAlertsCommand = new MyAlertsCommand();

  // DI for FinanceMenuHandler
  const rekapCommand = new RekapCommand(db);
  const laporanCommand = new LaporanCommand(db);

  // Risk Wizard (with handlers)
  const riskInputHandler = new RiskInputHandler();
  const riskCommand = new RiskCommand(riskInputHandler);

  // Session handler for interactive flows (with MovieCommand for movie search)
  const sessionInputHandler = new SessionInputHandler(
    animeCommand,
    lyricsCommand,
    movieCommand,
    marketCommand,
    riskInputHandler,
    weatherCommand,
    prayerCommand,
    chartCommand,
    stickerCommand,
    sentimentCommand,
    alertCommand,
    reminderCommand,
    buyCommand,
    sellCommand,
  );

  const commands: Command[] = [
    // Core commands - MenuCommand handles /start and /menu
    menuCommand,
    new StopCommand(),
    helpCommand,
    weatherCommand,
    reminderCommand,
    stickerCommand,
    animeCommand,
    movieCommand,
    new QuoteCommand(quoteService),
    newsCommand,
    new EarthquakeCommand(earthquakeService),
    prayerCommand,
    lyricsCommand,
    downloadCommand,

    // Financial Suite Commands
    expenseCommand, // /catat
    new LaporanCommand(db), // /laporan
    new RekapCommand(db), // /rekap

    // Paper Trading
    portfolioCommand, // /portfolio
    buyCommand, // /buy [symbol] [qty]
    sellCommand, // /sell [symbol] [qty]
    new CloseCommand(tradingEngine), // /close [symbol]

    // Risk Calculator (Hybrid: Regex + Wizard)
    riskCommand, // /risk or /risk [capital] [%] [pips]

    // Market Hub
    marketCommand, // /market [symbol] or /m [symbol]

    // Price Alerts
    alertCommand, // /alert [symbol] [price] [cond]
    myAlertsCommand, // /alerts

    // Sentiment Analysis
    sentimentCommand, // /sentimen [keyword]

    // Economic Calendar
    calendarCommand, // /calendar
    new HighImpactCommand(economicCalendarService), // /highimpact

    // Charting
    // Charting
    chartCommand, // /chart [symbol] [timeframe]
  ];

  // Message handlers (for non-command messages)
  const messageHandlers: MessageHandler[] = [
    new SmartPasteHandler(), // Smart Paste: Auto-detect URLs (highest priority)
    new LocationHandler(weatherService, prayerService), // Handle location messages (high priority)
    new StickerHandler(stickerService, tempCleaner, db), // Handle photo messages for sticker creation
    expenseCommand, // Handle expense flow text input
    sessionInputHandler, // Handle general session input (weather, lyrics, anime, market, risk)
    downloadInputHandler, // Handle download URL input
    new TpSlInputHandler(db), // Handle TP/SL input
    new RandomReplyHandler(stickerService),
    new InvalidCommandHandler(),
  ];

  // Callback handlers (for inline buttons)
  const callbackHandlers: CallbackHandler[] = [
    // Menu navigation
    menuCommand, // menu_ prefix
    new FinanceMenuHandler(expenseCommand, rekapCommand, laporanCommand), // fin_ prefix
    new TradingMenuHandler(portfolioCommand, calendarCommand, myAlertsCommand), // trade_ menu prefix (different from tconf_)

    // Market Hub
    new MarketCallbackHandler(marketCommand, tradingEngine, chartService, sentimentAnalyzer), // mkt_ prefix

    // Risk Wizard
    riskCommand, // risk_ prefix (RiskCommand is also the CallbackHandler)

    // Financial commands
    expenseCommand.getCallbackHandler(), // exp_ prefix
    new RekapCommand(db), // rekap_ prefix
    new TradeConfirmHandler(tradingEngine), // tconf_ prefix

    // Search selection
    new AnimeSelectionHandler(), // anime_sel_ prefix

    // TP/SL
    new TpSlCallbackHandler(), // tpsl_ prefix

    // Download wizard
    downloadCallbackHandler, // dl_ prefix
    stickerCommand, // sticker_ prefix
    new ChartCallbackHandler(chartService), // chart_ prefix
    new LocationCallbackHandler(weatherService, prayerService), // loc_ prefix
    new SmartPasteCallbackHandler(downloadInputHandler), // sp_ prefix
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
    // Skip command messages (they're handled by onText)
    if (msg.text && msg.text.startsWith("/")) return;
    // Process messages with text, location, or photos
    if (!msg.text && !msg.location && !msg.photo) return;

    for (const handler of messageHandlers) {
      if (await handler.shouldHandle(msg)) {
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
