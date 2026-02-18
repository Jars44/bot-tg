/**
 * Brainstorm Command
 * Handles /brainstorm [topic], /idea, /lore
 * Creative generation for writers and builders
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import type { BrainstormService, BrainstormMode } from "../services/BrainstormService.js";
import { withLoading } from "../utils/uiHelper.js";

/**
 * /brainstorm [topic] — Generates random creative content
 * Supports sub-modes via inline keyboard
 */
export class BrainstormCommand implements Command {
  pattern = /^\/brainstorm(?:\s+(.+))?$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const topic = match?.[1]?.trim();

    // Show mode selection
    await bot.sendMessage(
      chatId,
      `*Brainstorm Engine*${topic ? `\nTopic: "${topic}"` : ""}\n\nPilih tipe konten yang ingin di-generate:`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Character", callback_data: `brain_character${topic ? `_${topic}` : ""}` },
              { text: "Plot Hook", callback_data: `brain_plot${topic ? `_${topic}` : ""}` },
            ],
            [
              { text: "World", callback_data: `brain_world${topic ? `_${topic}` : ""}` },
              { text: "Lore", callback_data: `brain_lore${topic ? `_${topic}` : ""}` },
            ],
            [{ text: "Random Idea", callback_data: `brain_idea${topic ? `_${topic}` : ""}` }],
          ],
        },
      },
    );
  }
}

/**
 * /idea — Quick random idea seed
 */
export class IdeaCommand implements Command {
  pattern = /^\/idea(?:\s+(.+))?$/;

  private brainstormService: BrainstormService;

  constructor(brainstormService: BrainstormService) {
    this.brainstormService = brainstormService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const topic = match?.[1]?.trim();

    await withLoading(bot, chatId, async () => {
      try {
        const result = await this.brainstormService.generate("idea", topic);
        const message = this.brainstormService.formatResult(result);
        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error("[IdeaCommand] Error:", error);
        await bot.sendMessage(chatId, "× Gagal menghasilkan ide. Silakan coba lagi.");
      }
    });
  }
}

/**
 * /lore — Quick lore fragment generation
 */
export class LoreCommand implements Command {
  pattern = /^\/lore(?:\s+(.+))?$/;

  private brainstormService: BrainstormService;

  constructor(brainstormService: BrainstormService) {
    this.brainstormService = brainstormService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const topic = match?.[1]?.trim();

    await withLoading(bot, chatId, async () => {
      try {
        const result = await this.brainstormService.generate("lore", topic);
        const message = this.brainstormService.formatResult(result);
        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error("[LoreCommand] Error:", error);
        await bot.sendMessage(chatId, "× Gagal menghasilkan lore. Silakan coba lagi.");
      }
    });
  }
}

/**
 * Callback handler for brainstorm mode selection
 */
export class BrainstormCallbackHandler {
  prefix = "brain_";

  private brainstormService: BrainstormService;

  constructor(brainstormService: BrainstormService) {
    this.brainstormService = brainstormService;
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    const payload = data.replace("brain_", "");

    // Parse mode and optional topic: "character_topichere" or just "character"
    const firstUnderscore = payload.indexOf("_");
    let mode: BrainstormMode;
    let topic: string | undefined;

    if (firstUnderscore > 0) {
      mode = payload.substring(0, firstUnderscore) as BrainstormMode;
      topic = payload.substring(firstUnderscore + 1);
    } else {
      mode = payload as BrainstormMode;
    }

    // Validate mode
    const validModes: BrainstormMode[] = ["character", "plot", "world", "idea", "lore"];
    if (!validModes.includes(mode)) {
      await bot.answerCallbackQuery(query.id, { text: "Mode tidak valid" });
      return;
    }

    await bot.answerCallbackQuery(query.id, { text: `Generating ${mode}...` });
    await bot.sendChatAction(chatId, "typing");

    try {
      const result = await this.brainstormService.generate(mode, topic);
      const message = this.brainstormService.formatResult(result);
      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[BrainstormCallback] Error:", error);
      await bot.sendMessage(chatId, "× Gagal generate konten. Silakan coba lagi.");
    }
  }
}
