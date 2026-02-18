/**
 * Invalid command handler
 * Handles /unknown and /incomplete commands
 */

import TelegramBot from "node-telegram-bot-api";
import type { MessageHandler } from "./types.js";
import { MESSAGES } from "../config/messages.js";

/**
 * Valid command base names (without leading slash).
 * Must match all commands registered in index.ts.
 */
const VALID_COMMANDS = [
  "start",
  "stop",
  "help",
  "menu",
  "lirik",
  "quote",
  "anime",
  "cuaca",
  "berita",
  "sholat",
  "gempa",
  "ingatkan",
  "download",
  "film",
  "stiker",
  "chart",
  "portfolio",
  "catat",
  "buy",
  "sell",
  "close",
  "alert",
  "risk",
  "rekap",
  "laporan",
  "market",
  "calendar",
  "highimpact",
  "sentimen",
  "ai",
  "chat",
  "exit",
  "stopai",
  "geoguessr",
  "nyerah",
  // Lifestyle Suite
  "vibe",
  "moodboard",
  "aesthetic",
  "hunt",
  "brainstorm",
  "idea",
  "lore",
];

export class InvalidCommandHandler implements MessageHandler {
  shouldHandle(msg: TelegramBot.Message): boolean {
    const text = msg.text ?? "";
    // Only handle messages that start with /
    return text.startsWith("/");
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text ?? "";

    // Extract the typed command word (no slash, no args)
    const commandMatch = text.match(/^\/([a-zA-Z0-9_]+)/);
    if (!commandMatch) return;

    const typed = commandMatch[1].toLowerCase();

    // Exact match → valid command (should never reach here normally, but guard anyway)
    if (VALID_COMMANDS.includes(typed)) return;

    // Check if the typed string is a prefix of any valid command
    // e.g. "/cuac" is a prefix of "cuaca"
    const partialMatch = VALID_COMMANDS.find((cmd) => cmd.startsWith(typed) && cmd !== typed);

    if (partialMatch) {
      await bot.sendMessage(chatId, MESSAGES.INCOMPLETE_COMMAND(typed));
    } else {
      const errorMsg = `${MESSAGES.UNKNOWN_COMMAND}`;
      await bot.sendMessage(chatId, errorMsg);
    }
  }
}
