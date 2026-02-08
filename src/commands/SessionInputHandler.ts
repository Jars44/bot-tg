/**
 * Session Input Handler
 * Handles generic text inputs for interactive flows
 * UX Improvement: Routes input to appropriate commands based on active session state
 */

import TelegramBot from "node-telegram-bot-api";
import type { MessageHandler } from "./types.js";
import { sessionManager, isMarketHubSession } from "../utils/SessionManager.js";
import { WeatherCommand } from "./WeatherCommand.js";
import { PrayerCommand } from "./PrayerCommand.js";
import { AnimeCommand } from "./AnimeCommand.js";
import { LyricsCommand } from "./LyricsCommand.js";
import { MarketCommand } from "./MarketCommand.js";
import { RiskInputHandler } from "./RiskCommand.js";

/**
 * Handles text input during active sessions (e.g. asking for location, song title)
 */
export class SessionInputHandler implements MessageHandler {
  private weatherCommand: WeatherCommand;
  private prayerCommand: PrayerCommand;
  private animeCommand: AnimeCommand;
  private lyricsCommand: LyricsCommand;
  private marketCommand: MarketCommand;
  private riskInputHandler: RiskInputHandler;

  constructor(
    weatherCommand: WeatherCommand,
    prayerCommand: PrayerCommand,
    animeCommand: AnimeCommand,
    lyricsCommand: LyricsCommand,
    marketCommand: MarketCommand,
    riskInputHandler: RiskInputHandler,
  ) {
    this.weatherCommand = weatherCommand;
    this.prayerCommand = prayerCommand;
    this.animeCommand = animeCommand;
    this.lyricsCommand = lyricsCommand;
    this.marketCommand = marketCommand;
    this.riskInputHandler = riskInputHandler;
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
      state.flow === "location" ||
      state.flow === "lyrics" ||
      state.flow === "anime" ||
      state.flow === "market_hub" ||
      state.flow === "risk"
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
    if (state.flow === "location") {
      const command = state.data.command;

      // Clear session before executing command
      sessionManager.clearState(chatId);

      // Create mock match array [full_match, capture_group_1]
      const match = ["/" + command + " " + text, text] as RegExpMatchArray;

      if (command === "weather") {
        await this.weatherCommand.execute(bot, msg, match);
      } else if (command === "prayer") {
        await this.prayerCommand.execute(bot, msg, match);
      }
    } else if (state.flow === "lyrics") {
      // Clear session
      sessionManager.clearState(chatId);

      // Create mock match array
      const match = ["/lirik " + text, text] as RegExpMatchArray;

      await this.lyricsCommand.execute(bot, msg, match);
    } else if (state.flow === "anime") {
      // If user types new search while selecting, treat as new search
      sessionManager.clearState(chatId);
      const match = ["/anime " + text, text] as RegExpMatchArray;
      await this.animeCommand.execute(bot, msg, match);
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
      await this.riskInputHandler.handle(bot, msg);
    }
  }
}
