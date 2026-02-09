/**
 * Download command with interactive state management
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler, MessageHandler } from "./types.js";
import { DownloadService, DownloadSource, DownloadFormat } from "../services/DownloadService.js";
import { TempCleanerService } from "../services/TempCleanerService.js";
import { MESSAGES } from "../config/messages.js";

interface DownloadState {
  step: "source" | "format" | "link";
  source?: DownloadSource;
  format?: DownloadFormat;
}

export class DownloadCommand implements Command, MessageHandler {
  pattern = /^\/download$/;
  private downloadService: DownloadService;
  private tempCleaner: TempCleanerService;
  private userStates = new Map<number, DownloadState>();

  constructor(downloadService: DownloadService, tempCleaner: TempCleanerService) {
    this.downloadService = downloadService;
    this.tempCleaner = tempCleaner;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    // Set initial state
    this.userStates.set(chatId, { step: "source" });

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "YouTube", callback_data: "dl_source_youtube" },
            { text: "TikTok", callback_data: "dl_source_tiktok" },
          ],
        ],
      },
    };

    await bot.sendMessage(chatId, MESSAGES.DOWNLOAD_SELECT_SOURCE, options);
  }

  /**
   * Handle callback queries for source/format selection
   */
  getCallbackHandler(): CallbackHandler {
    return {
      prefix: "dl_",
      handle: async (bot, query, data) => {
        const chatId = query.message?.chat.id;
        if (!chatId || !query.message) return;

        const state = this.userStates.get(chatId) || { step: "source" };

        // Handle source selection
        if (data.startsWith("dl_source_")) {
          const source = data.replace("dl_source_", "") as DownloadSource;
          state.source = source;
          state.step = "format";
          this.userStates.set(chatId, state);

          const options = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "MP4 (Video)", callback_data: "dl_format_mp4" },
                  { text: "MP3 (Audio)", callback_data: "dl_format_mp3" },
                ],
              ],
            },
          };

          await bot.editMessageText(MESSAGES.DOWNLOAD_SELECT_FORMAT(source), {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: options.reply_markup,
          });
        }

        // Handle format selection
        if (data.startsWith("dl_format_")) {
          const format = data.replace("dl_format_", "") as DownloadFormat;
          state.format = format;
          state.step = "link";
          this.userStates.set(chatId, state);

          await bot.editMessageText(MESSAGES.DOWNLOAD_SEND_LINK(format), {
            chat_id: chatId,
            message_id: query.message.message_id,
          });
        }

        await bot.answerCallbackQuery(query.id);
      },
    };
  }

  /**
   * Check if this handler should process the message (link input)
   */
  shouldHandle(msg: TelegramBot.Message): boolean {
    const chatId = msg.chat.id;
    const state = this.userStates.get(chatId);
    const text = msg.text ?? "";

    // Ignore commands
    if (text.startsWith("/")) return false;

    return state?.step === "link" && text.startsWith("https");
  }

  /**
   * Handle the download link message
   */
  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const state = this.userStates.get(chatId);
    const url = msg.text ?? "";

    if (!state?.source || !state?.format) {
      this.userStates.delete(chatId);
      return;
    }

    await bot.sendMessage(chatId, MESSAGES.DOWNLOAD_PROCESSING);

    try {
      const result = await this.downloadService.download(state.source, state.format, url);

      if (!result) {
        await bot.sendMessage(chatId, MESSAGES.ERROR_DOWNLOAD);
        this.userStates.delete(chatId);
        return;
      }

      const caption = result.format === "mp4" ? MESSAGES.DOWNLOAD_VIDEO_CAPTION : MESSAGES.DOWNLOAD_AUDIO_CAPTION;

      if (result.type === "url") {
        // Direct URL - send directly
        if (result.format === "mp4") {
          await bot.sendVideo(chatId, result.path, { caption });
        } else {
          await bot.sendAudio(chatId, result.path, { caption });
        }
      } else {
        // Downloaded file
        if (result.format === "mp4") {
          await bot.sendVideo(chatId, result.path, { caption });
        } else {
          await bot.sendAudio(chatId, result.path, { caption });
        }
        // Cleanup temp file
        this.tempCleaner.deleteFile(result.path);
      }
    } catch {
      await bot.sendMessage(chatId, MESSAGES.ERROR_DOWNLOAD_PROCESS);
    }

    this.userStates.delete(chatId);
  }
}
