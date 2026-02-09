/**
 * Invalid command handler
 */

import TelegramBot from "node-telegram-bot-api";
import type { MessageHandler } from "./types.js";
import { MESSAGES } from "../config/messages.js";

/** Valid command patterns */
const VALID_COMMANDS = [
  /^\/lirik/,
  /^\/quote/,
  /^\/anime/,
  /^\/cuaca/,
  /^\/berita/,
  /^\/sholat/,
  /^\/gempa/,
  /^\/help/,
  /^\/start/,
  /^\/stop/,
  /^\/ingatkan/,
  /^\/download/,
  /^\/film/,
  /^\/stiker/,
  /^\/menu/,
  /^\/chart/,
  /^\/portfolio/,
  /^\/catat/,
  /^\/buy/,
  /^\/sell/,
  /^\/alert/,
  /^\/risk/,
  /^\/rekap/,
  /^\/laporan/,
  /^\/market/,
  /^\/calendar/,
  /^\/sentimen/,
  /^\/close/,
  /^\/highimpact/,
];

/** Commands that require arguments */
const INCOMPLETE_COMMANDS = [/^\/sholat$/, /^\/anime$/, /^\/lirik$/, /^\/ingatkan$/, /^\/film$/, /^\/stiker$/];

export class InvalidCommandHandler implements MessageHandler {
  shouldHandle(msg: TelegramBot.Message): boolean {
    const text = msg.text?.toLowerCase() ?? "";

    // Only handle messages starting with /
    if (!text.startsWith("/")) {
      return false;
    }

    // Check for incomplete commands
    const isIncomplete = INCOMPLETE_COMMANDS.some((cmd) => cmd.test(text));
    if (isIncomplete) {
      return true;
    }

    // Check for invalid commands
    const isValid = VALID_COMMANDS.some((cmd) => cmd.test(text));
    return !isValid;
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text?.toLowerCase() ?? "";

    // Check if it's an incomplete command
    const isIncomplete = INCOMPLETE_COMMANDS.some((cmd) => cmd.test(text));

    if (isIncomplete) {
      await bot.sendMessage(chatId, MESSAGES.INVALID_FORMAT);
    } else {
      await bot.sendMessage(chatId, MESSAGES.UNKNOWN_COMMAND);
    }
  }
}
