import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";

import { getEnvVar, ENV_KEYS } from "./config/index.js";

import { JsonDb } from "./database/JsonDb.js";

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

import { FinanceDataService } from "./services/FinanceDataService.js";
import { TradingEngine } from "./services/TradingEngine.js";
import { SentimentAnalyzer } from "./services/SentimentAnalyzer.js";
import { EconomicCalendarService } from "./services/EconomicCalendarService.js";
import { AlertScheduler } from "./services/AlertScheduler.js";
import { ChartService } from "./services/ChartService.js";

import { AIService } from "./services/GenAIService.js";
import { VibeService } from "./services/VibeService.js";
import { AestheticService } from "./services/AestheticService.js";
import { UrbanExplorationService } from "./services/UrbanExplorationService.js";
import { BrainstormService } from "./services/BrainstormService.js";

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
import { GeoGuessrCommand, GiveUpCommand } from "./commands/GeoGuessrCommand.js";
import { AiStartCommand, AiStopCommand } from "./commands/AiChatCommand.js";

import { VibeCommand } from "./commands/VibeCommand.js";
import { AestheticCommand } from "./commands/AestheticCommand.js";
import { HuntCommand } from "./commands/HuntCommand.js";
import {
  BrainstormCommand,
  IdeaCommand,
  LoreCommand,
  BrainstormCallbackHandler,
} from "./commands/BrainstormCommand.js";

import { setupErrorHandlers } from "./utils/errorHandler.js";
import { sessionManager } from "./utils/SessionManager.js";

async function main(): Promise<void> {
  console.log("[Bot] Starting initialization...");

  setupErrorHandlers();

  const token = getEnvVar(ENV_KEYS.BOT_TOKEN);
  if (!token || token.length < 20 || !token.includes(":")) {
    throw new Error("Invalid or missing BOT_TOKEN. Check your .env file.");
  }
  console.log("[Bot] Token format validated");

  const db = new JsonDb();
  await db.init();
  console.log("[Bot] Database initialized");

  await sessionManager.initialize(db);
  console.log("[Bot] Session persistence initialized");

  const httpClient = new HttpClient();

  const tempCleaner = new TempCleanerService();
  tempCleaner.start();

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

  const financeDataService = new FinanceDataService();
  const tradingEngine = new TradingEngine(db, financeDataService);
  const sentimentAnalyzer = new SentimentAnalyzer(newsService);
  const economicCalendarService = new EconomicCalendarService(httpClient);
  const alertScheduler = new AlertScheduler(db, financeDataService, economicCalendarService);
  const chartService = new ChartService(financeDataService);
  console.log("[Bot] Financial services initialized");

  const aiService = new AIService();
  const vibeService = new VibeService(aiService, weatherService, httpClient);
  const aestheticService = new AestheticService(httpClient, aiService);
  const urbanExplorationService = new UrbanExplorationService(aiService, httpClient);
  const brainstormService = new BrainstormService(aiService);
  console.log("[Bot] Lifestyle services initialized");

  const bot = new TelegramBot(token, {
    polling: {
      interval: 1000,
      autoStart: true,
      params: {
        timeout: 10,
        allowed_updates: ["message", "callback_query"],
      },
    },
  });
  console.log("[Bot] Telegram bot initialized with polling");

  bot.on("polling_error", (error) => {
    const errorObj = error as unknown as Record<string, unknown>;
    if (errorObj.code === "EFATAL") {
      console.error("[Bot] Polling error EFATAL:", errorObj.message);
      console.log("[Bot] Attempting to restart polling...");
    } else {
      console.error("[Bot] Polling error:", error);
    }
  });

  bot.on("error", (error) => {
    console.error("[Bot] Bot error:", error);
  });

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

  const newsCommand = new NewsCommand(newsService);
  const helpCommand = new HelpCommand();
  const geoGuessrCommand = new GeoGuessrCommand();

  const vibeCommand = new VibeCommand(vibeService);
  const aestheticCommand = new AestheticCommand(aestheticService);
  const huntCommand = new HuntCommand(urbanExplorationService);
  const brainstormCommand = new BrainstormCommand();
  const ideaCommand = new IdeaCommand(brainstormService);
  const loreCommand = new LoreCommand(brainstormService);
  const brainstormCallbackHandler = new BrainstormCallbackHandler(brainstormService);

  const menuCommand = new MenuCommand(
    newsCommand,
    helpCommand,
    geoGuessrCommand,
    quoteService,
    vibeCommand,
    huntCommand,
    brainstormCommand,
  );

  const marketCommand = new MarketCommand(tradingEngine);

  const portfolioCommand = new PortfolioCommand(tradingEngine);
  const calendarCommand = new CalendarCommand(economicCalendarService);
  const myAlertsCommand = new MyAlertsCommand();

  const rekapCommand = new RekapCommand(db);
  const laporanCommand = new LaporanCommand(db);

  const riskInputHandler = new RiskInputHandler();
  const riskCommand = new RiskCommand(riskInputHandler);

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
    aestheticCommand,
  );

  const commands: Command[] = [
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

    expenseCommand,
    new LaporanCommand(db),
    new RekapCommand(db),

    portfolioCommand,
    buyCommand,
    sellCommand,
    new CloseCommand(tradingEngine),

    riskCommand,

    marketCommand,

    alertCommand,
    myAlertsCommand,

    sentimentCommand,

    calendarCommand,
    new HighImpactCommand(economicCalendarService),

    chartCommand,

    geoGuessrCommand,
    new GiveUpCommand(),

    new AiStartCommand(),
    new AiStopCommand(),

    vibeCommand,
    aestheticCommand,
    huntCommand,
    brainstormCommand,
    ideaCommand,
    loreCommand,
  ];

  const messageHandlers: MessageHandler[] = [
    new SmartPasteHandler(),
    new LocationHandler(weatherService, prayerService, vibeCommand, huntCommand),
    new StickerHandler(stickerService, tempCleaner, db),
    expenseCommand,
    sessionInputHandler,
    downloadInputHandler,
    new TpSlInputHandler(db),
    new RandomReplyHandler(stickerService),
    new InvalidCommandHandler(),
  ];

  const callbackHandlers: CallbackHandler[] = [
    menuCommand,
    new FinanceMenuHandler(expenseCommand, rekapCommand, laporanCommand),
    new TradingMenuHandler(portfolioCommand, calendarCommand, myAlertsCommand),

    new MarketCallbackHandler(marketCommand, tradingEngine, chartService, sentimentAnalyzer),

    riskCommand,

    expenseCommand.getCallbackHandler(),
    new RekapCommand(db),
    new TradeConfirmHandler(tradingEngine),

    new AnimeSelectionHandler(),

    new TpSlCallbackHandler(),

    downloadCallbackHandler,
    stickerCommand,
    new ChartCallbackHandler(chartService),
    new LocationCallbackHandler(weatherService, prayerService, vibeService, urbanExplorationService),
    new SmartPasteCallbackHandler(downloadInputHandler),
    brainstormCallbackHandler,
  ];

  reminderCommand.startCron(bot);
  alertScheduler.startAll(bot);
  console.log("[Bot] All schedulers started (reminders, alerts, whale monitor, arbitrage)");

  for (const command of commands) {
    bot.onText(command.pattern, async (msg, match) => {
      try {
        await command.execute(bot, msg, match);
      } catch (err) {
        console.error(`[Bot] Error in command ${command.pattern}:`, err);
      }
    });
  }

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

  bot.on("message", async (msg) => {
    if (msg.text && msg.text.startsWith("/")) {
      const invalidHandler = new InvalidCommandHandler();
      if (invalidHandler.shouldHandle(msg)) {
        try {
          await invalidHandler.handle(bot, msg);
        } catch (err) {
          console.error("[Bot] Error in invalid command handler:", err);
        }
      }
      return;
    }

    if (!msg.text && !msg.location && !msg.photo) return;

    for (const handler of messageHandlers) {
      if (await handler.shouldHandle(msg)) {
        try {
          await handler.handle(bot, msg);
        } catch (err) {
          console.error("[Bot] Error in message handler:", err);
        }
        return;
      }
    }
  });

  console.log("[Bot] All handlers registered");
  console.log(
    "[Bot] Financial Suite: Portfolio (/portfolio), Trading (/buy, /sell), Expense (/catat), Alerts (/alert)",
  );
  console.log("[Bot] Lifestyle Suite: Vibe (/vibe), Moodboard (/moodboard), Hunt (/hunt), Brainstorm (/brainstorm)");
  console.log("[Bot] Bot is running! Press Ctrl+C to stop.");
}

main().catch((err) => {
  console.error("[Bot] Fatal error during initialization:", err);
  process.exit(1);
});
