/**
 * Help command
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { MESSAGES } from "../config/messages.js";

export class HelpCommand implements Command {
  pattern = /^\/help$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    await bot.sendMessage(msg.chat.id, MESSAGES.HELP_TEXT);
  }
}
