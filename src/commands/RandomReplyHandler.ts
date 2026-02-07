/**
 * Random reply handler for insults and gibberish text
 * Contains CRITICAL BUG FIX for array indexing
 */

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import type { MessageHandler } from "./types.js";
import { StickerService } from "../services/StickerService.js";
import { MESSAGES, INSULT_WORDS } from "../config/messages.js";

/** Sticker asset filenames */
const STICKER_OPTIONS = ["stk1.webm", "stk2.webm", "stk3.webm"] as const;

export class RandomReplyHandler implements MessageHandler {
  private stickerService: StickerService;

  constructor(stickerService: StickerService) {
    this.stickerService = stickerService;
  }

  /**
   * Check if text looks like random/gibberish
   */
  private isRandomText(text: string): boolean {
    return (
      text.length >= 4 &&
      !text.includes(" ") &&
      !/^[0-9]+$/.test(text) &&
      (/[a-z]{6,}/i.test(text) || /(.)\\1{3,}/.test(text))
    );
  }

  /**
   * Check if text contains insults
   */
  private containsInsult(text: string): boolean {
    const lowerText = text.toLowerCase();
    return INSULT_WORDS.some((word) => lowerText.includes(word));
  }

  shouldHandle(msg: TelegramBot.Message): boolean {
    const text = msg.text?.toLowerCase() ?? "";

    // Skip commands and URLs
    if (text.startsWith("/") || text.startsWith("https")) {
      return false;
    }

    return this.isRandomText(text) || this.containsInsult(text);
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    // Generate random number 0-4
    const randomNum = Math.floor(Math.random() * 5);

    if (randomNum < 2) {
      // Text reply (index 0 or 1)
      await bot.sendMessage(chatId, MESSAGES.RANDOM_REPLIES[randomNum]);
    } else {
      // Sticker reply (index 2, 3, or 4)
      // BUG FIX: Changed from `randomNum - 3` to `randomNum - 2`
      // Old: randomNum=2 → index=-1 (INVALID, causes crash!)
      // New: randomNum=2 → index=0, randomNum=3 → index=1, randomNum=4 → index=2
      const stickerIndex = randomNum - 2; // FIXED!

      const stickerPath = this.stickerService.getStickerAssetPath(STICKER_OPTIONS[stickerIndex]);

      try {
        const sticker = fs.readFileSync(stickerPath);
        await bot.sendSticker(chatId, sticker);
      } catch (err) {
        console.error("[RandomReplyHandler] Failed to send sticker:", err);
      }
    }
  }
}
