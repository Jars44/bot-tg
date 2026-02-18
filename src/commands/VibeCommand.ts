/**
 * Vibe Command
 * Handles /vibe and location-triggered vibe generation
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import type { VibeService } from "../services/VibeService.js";
import { withLoading } from "../utils/uiHelper.js";

export class VibeCommand implements Command {
  pattern = /^\/vibe(?:\s+(.+))?$/;

  private vibeService: VibeService;

  constructor(vibeService: VibeService) {
    this.vibeService = vibeService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const cityArg = match?.[1]?.trim();

    await withLoading(bot, chatId, async () => {
      try {
        let vibe;
        let label: string | undefined;

        if (cityArg) {
          // User provided a city name
          vibe = await this.vibeService.getVibeByCity(cityArg);
          label = cityArg;
        } else if (msg.location) {
          // Triggered from location
          vibe = await this.vibeService.getVibe(msg.location.latitude, msg.location.longitude);
        } else {
          // No args and no location — prompt user
          await bot.sendMessage(
            chatId,
            "*Vibe Check*\n\nKirim lokasi Anda atau ketik nama kota.\n\nContoh: `/vibe Malang`",
            {
              parse_mode: "Markdown",
            },
          );
          return;
        }

        const message = this.vibeService.formatVibeMessage(vibe, label);
        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error("[VibeCommand] Error:", error);
        await bot.sendMessage(chatId, "× Gagal menghasilkan vibe. Silakan coba lagi.");
      }
    });
  }

  /**
   * Generate vibe directly from coordinates (called by LocationHandler).
   */
  async executeFromLocation(bot: TelegramBot, chatId: number, lat: number, lon: number): Promise<void> {
    await withLoading(bot, chatId, async () => {
      try {
        const vibe = await this.vibeService.getVibe(lat, lon);
        const message = this.vibeService.formatVibeMessage(vibe);
        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error("[VibeCommand] Location vibe error:", error);
        await bot.sendMessage(chatId, "× Gagal menghasilkan vibe dari lokasi.");
      }
    });
  }
}
