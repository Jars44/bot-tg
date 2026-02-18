import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import { MESSAGES } from "../config/messages.js";

export class StartCommand implements Command {
  pattern = /^\/start$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    await bot.sendMessage(msg.chat.id, MESSAGES.WELCOME);
  }
}

export class StopCommand implements Command {
  pattern = /^\/stop$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    await bot.sendMessage(msg.chat.id, MESSAGES.GOODBYE);
  }
}
