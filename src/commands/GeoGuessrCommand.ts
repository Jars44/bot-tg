/**
 * GeoGuessr Command
 * Location guessing mini-game
 * Distribution: 60% Indonesia, 40% World
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { GeoGuessrService } from "../services/GeoGuessrService.js";
import { MESSAGES } from "../config/messages.js";
import { sessionManager, SESSION_FLOWS } from "../utils/SessionManager.js";
import { withLoading } from "../utils/uiHelper.js";

export class GeoGuessrCommand implements Command {
  pattern = /^\/geoguessr$/;
  private geoGuessrService: GeoGuessrService;

  constructor() {
    this.geoGuessrService = new GeoGuessrService();
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
      // Show loading state
      await withLoading(
        bot,
        chatId,
        async () => {
          // Generate random location
          const location = this.geoGuessrService.generateRandomLocation();

          // Get answer key via reverse geocoding
          const answerKey = await this.geoGuessrService.getAnswerKey(location.lat, location.lng);

          // Send location pin
          const locationMessage = await bot.sendLocation(chatId, location.lat, location.lng);

          // Send prompt
          const promptMessage = await bot.sendMessage(chatId, MESSAGES.GEOGUESSR_PROMPT, {
            parse_mode: "Markdown",
            reply_to_message_id: locationMessage.message_id,
          });

          // Start session with answer key
          sessionManager.setState(chatId, {
            flow: SESSION_FLOWS.GEOGUESSR,
            step: "guessing",
            data: {
              targetCountry: answerKey.country,
              targetState: answerKey.state,
              targetCity: answerKey.city,
              formattedAddress: answerKey.formattedAddress,
              lat: location.lat,
              lng: location.lng,
              attempts: 0,
              messageId: promptMessage.message_id,
              score: 0,
            },
          });
        },
        "find_location",
      );
    } catch (error) {
      console.error("[GeoGuessrCommand] Error:", error);
      await bot.sendMessage(chatId, MESSAGES.GEOGUESSR_ERROR);
    }
  }
}

/**
 * Give Up Command Handler
 * Reveals the answer and ends the current game
 */
export class GiveUpCommand implements Command {
  pattern = /^\/nyerah$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const state = sessionManager.getState(chatId);

    // Check if there's an active GeoGuessr game
    if (!state || state.flow !== SESSION_FLOWS.GEOGUESSR) {
      await bot.sendMessage(chatId, MESSAGES.GEOGUESSR_NO_ACTIVE_GAME);
      return;
    }

    const data = state.data;

    // Reveal answer
    const answerMessage = MESSAGES.GEOGUESSR_GIVE_UP(
      data.targetCity,
      data.targetState,
      data.targetCountry,
      data.formattedAddress,
    );

    await bot.sendMessage(chatId, answerMessage, { parse_mode: "Markdown" });

    // Clear session
    sessionManager.clearState(chatId);
  }
}
