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

  shouldHandle(msg: TelegramBot.Message): boolean {
    if (!msg.text || msg.text.startsWith("/")) return false;

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

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text ?? "";
    const state = sessionManager.getState(chatId);

    if (!state) return;

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
          /* empty */
        }
        await this.marketCommand.showDashboard(bot, chatId, symbol, messageId);
      }
    } else if (state.flow === SESSION_FLOWS.RISK) {
      await this.riskInputHandler.handle(bot, msg, state);
    } else if (isWeatherMenuSession(state)) {
      await this.weatherCommand.fetchAndSendWeather(bot, chatId, text);
      sessionManager.clearState(chatId);
    } else if (isPrayerMenuSession(state)) {
      await this.prayerCommand.fetchAndSendPrayerTimes(bot, chatId, text);
      sessionManager.clearState(chatId);
    } else if (state.flow === SESSION_FLOWS.CHART) {
      sessionManager.clearState(chatId);
      const parts = text.split(/\s+/);
      const symbol = parts[0];
      const timeframe = parts[1];
      const chartMatch = ["/chart " + text, symbol, timeframe] as RegExpMatchArray;
      await this.chartCommand.execute(bot, msg, chartMatch);
    } else if (state.flow === SESSION_FLOWS.STICKER) {
      const userId = msg.from?.id;
      if (!userId) return;

      if (state.step === "awaiting_text") {
        await this.stickerCommand.processTextInput(bot, chatId, userId, text);
      } else {
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
      const parts = text.split(/\s+/);
      const alertMatch = ["/alert " + text, parts[0], parts[1], parts[2]] as RegExpMatchArray;
      await this.alertCommand.execute(bot, msg, alertMatch);
    } else if (state.flow === SESSION_FLOWS.REMINDER) {
      sessionManager.clearState(chatId);
      const firstSpace = text.indexOf(" ");
      if (firstSpace === -1) {
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
      const parts = text.split(/\s+/);
      const match = ["/buy " + text, parts[0], parts[1]] as RegExpMatchArray;
      await this.buyCommand.execute(bot, msg, match);
    } else if (state.flow === SESSION_FLOWS.SELL_WIZARD) {
      sessionManager.clearState(chatId);
      const parts = text.split(/\s+/);
      const match = ["/sell " + text, parts[0], parts[1]] as RegExpMatchArray;
      await this.sellCommand.execute(bot, msg, match);
    } else if (state.flow === SESSION_FLOWS.GEOGUESSR) {
      if (state.step === "guessing") {
        const data = state.data;
        data.attempts += 1;

        const answerKey = {
          country: data.targetCountry,
          state: data.targetState,
          city: data.targetCity,
          formattedAddress: data.formattedAddress,
        };

        const result = this.geoGuessrService.matchAnswer(text, answerKey);

        if (result.match) {
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

          sessionManager.clearState(chatId);
        } else {
          await bot.sendMessage(chatId, MESSAGES.GEOGUESSR_WRONG(data.attempts), { parse_mode: "Markdown" });

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
      sessionManager.clearState(chatId);
      const moodboardMatch = ["/moodboard " + text, "moodboard", text] as RegExpMatchArray;
      await this.aestheticCommand.execute(bot, msg, moodboardMatch);
    } else if (state.flow === SESSION_FLOWS.AI_CHAT) {
      if (state.step === "chatting") {
        try {
          await withLoading(
            bot,
            chatId,
            async () => {
              const response = await this.aiService.chatWithContext(text, state.data.history);

              sessionManager.updateAiChatHistory(chatId, "user", text);

              sessionManager.updateAiChatHistory(chatId, "model", response);

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
