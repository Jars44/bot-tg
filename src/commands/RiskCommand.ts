/**
 * Risk Calculator Command (Hybrid: Regex + Interactive Wizard)
 * UX Improvement: Power users can use regex mode, casual users get guided wizard
 * Uses editMessageText for anti-spam navigation
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler, MessageHandler } from "./types.js";
import { sessionManager, type RiskSessionData, isRiskSession } from "../utils/SessionManager.js";
import {
  createCapitalButtons,
  createRiskPercentButtons,
  createStopLossButtons,
  createRiskResultButtons,
} from "../utils/uiHelper.js";

/**
 * Calculate position size based on parameters
 */
function calculatePositionSize(capital: number, riskPercent: number, stopLossPips: number) {
  const riskAmount = capital * (riskPercent / 100);

  const pipValueStandard = 10; // $10 per pip for standard lot
  const pipValueMini = 1; // $1 per pip for mini lot
  const pipValueMicro = 0.1; // $0.10 per pip for micro lot

  const standardLots = riskAmount / (stopLossPips * pipValueStandard);
  const miniLots = riskAmount / (stopLossPips * pipValueMini);
  const microLots = riskAmount / (stopLossPips * pipValueMicro);

  return {
    riskAmount,
    standardLots,
    miniLots,
    microLots,
  };
}

/**
 * Format calculation result as message
 */
function formatRiskResult(capital: number, riskPercent: number, stopLossPips: number): string {
  const { riskAmount, standardLots, miniLots, microLots } = calculatePositionSize(capital, riskPercent, stopLossPips);

  return (
    `🧮 *Position Size Calculator*\n\n` +
    `💵 Capital: $${capital.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n` +
    `⚠️ Risk: ${riskPercent}% ($${riskAmount.toFixed(2)})\n` +
    `🛑 Stop Loss: ${stopLossPips} pips\n\n` +
    `*Recommended Lot Sizes:*\n` +
    `├ 📊 Standard (1.0): ${standardLots.toFixed(2)} lots\n` +
    `├ 📈 Mini (0.1): ${miniLots.toFixed(2)} lots\n` +
    `└ 📉 Micro (0.01): ${microLots.toFixed(2)} lots\n\n` +
    `_⚠️ Perhitungan ini untuk pasangan forex standar (XXX/USD)_`
  );
}

/**
 * Hybrid Risk Command
 * - Regex mode: /risk 10000 2 50
 * - Wizard mode: /risk (no params)
 */
export class RiskCommand implements Command {
  // Match both: /risk with params (power user) and /risk alone (wizard)
  pattern = /^\/risk(?:\s+(.+))?$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const params = match?.[1]?.trim();

    // Power user mode: /risk [capital] [risk%] [sl_pips]
    if (params) {
      const parts = params.split(/\s+/);
      if (parts.length === 3) {
        const capital = parseFloat(parts[0]);
        const riskPercent = parseFloat(parts[1]);
        const stopLossPips = parseFloat(parts[2]);

        // Validate inputs
        if (isNaN(capital) || capital <= 0) {
          await bot.sendMessage(chatId, "❌ Capital harus angka positif.");
          return;
        }
        if (isNaN(riskPercent) || riskPercent <= 0 || riskPercent > 100) {
          await bot.sendMessage(chatId, "❌ Risk % harus antara 0 dan 100.");
          return;
        }
        if (isNaN(stopLossPips) || stopLossPips <= 0) {
          await bot.sendMessage(chatId, "❌ Stop loss pips harus angka positif.");
          return;
        }

        // Show result directly (power user mode)
        const message = formatRiskResult(capital, riskPercent, stopLossPips);
        await bot.sendMessage(chatId, message, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: createRiskResultButtons() },
        });
        return;
      }
    }

    // Wizard mode: Start interactive flow
    const sentMessage = await bot.sendMessage(
      chatId,
      "🧮 *Position Size Calculator*\n\n" +
        "Step 1/3: Pilih atau ketik modal (Capital) dalam USD:\n\n" +
        "_Atau gunakan mode cepat:_\n" +
        "`/risk [capital] [risk%] [sl_pips]`",
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: createCapitalButtons() },
      },
    );

    // Set session state - uses "risk" flow as per SessionManager
    await sessionManager.setState(chatId, {
      flow: "risk",
      step: "capital",
      data: { messageId: sentMessage.message_id },
    });
  }
}

/**
 * Risk Wizard Callback Handler
 * Handles all risk_* callbacks for wizard navigation
 */
export class RiskCallbackHandler implements CallbackHandler {
  prefix = "risk_";

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    const action = data.replace("risk_", "");
    const state = sessionManager.getState(chatId);
    const sessionData: RiskSessionData = isRiskSession(state) ? state.data : { messageId };

    // Handle capital selection
    if (action.startsWith("cap_")) {
      const value = action.replace("cap_", "");

      if (value === "custom") {
        // Prompt for custom input
        await bot.editMessageText(
          "🧮 *Position Size Calculator*\n\n" + "Step 1/3: Ketik jumlah modal dalam USD:\n\n" + "_Contoh: 2500_",
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "❌ Batal", callback_data: "risk_cancel" }]],
            },
          },
        );

        await sessionManager.setState(chatId, {
          flow: "risk",
          step: "capital",
          data: { ...sessionData, messageId },
        });
      } else {
        // Use preset value
        const capital = parseInt(value);
        await this.showRiskPercentStep(bot, chatId, messageId, { ...sessionData, capital });
      }
    }

    // Handle risk percent selection
    if (action.startsWith("pct_")) {
      const value = action.replace("pct_", "");

      if (value === "custom") {
        await bot.editMessageText(
          "🧮 *Position Size Calculator*\n\n" +
            `💵 Capital: $${sessionData.capital?.toLocaleString()}\n\n` +
            "Step 2/3: Ketik persentase risiko:\n\n" +
            "_Contoh: 1.5_",
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "⬅️ Kembali", callback_data: "risk_back_capital" }]],
            },
          },
        );

        await sessionManager.setState(chatId, {
          flow: "risk",
          step: "risk_percent",
          data: { ...sessionData, messageId },
        });
      } else {
        const riskPercent = parseFloat(value);
        await this.showStopLossStep(bot, chatId, messageId, { ...sessionData, riskPercent });
      }
    }

    // Handle stop loss selection
    if (action.startsWith("sl_")) {
      const value = action.replace("sl_", "");

      if (value === "custom") {
        await bot.editMessageText(
          "🧮 *Position Size Calculator*\n\n" +
            `💵 Capital: $${sessionData.capital?.toLocaleString()}\n` +
            `⚠️ Risk: ${sessionData.riskPercent}%\n\n` +
            "Step 3/3: Ketik stop loss dalam pips:\n\n" +
            "_Contoh: 25_",
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "⬅️ Kembali", callback_data: "risk_back_percent" }]],
            },
          },
        );

        await sessionManager.setState(chatId, {
          flow: "risk",
          step: "stop_loss",
          data: { ...sessionData, messageId },
        });
      } else {
        const stopLossPips = parseInt(value);
        await this.showResult(bot, chatId, messageId, { ...sessionData, stopLossPips });
      }
    }

    // Handle back navigation
    if (action === "back_capital") {
      await bot.editMessageText(
        "🧮 *Position Size Calculator*\n\n" + "Step 1/3: Pilih atau ketik modal (Capital) dalam USD:",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: createCapitalButtons() },
        },
      );

      await sessionManager.setState(chatId, {
        flow: "risk",
        step: "capital",
        data: { messageId },
      });
    }

    if (action === "back_percent") {
      await this.showRiskPercentStep(bot, chatId, messageId, sessionData);
    }

    // Handle restart
    if (action === "restart" || action === "start") {
      await bot.editMessageText(
        "🧮 *Position Size Calculator*\n\n" + "Step 1/3: Pilih atau ketik modal (Capital) dalam USD:",
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: createCapitalButtons() },
        },
      );

      await sessionManager.setState(chatId, {
        flow: "risk",
        step: "capital",
        data: { messageId },
      });
    }

    // Handle cancel
    if (action === "cancel") {
      await bot.editMessageText("❌ Kalkulator risiko dibatalkan.", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [[{ text: "🏠 Menu Utama", callback_data: "menu_back" }]],
        },
      });
      await sessionManager.clearState(chatId);
    }

    await bot.answerCallbackQuery(query.id);
  }

  private async showRiskPercentStep(
    bot: TelegramBot,
    chatId: number,
    messageId: number,
    data: RiskSessionData,
  ): Promise<void> {
    await bot.editMessageText(
      "🧮 *Position Size Calculator*\n\n" +
        `💵 Capital: $${data.capital?.toLocaleString()}\n\n` +
        "Step 2/3: Pilih persentase risiko:",
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: createRiskPercentButtons() },
      },
    );

    await sessionManager.setState(chatId, {
      flow: "risk",
      step: "risk_percent",
      data: { ...data, messageId },
    });
  }

  private async showStopLossStep(
    bot: TelegramBot,
    chatId: number,
    messageId: number,
    data: RiskSessionData,
  ): Promise<void> {
    await bot.editMessageText(
      "🧮 *Position Size Calculator*\n\n" +
        `💵 Capital: $${data.capital?.toLocaleString()}\n` +
        `⚠️ Risk: ${data.riskPercent}%\n\n` +
        "Step 3/3: Pilih stop loss dalam pips:",
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: createStopLossButtons() },
      },
    );

    await sessionManager.setState(chatId, {
      flow: "risk",
      step: "stop_loss",
      data: { ...data, messageId },
    });
  }

  private async showResult(bot: TelegramBot, chatId: number, messageId: number, data: RiskSessionData): Promise<void> {
    if (!data.capital || !data.riskPercent || !data.stopLossPips) return;

    const message = formatRiskResult(data.capital, data.riskPercent, data.stopLossPips);

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: createRiskResultButtons() },
    });

    await sessionManager.clearState(chatId);
  }
}

/**
 * Risk Wizard Input Handler
 * Handles custom numeric inputs during wizard flow
 */
export class RiskInputHandler implements MessageHandler {
  shouldHandle(msg: TelegramBot.Message): boolean {
    if (!msg.text || msg.text.startsWith("/")) return false;

    const state = sessionManager.getState(msg.chat.id);
    return isRiskSession(state);
  }

  async handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text ?? "";
    const state = sessionManager.getState(chatId);

    if (!isRiskSession(state)) return;

    const { step, data } = state;
    const messageId = data.messageId;

    // Parse numeric input
    const value = parseFloat(text.replace(/[,$]/g, ""));

    if (isNaN(value) || value <= 0) {
      await bot.sendMessage(chatId, "❌ Masukkan angka yang valid.");
      return;
    }

    // Delete user's input message to keep chat clean
    try {
      await bot.deleteMessage(chatId, msg.message_id);
    } catch {
      // Ignore if can't delete
    }

    if (!messageId) return;

    switch (step) {
      case "capital": {
        // Update capital and move to risk percent
        await bot.editMessageText(
          "🧮 *Position Size Calculator*\n\n" +
            `💵 Capital: $${value.toLocaleString()}\n\n` +
            "Step 2/3: Pilih persentase risiko:",
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: createRiskPercentButtons() },
          },
        );

        await sessionManager.setState(chatId, {
          flow: "risk",
          step: "risk_percent",
          data: { ...data, capital: value },
        });
        break;
      }

      case "risk_percent": {
        if (value > 100) {
          await bot.sendMessage(chatId, "❌ Risk % harus antara 0 dan 100.");
          return;
        }

        await bot.editMessageText(
          "🧮 *Position Size Calculator*\n\n" +
            `💵 Capital: $${data.capital?.toLocaleString()}\n` +
            `⚠️ Risk: ${value}%\n\n` +
            "Step 3/3: Pilih stop loss dalam pips:",
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: createStopLossButtons() },
          },
        );

        await sessionManager.setState(chatId, {
          flow: "risk",
          step: "stop_loss",
          data: { ...data, riskPercent: value },
        });
        break;
      }

      case "stop_loss": {
        if (!data.capital || !data.riskPercent) return;

        const message = formatRiskResult(data.capital, data.riskPercent, value);

        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: createRiskResultButtons() },
        });

        await sessionManager.clearState(chatId);
        break;
      }
    }
  }
}
