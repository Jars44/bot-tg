/**
 * Random reply handler for insults and gibberish text
 * Contains CRITICAL BUG FIX for array indexing
 */

import TelegramBot from "node-telegram-bot-api";

import type { MessageHandler } from "./types.js";
import { StickerService } from "../services/StickerService.js";
import { sessionManager } from "../utils/SessionManager.js";

/** Sticker asset filenames */
const STICKER_OPTIONS = ["stk1.webm", "stk2.webm", "stk3.webm"] as const;

/** Insult words for random reply detection */
const INSULT_WORDS = [
  "bego",
  "goblok",
  "tolol",
  "anjing",
  "bangsat",
  "babi",
  "kontol",
  "memek",
  "asu",
  "jancok",
  "pukimak",
  "bajingan",
  "brengsek",
  "dongok",
  "cok",
  "bodo",
  "bodoh",
  "gak jelas",
  "gajelas",
  "gaje",
  "gk jelas",
  "dongo",
  "dongok",
] as const;

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
      (/[a-z]{6,}/i.test(text) || /(.)\1{3,}/.test(text))
    );
  }

  /**
   * Check if text contains insults
   */
  private containsInsult(text: string): boolean {
    const lowerText = text.toLowerCase();
    return INSULT_WORDS.some((word) => lowerText.includes(word));
  }

  /**
   * Check if text contains compliments/slang
   */
  private isCompliment(text: string): boolean {
    const lowerText = text.toLowerCase();
    const SLANG_WORDS = ["anjay", "keren", "gokil", "mantap", "gas", "menyala", "kelaz", "gg"];
    return SLANG_WORDS.some((word) => lowerText.includes(word));
  }

  shouldHandle(msg: TelegramBot.Message): boolean {
    const text = msg.text?.toLowerCase() ?? "";

    // Skip commands and URLs
    if (text.startsWith("/") || text.startsWith("https")) {
      return false;
    }

    // Skip if user has an active session (e.g. waiting for location input for weather/prayer)
    if (sessionManager.getState(msg.chat.id)) {
      return false;
    }

    const isRandom = this.isRandomText(text);
    const isInsult = this.containsInsult(text);
    const isCompliment = this.isCompliment(text);

    return isRandom || isInsult || isCompliment;
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text?.toLowerCase() ?? "";

    // Handle compliments
    if (this.isCompliment(text)) {
      const RESPONSES = [
        "Makasih!",
        "Terimakasih.",
        "Senang membantu.",
        "Sama-sama!",
        "Apresiasi Anda.",
        "Dengan senang hati.",
      ];
      const randomResponse = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
      await bot.sendMessage(chatId, randomResponse);
      return;
    }

    // Generate random number 0-4
    const randomNum = Math.floor(Math.random() * 5);

    if (randomNum < 2) {
      // Text reply (index 0 or 1) - Replace with insults/gibberish + angry emojis
      const INSULT_RESPONSES = ["lah kocak", "apalah 😐", "apacoba", "😐", "😡", "😾"];
      const response = INSULT_RESPONSES[Math.floor(Math.random() * INSULT_RESPONSES.length)];
      await bot.sendMessage(chatId, response);
    } else {
      // Sticker reply (index 2, 3, or 4)
      const stickerIndex = randomNum - 2;
      const stickerOption = STICKER_OPTIONS[stickerIndex];

      try {
        const stickerPath = this.stickerService.getStickerAssetPath(stickerOption);

        // Assign .name property to avoid deprecation warning from node-telegram-bot-api
        const namedPath = Object.assign(stickerPath, { name: `sticker.${stickerOption.split(".")[1]}` });

        await bot.sendSticker(chatId, namedPath as unknown as string, {});
      } catch (err) {
        console.error("[RandomReplyHandler] Failed to send sticker:", err);
        // Fallback to text reply if sticker fails
        const INSULT_RESPONSES = ["lah kocak", "apalah 😐", "apacoba", "😐", "😡", "😾"];
        const response = INSULT_RESPONSES[Math.floor(Math.random() * INSULT_RESPONSES.length)];
        await bot.sendMessage(chatId, response);
      }
    }
  }
}
