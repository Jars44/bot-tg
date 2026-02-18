import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler } from "./types.js";
import type { BrainstormService, BrainstormMode } from "../services/BrainstormService.js";
import { safeEditMessage } from "../utils/uiHelper.js";
import { S } from "../config/symbols.js";

export class BrainstormCommand implements Command {
  pattern = /^\/brainstorm(?:\s+(.+))?$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const topic = match?.[1]?.trim();

    await bot.sendMessage(
      chatId,
      `*${S.BULB} Brainstorm Engine*${topic ? `\nTopik: "${topic}"` : ""}\n\nPilih tipe konten yang ingin di-generate:`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: `${S.PERSON} Karakter`, callback_data: `brain_character${topic ? `_${topic}` : ""}` },
              { text: `${S.BOOK} Plot Hook`, callback_data: `brain_plot${topic ? `_${topic}` : ""}` },
            ],
            [
              { text: `${S.GLOBE} Dunia`, callback_data: `brain_world${topic ? `_${topic}` : ""}` },
              { text: `${S.SCROLL} Lore`, callback_data: `brain_lore${topic ? `_${topic}` : ""}` },
            ],
            [{ text: `${S.SPARK} Ide Acak`, callback_data: `brain_idea${topic ? `_${topic}` : ""}` }],
          ],
        },
      },
    );
  }
}

export class IdeaCommand implements Command {
  pattern = /^\/idea(?:\s+(.+))?$/;

  private brainstormService: BrainstormService;

  constructor(brainstormService: BrainstormService) {
    this.brainstormService = brainstormService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const topic = match?.[1]?.trim();

    const loadingMsg = await bot.sendMessage(
      chatId,
      `${S.LOADING} Membuat ide kreatif${topic ? ` untuk topik *${topic}*` : ""}...`,
      { parse_mode: "Markdown" },
    );
    const msgId = loadingMsg.message_id;

    try {
      const result = await this.brainstormService.generate("idea", topic);
      const message = this.brainstormService.formatResult(result);
      const edited = await safeEditMessage(bot, chatId, msgId, message, { parse_mode: "Markdown" });
      if (!edited) await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[IdeaCommand] Error:", error);
      await safeEditMessage(bot, chatId, msgId, `${S.FAIL} Gagal menghasilkan ide. Silakan coba lagi.`);
    }
  }
}

export class LoreCommand implements Command {
  pattern = /^\/lore(?:\s+(.+))?$/;

  private brainstormService: BrainstormService;

  constructor(brainstormService: BrainstormService) {
    this.brainstormService = brainstormService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const topic = match?.[1]?.trim();

    const loadingMsg = await bot.sendMessage(
      chatId,
      `${S.LOADING} Membuat fragmen lore${topic ? ` untuk topik *${topic}*` : ""}...`,
      { parse_mode: "Markdown" },
    );
    const msgId = loadingMsg.message_id;

    try {
      const result = await this.brainstormService.generate("lore", topic);
      const message = this.brainstormService.formatResult(result);
      const edited = await safeEditMessage(bot, chatId, msgId, message, { parse_mode: "Markdown" });
      if (!edited) await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[LoreCommand] Error:", error);
      await safeEditMessage(bot, chatId, msgId, `${S.FAIL} Gagal menghasilkan lore. Silakan coba lagi.`);
    }
  }
}

export class BrainstormCallbackHandler implements CallbackHandler {
  prefix = "brain_";

  private brainstormService: BrainstormService;

  constructor(brainstormService: BrainstormService) {
    this.brainstormService = brainstormService;
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    if (!chatId || !messageId) return;

    const payload = data.replace("brain_", "");

    const firstUnderscore = payload.indexOf("_");
    let mode: BrainstormMode;
    let topic: string | undefined;

    if (firstUnderscore > 0) {
      mode = payload.substring(0, firstUnderscore) as BrainstormMode;
      topic = payload.substring(firstUnderscore + 1);
    } else {
      mode = payload as BrainstormMode;
    }

    const validModes: BrainstormMode[] = ["character", "plot", "world", "idea", "lore"];
    if (!validModes.includes(mode)) {
      await bot.answerCallbackQuery(query.id, { text: "Mode tidak dikenali" });
      return;
    }

    const modeLabels: Record<BrainstormMode, string> = {
      character: `${S.PERSON} karakter`,
      plot: `${S.BOOK} plot hook`,
      world: `${S.GLOBE} dunia`,
      idea: `${S.SPARK} ide`,
      lore: `${S.SCROLL} lore`,
    };

    await bot.answerCallbackQuery(query.id);
    await safeEditMessage(
      bot,
      chatId,
      messageId,
      `${S.LOADING} Sedang membuat ${modeLabels[mode]}${topic ? ` untuk topik "${topic}"` : ""}...`,
    );
    await bot.sendChatAction(chatId, "typing");

    try {
      const result = await this.brainstormService.generate(mode, topic);
      const message = this.brainstormService.formatResult(result);
      const edited = await safeEditMessage(bot, chatId, messageId, message, { parse_mode: "Markdown" });
      if (!edited) {
        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      }
    } catch (error) {
      console.error("[BrainstormCallback] Error:", error);
      await safeEditMessage(bot, chatId, messageId, `${S.FAIL} Gagal membuat konten. Silakan coba lagi.`);
    }
  }
}
