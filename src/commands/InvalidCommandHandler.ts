import TelegramBot from "node-telegram-bot-api";
import type { MessageHandler } from "./types.js";
import { MESSAGES } from "../config/messages.js";

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
    return text.startsWith("/");
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text ?? "";

    const commandMatch = text.match(/^\/([a-zA-Z0-9_]+)/);
    if (!commandMatch) return;

    const typed = commandMatch[1].toLowerCase();

    if (VALID_COMMANDS.includes(typed)) return;

    const partialMatch = VALID_COMMANDS.find((cmd) => cmd.startsWith(typed) && cmd !== typed);

    if (partialMatch) {
      await bot.sendMessage(chatId, MESSAGES.INCOMPLETE_COMMAND(typed));
    } else {
      const errorMsg = `${MESSAGES.UNKNOWN_COMMAND}`;
      await bot.sendMessage(chatId, errorMsg);
    }
  }
}
