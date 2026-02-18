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
      await withLoading(
        bot,
        chatId,
        async () => {
          try {
            const location = this.geoGuessrService.generateRandomLocation();

            const answerKey = await this.geoGuessrService.getAnswerKey(location.lat, location.lng);

            const locationMessage = await bot.sendLocation(chatId, location.lat, location.lng);

            const promptMessage = await bot.sendMessage(chatId, MESSAGES.GEOGUESSR_PROMPT, {
              parse_mode: "Markdown",
              reply_to_message_id: locationMessage.message_id,
            });

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
          } catch (innerError) {
            console.error("[GeoGuessrCommand] Inner error:", innerError);
            const errorMsg = innerError instanceof Error ? innerError.message : String(innerError);

            if (errorMsg.includes("Failed to fetch location data")) {
              await bot.sendMessage(chatId, MESSAGES.GEOGUESSR_ERROR_API);
            } else if (errorMsg.includes("No data available")) {
              await bot.sendMessage(chatId, MESSAGES.GEOGUESSR_ERROR_LOCATION);
            } else {
              await bot.sendMessage(chatId, MESSAGES.GEOGUESSR_ERROR);
            }
          }
        },
        "find_location",
      );
    } catch (error) {
      console.error("[GeoGuessrCommand] Error:", error);
      await bot.sendMessage(chatId, MESSAGES.GEOGUESSR_ERROR);
    }
  }
}

export class GiveUpCommand implements Command {
  pattern = /^\/nyerah$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
      const state = sessionManager.getState(chatId);

      if (!state || state.flow !== SESSION_FLOWS.GEOGUESSR) {
        await bot.sendMessage(chatId, MESSAGES.GEOGUESSR_NO_ACTIVE_GAME);
        return;
      }

      try {
        const data = state.data;

        const answerMessage = MESSAGES.GEOGUESSR_GIVE_UP(
          data.targetCity,
          data.targetState,
          data.targetCountry,
          data.formattedAddress,
        );

        await bot.sendMessage(chatId, answerMessage, { parse_mode: "Markdown" });
      } catch (revealError) {
        console.error("[GiveUpCommand] Error during answer reveal:", revealError);
        await bot.sendMessage(chatId, MESSAGES.GEOGUESSR_ERROR_LOCATION);
      }

      sessionManager.clearState(chatId);
    } catch (error) {
      console.error("[GiveUpCommand] Error:", error);
      await bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
    }
  }
}
