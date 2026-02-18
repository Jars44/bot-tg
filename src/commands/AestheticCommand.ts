import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import type { AestheticService } from "../services/AestheticService.js";
import { safeEditMessage } from "../utils/uiHelper.js";
import { toTitleCase } from "../utils/helpers.js";
import { S } from "../config/symbols.js";

export class AestheticCommand implements Command {
  pattern = /^\/(moodboard|aesthetic)(?:\s+(.+))?$/;

  private aestheticService: AestheticService;

  constructor(aestheticService: AestheticService) {
    this.aestheticService = aestheticService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const keyword = match?.[2]?.trim();

    if (!keyword) {
      await bot.sendMessage(
        chatId,
        `*${S.PALETTE} Moodboard Generator*\n\nMasukkan keyword estetik yang ingin dibuat moodboard-nya.\n\nContoh:\n\`/moodboard Cyberpunk\`\n\`/aesthetic Dark Academia\`\n\`/moodboard Old Money\``,
        { parse_mode: "Markdown" },
      );
      return;
    }

    const loadingMsg = await bot.sendMessage(chatId, `${S.LOADING} Membuat moodboard untuk *${keyword}*...`, {
      parse_mode: "Markdown",
    });
    const msgId = loadingMsg.message_id;

    try {
      const result = await this.aestheticService.generateMoodboard(keyword);

      try {
        await bot.deleteMessage(chatId, msgId);
      } catch { /* empty */ }


      if (result.images.length > 0) {
        const mediaGroup: TelegramBot.InputMediaPhoto[] = result.images.map((img, i) => ({
          type: "photo",
          media: img.url,
          caption:
            i === 0
              ? `Moodboard: "${toTitleCase(keyword)}" — Foto oleh ${img.photographer}`
              : `Foto oleh ${toTitleCase(img.photographer)}`,
        }));

        try {
          await bot.sendMediaGroup(chatId, mediaGroup);
        } catch (mediaError) {
          console.error("[AestheticCommand] Media group error:", mediaError);
          for (const img of result.images.slice(0, 3)) {
            try {
              await bot.sendPhoto(chatId, img.thumbUrl, {
                caption: `${img.altText} — ${img.photographer}`,
              });
            } catch { /* empty */ }
          }
        }
      }

      const paletteMsg = this.aestheticService.formatPaletteMessage(result);
      await bot.sendMessage(chatId, paletteMsg, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[AestheticCommand] Error:", error);
      await safeEditMessage(bot, chatId, msgId, `${S.FAIL} Gagal membuat moodboard. Silakan coba lagi.`);
    }
  }
}
