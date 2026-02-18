/**
 * Session Input Handler
 * Handles generic text inputs for interactive flows
 * UX Improvement: Routes input to appropriate commands based on active session state
 */

import TelegramBot from "node-telegram-bot-api";
import type { MessageHandler } from "./types.js";
import {
  sessionManager,
  SESSION_FLOWS,
  isMarketHubSession,
  isMovieSession,
  isWeatherMenuSession,
  isPrayerMenuSession,
} from "../utils/SessionManager.js";

import { AnimeCommand } from "./AnimeCommand.js";
import { LyricsCommand } from "./LyricsCommand.js";
import { MovieCommand } from "./MovieCommand.js";
import { MarketCommand } from "./MarketCommand.js";
import { RiskInputHandler } from "./RiskCommand.js";
import { WeatherCommand } from "./WeatherCommand.js";
import { PrayerCommand } from "./PrayerCommand.js";
import { ChartCommand } from "./ChartCommand.js";
import { StickerCommand } from "./StickerCommand.js";
import { SentimentCommand } from "./SentimentCommand.js";
import { AlertCommand } from "./AlertCommand.js";
import { ReminderCommand } from "./ReminderCommand.js";
import { BuyCommand, SellCommand } from "./TradeCommand.js";
import { GeoGuessrService } from "../services/GeoGuessrService.js";
import { AiService } from "../services/AiService.js";
import type { AestheticCommand } from "./AestheticCommand.js";
import { MESSAGES } from "../config/messages.js";
import { withLoading } from "../utils/uiHelper.js";

/**
 * Handles text input during active sessions (e.g. asking for location, song title)
 */
export class SessionInputHandler implements MessageHandler {
  private animeCommand: AnimeCommand;
  private lyricsCommand: LyricsCommand;
  private movieCommand: MovieCommand;
  private marketCommand: MarketCommand;
  private riskInputHandler: RiskInputHandler;
  private weatherCommand: WeatherCommand;
  private prayerCommand: PrayerCommand;
  private chartCommand: ChartCommand;
  private stickerCommand: StickerCommand;
  private sentimentCommand: SentimentCommand;
  private alertCommand: AlertCommand;
  private reminderCommand: ReminderCommand;
  private buyCommand: BuyCommand;
  private sellCommand: SellCommand;
  private geoGuessrService: GeoGuessrService;
  private aiService: AiService;
  private aestheticCommand: AestheticCommand | null;

  constructor(
    animeCommand: AnimeCommand,
    lyricsCommand: LyricsCommand,
    movieCommand: MovieCommand,
    marketCommand: MarketCommand,
    riskInputHandler: RiskInputHandler,
    weatherCommand: WeatherCommand,
    prayerCommand: PrayerCommand,
    chartCommand: ChartCommand,
    stickerCommand: StickerCommand,
    sentimentCommand: SentimentCommand,
    alertCommand: AlertCommand,
    reminderCommand: ReminderCommand,
    buyCommand: BuyCommand,
    sellCommand: SellCommand,
    aestheticCommand?: AestheticCommand,
  ) {
    this.animeCommand = animeCommand;
    this.lyricsCommand = lyricsCommand;
    this.movieCommand = movieCommand;
    this.marketCommand = marketCommand;
    this.riskInputHandler = riskInputHandler;
    this.weatherCommand = weatherCommand;
    this.prayerCommand = prayerCommand;
    this.chartCommand = chartCommand;
    this.stickerCommand = stickerCommand;
    this.sentimentCommand = sentimentCommand;
    this.alertCommand = alertCommand;
    this.reminderCommand = reminderCommand;
    this.buyCommand = buyCommand;
    this.sellCommand = sellCommand;
    this.geoGuessrService = new GeoGuessrService();
    this.aiService = new AiService();
    this.aestheticCommand = aestheticCommand ?? null;
  }

  /**
   * Check if this handler should process the message
   * Returns true if user has active session and text is not a command
   */
  shouldHandle(msg: TelegramBot.Message): boolean {
    if (!msg.text || msg.text.startsWith("/")) return false;

    // Check specific flows that expect text input
    const state = sessionManager.getState(msg.chat.id);
    if (!state) return false;

    return (
      state.flow === SESSION_FLOWS.LOCATION ||
      state.flow === SESSION_FLOWS.LYRICS ||
      state.flow === SESSION_FLOWS.ANIME ||
      state.flow === SESSION_FLOWS.MOVIE ||
      state.flow === SESSION_FLOWS.MARKET_HUB ||
      state.flow === SESSION_FLOWS.RISK ||
      state.flow === SESSION_FLOWS.WEATHER_MENU ||
      state.flow === SESSION_FLOWS.PRAYER_MENU ||
      state.flow === SESSION_FLOWS.CHART ||
      state.flow === SESSION_FLOWS.STICKER ||
      state.flow === SESSION_FLOWS.SENTIMENT ||
      state.flow === SESSION_FLOWS.ALERT ||
      state.flow === SESSION_FLOWS.REMINDER ||
      state.flow === SESSION_FLOWS.BUY_WIZARD ||
      state.flow === SESSION_FLOWS.SELL_WIZARD ||
      state.flow === SESSION_FLOWS.GEOGUESSR ||
      state.flow === SESSION_FLOWS.AI_CHAT ||
      state.flow === SESSION_FLOWS.MOODBOARD
    );
  }

  /**
   * Handle the message based on session state
   */
  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text ?? "";
    const state = sessionManager.getState(chatId);

    if (!state) return;

    // Handle location text input for weather/prayer commands
    if (state.flow === SESSION_FLOWS.LOCATION) {
      const pendingCommand = state.data?.pendingCommand;
      if (pendingCommand === "weather") {
        sessionManager.clearState(chatId);
        await this.weatherCommand.fetchAndSendWeather(bot, chatId, text);
        return;
      } else if (pendingCommand === "prayer") {
        sessionManager.clearState(chatId);
        await this.prayerCommand.fetchAndSendPrayerTimes(bot, chatId, text);
        return;
      }
    }

    // Route based on flow type
    if (state.flow === SESSION_FLOWS.LYRICS) {
      sessionManager.clearState(chatId);
      const lyricsMatch = ["/lirik " + text, text] as RegExpMatchArray;
      await this.lyricsCommand.execute(bot, msg, lyricsMatch);
    } else if (state.flow === SESSION_FLOWS.ANIME) {
      sessionManager.clearState(chatId);
      const animeMatch = ["/anime " + text, text] as RegExpMatchArray;
      await this.animeCommand.execute(bot, msg, animeMatch);
    } else if (isMovieSession(state)) {
      sessionManager.clearState(chatId);
      const movieMatch = ["/film " + text, text] as RegExpMatchArray;
      await this.movieCommand.execute(bot, msg, movieMatch);
    } else if (isMarketHubSession(state)) {
      if (state.step === "symbol_input") {
        const symbol = text.toUpperCase().trim();
        const messageId = state.data.messageId;
        try {
          await bot.deleteMessage(chatId, msg.message_id);
        } catch {
          // Ignore
        }
        await this.marketCommand.showDashboard(bot, chatId, symbol, messageId);
      }
    } else if (state.flow === SESSION_FLOWS.RISK) {
      await this.riskInputHandler.handle(bot, msg, state);
    } else if (isWeatherMenuSession(state)) {
      // Don't clear session yet - let the command know it came from menu
      await this.weatherCommand.fetchAndSendWeather(bot, chatId, text);
      sessionManager.clearState(chatId);
    } else if (isPrayerMenuSession(state)) {
      // Don't clear session yet - let the command know it came from menu
      await this.prayerCommand.fetchAndSendPrayerTimes(bot, chatId, text);
      sessionManager.clearState(chatId);
    } else if (state.flow === SESSION_FLOWS.CHART) {
      sessionManager.clearState(chatId);
      // Chart expects: /chart [symbol] [timeframe]
      // User input could be "BTC 1h" or just "BTC"
      // Match regex: /^\/chart(?:\s+(\w+)(?:\s+(\w+))?)?$/
      // match[1] = symbol, match[2] = timeframe
      const parts = text.split(/\s+/);
      const symbol = parts[0];
      const timeframe = parts[1];
      const chartMatch = ["/chart " + text, symbol, timeframe] as RegExpMatchArray;
      await this.chartCommand.execute(bot, msg, chartMatch);
    } else if (state.flow === SESSION_FLOWS.STICKER) {
      const userId = msg.from?.id;
      if (!userId) return;

      // Handle sticker text input
      if (state.step === "awaiting_text") {
        await this.stickerCommand.processTextInput(bot, chatId, userId, text);
      } else {
        // Fallback for legacy "input" step
        sessionManager.clearState(chatId);
        const stickerMatch = ["/stiker " + text, text] as RegExpMatchArray;
        await this.stickerCommand.execute(bot, msg, stickerMatch);
      }
    } else if (state.flow === SESSION_FLOWS.SENTIMENT) {
      sessionManager.clearState(chatId);
      const sentimentMatch = ["/sentimen " + text, text] as RegExpMatchArray;
      await this.sentimentCommand.execute(bot, msg, sentimentMatch);
    } else if (state.flow === SESSION_FLOWS.ALERT) {
      sessionManager.clearState(chatId);
      // Alert expects: /alert [symbol] [price] [condition]
      // match[1]=symbol, match[2]=price, match[3]=condition
      const parts = text.split(/\s+/);
      const alertMatch = ["/alert " + text, parts[0], parts[1], parts[2]] as RegExpMatchArray;
      await this.alertCommand.execute(bot, msg, alertMatch);
    } else if (state.flow === SESSION_FLOWS.REMINDER) {
      sessionManager.clearState(chatId);
      // Reminder expects: /ingatkan [time] [message]
      // match[1]=time, match[2]=message
      // User input: "07:00 Bangun" -> parts=["07:00", "Bangun"]
      // But message can have spaces.
      // match[1] = first word, match[2] = rest of string.
      const firstSpace = text.indexOf(" ");
      if (firstSpace === -1) {
        // Only one word, likely invalid, but let command handle it
        const reminderMatch = ["/ingatkan " + text, text, undefined] as unknown as RegExpMatchArray;
        await this.reminderCommand.execute(bot, msg, reminderMatch);
      } else {
        const time = text.substring(0, firstSpace);
        const reminderMsg = text.substring(firstSpace + 1);
        const reminderMatch = ["/ingatkan " + text, time, reminderMsg] as RegExpMatchArray;
        await this.reminderCommand.execute(bot, msg, reminderMatch);
      }
    } else if (state.flow === SESSION_FLOWS.BUY_WIZARD) {
      sessionManager.clearState(chatId);
      // Buy expects: /buy [symbol] [qty]
      // User input: "BTC 0.1"
      const parts = text.split(/\s+/);
      const match = ["/buy " + text, parts[0], parts[1]] as RegExpMatchArray;
      await this.buyCommand.execute(bot, msg, match);
    } else if (state.flow === SESSION_FLOWS.SELL_WIZARD) {
      sessionManager.clearState(chatId);
      // Sell expects: /sell [symbol] [qty]
      const parts = text.split(/\s+/);
      const match = ["/sell " + text, parts[0], parts[1]] as RegExpMatchArray;
      await this.sellCommand.execute(bot, msg, match);
    } else if (state.flow === SESSION_FLOWS.GEOGUESSR) {
      // Handle GeoGuessr guess
      if (state.step === "guessing") {
        const data = state.data;
        data.attempts += 1;

        // Check answer using fuzzy matching
        const answerKey = {
          country: data.targetCountry,
          state: data.targetState,
          city: data.targetCity,
          formattedAddress: data.formattedAddress,
        };

        const result = this.geoGuessrService.matchAnswer(text, answerKey);

        if (result.match) {
          // Correct answer!
          let responseMessage = "";

          if (result.level === "city") {
            responseMessage = MESSAGES.GEOGUESSR_CORRECT_CITY(
              data.targetCity || "",
              data.targetCountry,
              result.points || 10,
            );
          } else if (result.level === "state") {
            responseMessage = MESSAGES.GEOGUESSR_CORRECT_STATE(
              data.targetState || "",
              data.targetCountry,
              result.points || 5,
            );
          } else if (result.level === "country") {
            responseMessage = MESSAGES.GEOGUESSR_CORRECT_COUNTRY(data.targetCountry, result.points || 2);
          }

          await bot.sendMessage(chatId, responseMessage, { parse_mode: "Markdown" });

          // Clear session
          sessionManager.clearState(chatId);
        } else {
          // Wrong answer
          await bot.sendMessage(chatId, MESSAGES.GEOGUESSR_WRONG(data.attempts), { parse_mode: "Markdown" });

          // Update attempts count in session
          sessionManager.setState(chatId, {
            ...state,
            data: {
              ...data,
              attempts: data.attempts,
            },
          });
        }
      }
    } else if (state.flow === SESSION_FLOWS.MOODBOARD && this.aestheticCommand) {
      // Handle moodboard keyword input
      sessionManager.clearState(chatId);
      const moodboardMatch = ["/moodboard " + text, "moodboard", text] as RegExpMatchArray;
      await this.aestheticCommand.execute(bot, msg, moodboardMatch);
    } else if (state.flow === SESSION_FLOWS.AI_CHAT) {
      // Handle AI Chat
      if (state.step === "chatting") {
        try {
          // Show typing indicator
          await withLoading(
            bot,
            chatId,
            async () => {
              // Get AI response with conversation history
              const response = await this.aiService.chatWithContext(text, state.data.history);

              // Save user message to history
              sessionManager.updateAiChatHistory(chatId, "user", text);

              // Save AI response to history
              sessionManager.updateAiChatHistory(chatId, "model", response);

              // Send response to user (plain text, not Markdown - AI content may have unescaped special chars)
              await bot.sendMessage(chatId, response);
            },
            "typing",
          );
        } catch (error) {
          console.error("[SessionInputHandler] AI Chat error:", error);
          const errorMessage = error instanceof Error ? error.message : MESSAGES.AI_ERROR;
          await bot.sendMessage(chatId, errorMessage);
        }
      }
    }
  }
}
