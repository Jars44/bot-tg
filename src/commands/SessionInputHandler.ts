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
      state.flow === SESSION_FLOWS.SELL_WIZARD
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
      sessionManager.clearState(chatId);
      await this.weatherCommand.fetchAndSendWeather(bot, chatId, text);
    } else if (isPrayerMenuSession(state)) {
      sessionManager.clearState(chatId);
      await this.prayerCommand.fetchAndSendPrayerTimes(bot, chatId, text);
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
    }
  }
}
