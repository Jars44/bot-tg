/**
 * Session Input Handler
 * Handles generic text inputs for interactive flows
 * UX Improvement: Routes input to appropriate commands based on active session state
 */

import TelegramBot from "node-telegram-bot-api";
import type { MessageHandler } from "./types.js";
import {
  sessionManager,
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

  constructor(
    animeCommand: AnimeCommand,
    lyricsCommand: LyricsCommand,
    movieCommand: MovieCommand,
    marketCommand: MarketCommand,
    riskInputHandler: RiskInputHandler,
    weatherCommand: WeatherCommand,
    prayerCommand: PrayerCommand,
  ) {
    this.animeCommand = animeCommand;
    this.lyricsCommand = lyricsCommand;
    this.movieCommand = movieCommand;
    this.marketCommand = marketCommand;
    this.riskInputHandler = riskInputHandler;
    this.weatherCommand = weatherCommand;
    this.prayerCommand = prayerCommand;
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
      state.flow === "lyrics" ||
      state.flow === "anime" ||
      state.flow === "movie" ||
      state.flow === "market_hub" ||
      state.flow === "risk" ||
      state.flow === "weather_menu" ||
      state.flow === "prayer_menu"
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
    if (state.flow === "lyrics") {
      // Clear session
      sessionManager.clearState(chatId);

      // Create mock match array
      const lyricsMatch = ["/lirik " + text, text] as RegExpMatchArray;

      await this.lyricsCommand.execute(bot, msg, lyricsMatch);
    } else if (state.flow === "anime") {
      // Clear session and search for anime
      sessionManager.clearState(chatId);
      const animeMatch = ["/anime " + text, text] as RegExpMatchArray;
      await this.animeCommand.execute(bot, msg, animeMatch);
    } else if (isMovieSession(state)) {
      // UX Fix: Handle movie search input
      sessionManager.clearState(chatId);
      const movieMatch = ["/film " + text, text] as RegExpMatchArray;
      await this.movieCommand.execute(bot, msg, movieMatch);
    } else if (isMarketHubSession(state)) {
      // UX Improvement: Handle symbol input for Market Hub
      if (state.step === "symbol_input") {
        const symbol = text.toUpperCase().trim();
        const messageId = state.data.messageId;

        // Delete user's input message to keep chat clean
        try {
          await bot.deleteMessage(chatId, msg.message_id);
        } catch {
          // Ignore if can't delete
        }

        // Show dashboard for entered symbol
        await this.marketCommand.showDashboard(bot, chatId, symbol, messageId);
      }
    } else if (state.flow === "risk") {
      // UX Improvement: Delegate to RiskInputHandler for custom numeric input
      await this.riskInputHandler.handle(bot, msg, state);
    } else if (isWeatherMenuSession(state)) {
      // UX Wizard: Weather from menu
      sessionManager.clearState(chatId);
      await this.weatherCommand.fetchAndSendWeather(bot, chatId, text);
    } else if (isPrayerMenuSession(state)) {
      // UX Wizard: Prayer from menu
      sessionManager.clearState(chatId);
      await this.prayerCommand.fetchAndSendPrayerTimes(bot, chatId, text);
    }
  }
}
