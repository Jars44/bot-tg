/**
 * Hunt Command — Urban Exploration Photography Missions
 * Handles /hunt and location-triggered mission generation
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";
import type { UrbanExplorationService } from "../services/UrbanExplorationService.js";
import { safeEditMessage } from "../utils/uiHelper.js";

export class HuntCommand implements Command {
  pattern = /^\/hunt$/;

  private urbanService: UrbanExplorationService;

  constructor(urbanService: UrbanExplorationService) {
    this.urbanService = urbanService;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (msg.location) {
      // Direct location provided
      await this.executeFromLocation(bot, chatId, msg.location.latitude, msg.location.longitude);
      return;
    }

    // No location — prompt user to send one
    await bot.sendMessage(chatId, "*📸 Photography Hunt*\n\nKirim lokasi Anda untuk mendapatkan misi fotografi unik.", {
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: [[{ text: "📍 Kirim Lokasi Saya", request_location: true }]],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });
  }

  /**
   * Generate a mission from coordinates (called by LocationHandler).
   */
  async executeFromLocation(bot: TelegramBot, chatId: number, lat: number, lon: number): Promise<void> {
    const loadingMsg = await bot.sendMessage(chatId, "⧗ Membuat misi fotografi untuk lokasi Anda...", {
      reply_markup: { remove_keyboard: true },
    });
    const msgId = loadingMsg.message_id;

    try {
      const mission = await this.urbanService.generateMission(lat, lon);
      const message = this.urbanService.formatMissionMessage(mission);
      const edited = await safeEditMessage(bot, chatId, msgId, message, { parse_mode: "Markdown" });
      if (!edited) await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("[HuntCommand] Error:", error);
      await safeEditMessage(bot, chatId, msgId, "× Gagal membuat misi. Silakan coba lagi.");
    }
  }
}
