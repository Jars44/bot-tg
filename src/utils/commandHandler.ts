import TelegramBot from "node-telegram-bot-api";
import { S } from "../config/symbols.js";
import { safeEditMessage } from "./uiHelper.js";

interface ExecuteWithLoadingOptions {
  bot: TelegramBot;
  chatId: number;
  loadingText: string;
  errorText: string;
  action: (msgId: number) => Promise<string | void>;
  parseMode?: "Markdown" | "HTML";
  deleteOnSuccess?: boolean;
}

export async function executeWithLoading({
  bot,
  chatId,
  loadingText,
  errorText,
  action,
  parseMode = "Markdown",
  deleteOnSuccess = false,
}: ExecuteWithLoadingOptions): Promise<void> {
  const loadingMsg = await bot.sendMessage(chatId, `${S.LOADING} ${loadingText}`, {
    parse_mode: parseMode,
  });
  const msgId = loadingMsg.message_id;

  try {
    const result = await action(msgId);

    if (typeof result === "string") {
      if (deleteOnSuccess) {
        await bot.deleteMessage(chatId, msgId).catch(() => {});
        await bot.sendMessage(chatId, result, { parse_mode: parseMode });
      } else {
        const edited = await safeEditMessage(bot, chatId, msgId, result, { parse_mode: parseMode });
        if (!edited) await bot.sendMessage(chatId, result, { parse_mode: parseMode });
      }
    }
  } catch (error) {
    console.error(`[executeWithLoading] Error:`, error);
    const edited = await safeEditMessage(bot, chatId, msgId, `${S.FAIL} ${errorText}`);
    if (!edited) {
      try {
        await bot.sendMessage(chatId, `${S.FAIL} ${errorText}`);
      } catch {
        /* empty */
      }
    }
  }
}

interface CallbackWithLoadingOptions {
  bot: TelegramBot;
  query: TelegramBot.CallbackQuery;
  toastText?: string;
  loadingText: string;
  errorText: string;
  action: (chatId: number, messageId: number) => Promise<string | void>;
  parseMode?: "Markdown" | "HTML";
}

export async function callbackWithLoading({
  bot,
  query,
  toastText,
  loadingText,
  errorText,
  action,
  parseMode = "Markdown",
}: CallbackWithLoadingOptions): Promise<void> {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  if (!chatId || !messageId) return;

  if (toastText) {
    await bot.answerCallbackQuery(query.id, { text: toastText });
  } else {
    await bot.answerCallbackQuery(query.id);
  }

  await safeEditMessage(bot, chatId, messageId, `${S.LOADING} ${loadingText}`);

  try {
    const result = await action(chatId, messageId);
    if (typeof result === "string") {
      const edited = await safeEditMessage(bot, chatId, messageId, result, { parse_mode: parseMode });
      if (!edited) await bot.sendMessage(chatId, result, { parse_mode: parseMode });
    }
  } catch (error) {
    console.error(`[callbackWithLoading] Error:`, error);
    await safeEditMessage(bot, chatId, messageId, `${S.FAIL} ${errorText}`);
  }
}
