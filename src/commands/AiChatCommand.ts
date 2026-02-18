import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { MESSAGES } from "../config/messages.js";
import { sessionManager, SESSION_FLOWS } from "../utils/SessionManager.js";

export class AiStartCommand implements Command {
  pattern = /^\/(ai|chat)$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
      sessionManager.startAiChat(chatId);

      await bot.sendMessage(chatId, MESSAGES.AI_MODE_ACTIVATED, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("[AiStartCommand] Error:", error);
      await bot.sendMessage(chatId, MESSAGES.AI_ACTIVATE_ERROR);
    }
  }
}

export class AiStopCommand implements Command {
  pattern = /^\/(exit|stopai)$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
      const state = sessionManager.getState(chatId);

      if (!state || state.flow !== SESSION_FLOWS.AI_CHAT) {
        await bot.sendMessage(chatId, MESSAGES.AI_NO_ACTIVE_SESSION);
        return;
      }

      sessionManager.clearState(chatId);

      await bot.sendMessage(chatId, MESSAGES.AI_MODE_DEACTIVATED, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("[AiStopCommand] Error:", error);
      await bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
    }
  }
}
