/**
 * AI Chat Commands
 * Start and stop AI conversational mode using Google Gemini
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { MESSAGES } from "../config/messages.js";
import { sessionManager, SESSION_FLOWS } from "../utils/SessionManager.js";

/**
 * Start AI Chat Mode
 * Triggers: /ai or /chat
 */
export class AiStartCommand implements Command {
  pattern = /^\/(ai|chat)$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
      // Start AI chat session
      sessionManager.startAiChat(chatId);

      // Send activation message
      await bot.sendMessage(chatId, MESSAGES.AI_MODE_ACTIVATED, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("[AiStartCommand] Error:", error);
      await bot.sendMessage(chatId, MESSAGES.AI_ACTIVATE_ERROR);
    }
  }
}

/**
 * Stop AI Chat Mode
 * Triggers: /exit or /stopai
 */
export class AiStopCommand implements Command {
  pattern = /^\/(exit|stopai)$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
      const state = sessionManager.getState(chatId);

      // Check if user is in AI chat mode
      if (!state || state.flow !== SESSION_FLOWS.AI_CHAT) {
        await bot.sendMessage(chatId, MESSAGES.AI_NO_ACTIVE_SESSION);
        return;
      }

      // Clear session
      sessionManager.clearState(chatId);

      // Send deactivation message
      await bot.sendMessage(chatId, MESSAGES.AI_MODE_DEACTIVATED, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("[AiStopCommand] Error:", error);
      await bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
    }
  }
}
