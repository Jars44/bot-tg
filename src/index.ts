/**
 * Main entry point for the Telegram Bot
 * Production-grade modular TypeScript application
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

// Commands
import type { Command, MessageHandler, CallbackHandler } from "./commands/types.js";
import { StartCommand, StopCommand } from "./commands/StartCommand.js";
import { HelpCommand } from "./commands/HelpCommand.js";
import { WeatherCommand } from "./commands/WeatherCommand.js";
import { ReminderCommand } from "./commands/ReminderCommand.js";
import { RandomReplyHandler } from "./commands/RandomReplyHandler.js";
import { StickerCommand } from "./commands/StickerCommand.js";
import { AnimeCommand } from "./commands/AnimeCommand.js";
import { MovieCommand } from "./commands/MovieCommand.js";
import { QuoteCommand } from "./commands/QuoteCommand.js";
import { NewsCommand } from "./commands/NewsCommand.js";
import { EarthquakeCommand } from "./commands/EarthquakeCommand.js";
import { PrayerCommand } from "./commands/PrayerCommand.js";
import { LyricsCommand } from "./commands/LyricsCommand.js";
import { DownloadCommand } from "./commands/DownloadCommand.js";
import { InvalidCommandHandler } from "./commands/InvalidCommandHandler.js";

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

  // Initialize bot
  const token = getEnvVar(ENV_KEYS.BOT_TOKEN);
  const bot = new TelegramBot(token, { polling: true });
  console.log("[Bot] Telegram bot initialized");

  // Initialize commands with DI
  const reminderCommand = new ReminderCommand(db);
  const downloadCommand = new DownloadCommand(downloadService, tempCleaner);

  const commands: Command[] = [
    new StartCommand(),
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
  ];

  // Message handlers (for non-command messages)
  const messageHandlers: MessageHandler[] = [
    downloadCommand, // Handle download links
    new RandomReplyHandler(stickerService),
    new InvalidCommandHandler(),
  ];

  // Callback handlers (for inline buttons)
  const callbackHandlers: CallbackHandler[] = [downloadCommand.getCallbackHandler()];

  // Start reminder cron job
  reminderCommand.startCron(bot);

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
  console.log("[Bot] Bot is running! Press Ctrl+C to stop.");
}

// Run the bot
main().catch((err) => {
  console.error("[Bot] Fatal error during initialization:", err);
  process.exit(1);
});
