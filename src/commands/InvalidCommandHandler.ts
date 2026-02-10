/**
 * Invalid command handler
 */

import TelegramBot from "node-telegram-bot-api";
import type { MessageHandler } from "./types.js";
import { MESSAGES } from "../config/messages.js";

/** Valid command patterns - Must match patterns in index.ts command registration */
const VALID_COMMAND_PATTERNS = [
  // Core commands
  /^\/start/,
  /^\/stop/,
  /^\/help/,
  /^\/menu/,

  // Utility commands
  /^\/lirik/,
  /^\/quote/,
  /^\/anime/,
  /^\/cuaca/,
  /^\/berita/,
  /^\/sholat/,
  /^\/gempa/,
  /^\/ingatkan/,
  /^\/download/,
  /^\/film/,
  /^\/stiker/,

  // Financial commands
  /^\/chart/,
  /^\/portfolio/,
  /^\/catat/,
  /^\/buy/,
  /^\/sell/,
  /^\/close/,
  /^\/alert/,
  /^\/risk/,
  /^\/rekap/,
  /^\/laporan/,
  /^\/market/,
  /^\/calendar/,
  /^\/highimpact/,
  /^\/sentimen/,
];

export class InvalidCommandHandler implements MessageHandler {
  shouldHandle(msg: TelegramBot.Message): boolean {
    const text = msg.text ?? "";

    // Only handle messages starting with /
    if (!text.startsWith("/")) {
      return false;
    }

    // Check if this message matches ANY registered command pattern
    const matchesValidPattern = VALID_COMMAND_PATTERNS.some((pattern) => pattern.test(text));

    // If it matches a valid pattern, let the command handler deal with it
    // (including cases where the command needs arguments)
    if (matchesValidPattern) {
      return false;
    }

    // Only handle truly invalid commands
    return true;
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, MESSAGES.UNKNOWN_COMMAND);
  }
}
