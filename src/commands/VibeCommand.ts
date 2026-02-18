import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import type { VibeService } from "../services/VibeService.js";
import { safeEditMessage } from "../utils/uiHelper.js";
import { S } from "../config/symbols.js";

export class VibeCommand implements Command {
  pattern = /^\/vibe(?:\s+(.+))?$/;

  private vibeService: VibeService;

  constructor(vibeService: VibeService) {
    this.vibeService = vibeService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const cityArg = match?.[1]?.trim();

    if (!cityArg && !msg.location) {
      await bot.sendMessage(
        chatId,
        `*${S.NOTE} Vibe Check*\n\nKirim lokasi Anda atau ketik nama kota.\n\nContoh: \`/vibe Malang\``,
        { parse_mode: "Markdown" },
      );
      return;
    }

    const loadingLabel = cityArg ? `di *${cityArg}*` : "dari lokasi Anda";
    const loadingMsg = await bot.sendMessage(chatId, `${S.LOADING} Mendeteksi vibe ${loadingLabel}...`, {
      parse_mode: "Markdown",
    });
    const msgId = loadingMsg.message_id;

    try {
      let vibe;
      let label: string | undefined;

      if (cityArg) {
        vibe = await this.vibeService.getVibeByCity(cityArg);
        label = cityArg;
      } else {
        vibe = await this.vibeService.getVibe(msg.location!.latitude, msg.location!.longitude);
      }

      const message = this.vibeService.formatVibeMessage(vibe, label);
      const edited = await safeEditMessage(bot, chatId, msgId, message, { parse_mode: "Markdown" });
      if (!edited) await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[VibeCommand] Error:", error);
      await safeEditMessage(bot, chatId, msgId, `${S.FAIL} Gagal mendeteksi vibe. Silakan coba lagi.`);
    }
  }

  async executeFromLocation(bot: TelegramBot, chatId: number, lat: number, lon: number): Promise<void> {
    const loadingMsg = await bot.sendMessage(chatId, `${S.LOADING} Mendeteksi vibe dari lokasi Anda...`);
    const msgId = loadingMsg.message_id;

    try {
      const vibe = await this.vibeService.getVibe(lat, lon);
      const message = this.vibeService.formatVibeMessage(vibe);
      const edited = await safeEditMessage(bot, chatId, msgId, message, { parse_mode: "Markdown" });
      if (!edited) await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[VibeCommand] Location vibe error:", error);
      await safeEditMessage(bot, chatId, msgId, `${S.FAIL} Gagal mendeteksi vibe dari lokasi ini.`);
    }
  }
}
