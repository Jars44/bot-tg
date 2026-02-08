/**
 * TP/SL Handler
 * Handles Take Profit and Stop Loss input flow
 */

import TelegramBot from "node-telegram-bot-api";
import type { MessageHandler, CallbackHandler } from "./types.js";
import { sessionManager, type TpSlSessionData } from "../utils/SessionManager.js";
import type { JsonDb } from "../database/JsonDb.js";

/**
 * Message handler for TP/SL text input
 */
export class TpSlInputHandler implements MessageHandler {
  private db: JsonDb;

  constructor(db: JsonDb) {
    this.db = db;
  }

  shouldHandle(msg: TelegramBot.Message): boolean {
    const chatId = msg.chat.id;
    const state = sessionManager.getState(chatId);

    return state?.flow === "tpsl" && Boolean(msg.text);
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const state = sessionManager.getState(chatId);

    if (!state || state.flow !== "tpsl") return;

    const text = msg.text?.trim();

    // Cancel button
    if (text === "❌ Batal") {
      await sessionManager.clearState(chatId);
      await bot.sendMessage(chatId, "👍 Dibatalkan.", { reply_markup: { remove_keyboard: true } });
      return;
    }

    const price = parseFloat(text || "");
    const tpslData = state.data as TpSlSessionData;

    if (isNaN(price) || price <= 0) {
      await bot.sendMessage(chatId, "❌ Harga tidak valid. Masukkan angka positif.");
      return;
    }

    if (state.step === "tp") {
      // Save Take Profit and ask for Stop Loss
      tpslData.takeProfit = price;

      await sessionManager.setState(chatId, {
        flow: "tpsl",
        step: "sl",
        data: tpslData,
      });

      await bot.sendMessage(
        chatId,
        `✅ Take Profit: $${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n\n` +
          `🛑 Masukkan harga *Stop Loss* untuk ${tpslData.symbol}:\n` +
          `_Harga entry: $${tpslData.entryPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}_`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            keyboard: [[{ text: "❌ Batal" }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      );
    } else if (state.step === "sl") {
      // Save Stop Loss and update position
      const stopLoss = price;
      const takeProfit = tpslData.takeProfit;

      try {
        // Update position with TP/SL
        await this.db.updatePositionTpSl(tpslData.positionId, takeProfit, stopLoss);

        await sessionManager.clearState(chatId);

        await bot.sendMessage(
          chatId,
          `🛡️ *Protection Set!*\n\n` +
            `📊 ${tpslData.symbol}\n` +
            `💵 Entry: $${tpslData.entryPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n` +
            `${takeProfit ? `✅ Take Profit: $${takeProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n` : ""}` +
            `🛑 Stop Loss: $${stopLoss.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n\n` +
            `_Position akan auto-close jika harga mencapai level ini._`,
          {
            parse_mode: "Markdown",
            reply_markup: { remove_keyboard: true },
          },
        );
      } catch (error) {
        console.error("[TpSlHandler] Error setting TP/SL:", error);
        await bot.sendMessage(chatId, "❌ Gagal menyimpan TP/SL. Silakan coba lagi.", {
          reply_markup: { remove_keyboard: true },
        });
        await sessionManager.clearState(chatId);
      }
    }
  }
}

/**
 * Callback handler for TP/SL buttons
 */
export class TpSlCallbackHandler implements CallbackHandler {
  prefix = "tpsl:";

  shouldHandle(query: TelegramBot.CallbackQuery): boolean {
    return query.data?.startsWith(this.prefix) || false;
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery): Promise<void> {
    const chatId = query.message?.chat.id;
    if (!chatId || !query.data) return;

    const action = query.data.replace(this.prefix, "");

    // Parse action: set:positionId:symbol:entryPrice or skip
    if (action === "skip") {
      await bot.answerCallbackQuery(query.id, { text: "⏩ Skipped" });
      await bot
        .editMessageReplyMarkup(
          { inline_keyboard: [] },
          {
            chat_id: chatId,
            message_id: query.message?.message_id,
          },
        )
        .catch(() => {});
      return;
    }

    if (action.startsWith("set:")) {
      const [, positionId, symbol, entryPriceStr] = action.split(":");
      const entryPrice = parseFloat(entryPriceStr);

      // Start TP/SL session
      await sessionManager.setState(chatId, {
        flow: "tpsl",
        step: "tp",
        data: {
          positionId,
          symbol,
          entryPrice,
        },
      });

      await bot.answerCallbackQuery(query.id);

      await bot
        .editMessageReplyMarkup(
          { inline_keyboard: [] },
          {
            chat_id: chatId,
            message_id: query.message?.message_id,
          },
        )
        .catch(() => {});

      await bot.sendMessage(
        chatId,
        `🛡️ *Set Protection for ${symbol}*\n\n` +
          `💵 Entry Price: $${entryPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n\n` +
          `✅ Masukkan harga *Take Profit*:`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            keyboard: [[{ text: "❌ Batal" }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      );
    }
  }
}
