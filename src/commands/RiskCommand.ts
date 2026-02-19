import TelegramBot from "node-telegram-bot-api";
import type { Command, CallbackHandler } from "./types.js";
import {
  createCapitalButtons,
  createRiskPercentButtons,
  createStopLossButtons,
  createRiskResultButtons,
  safeEditMessage,
  formatUSD,
} from "../utils/uiHelper.js";
import { MESSAGES } from "../config/messages.js";
import { S } from "../config/symbols.js";
import { sessionManager, type RiskSessionData, type SessionState } from "../utils/SessionManager.js";

export class RiskInputHandler {
  constructor() {}

  async handle(bot: TelegramBot, msg: TelegramBot.Message, state: SessionState & { flow: "risk" }): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text || "";
    const value = parseFloat(text);

    if (isNaN(value) || value <= 0) {
      await bot.sendMessage(chatId, MESSAGES.RISK_INVALID_INPUT);
      return;
    }

    if (state.step === "capital") {
      sessionManager.updateRiskData(chatId, { capital: value });
      sessionManager.setRiskStep(chatId, "risk_percent");

      await bot.sendMessage(chatId, `Modal: ${formatUSD(value)}\n\nPilih persentase risiko per trade:`, {
        reply_markup: { inline_keyboard: createRiskPercentButtons() },
      });
    } else if (state.step === "risk_percent") {
      sessionManager.updateRiskData(chatId, { riskPercent: value });
      sessionManager.setRiskStep(chatId, "stop_loss");

      await bot.sendMessage(chatId, `Risiko: ${value}%\n\nTentukan Stop Loss (pips):`, {
        reply_markup: { inline_keyboard: createStopLossButtons() },
      });
    } else if (state.step === "stop_loss") {
      sessionManager.updateRiskData(chatId, { stopLossPips: value });

      const finalState = sessionManager.getState(chatId);
      const finalData = finalState?.data as RiskSessionData;

      this.showResult(bot, chatId, finalData);
      sessionManager.clearState(chatId);
    }
  }

  async showResult(bot: TelegramBot, chatId: number, data: RiskSessionData) {
    const riskAmount = ((data.capital || 0) * (data.riskPercent || 0)) / 100;
    const positionSize = riskAmount / ((data.stopLossPips || 1) * 10);

    const message =
      `*HASIL KALKULASI RISIKO*\n\n` +
      `\`\`\`\n` +
      `Modal:     ${formatUSD(data.capital || 0)}\n` +
      `Risiko:    ${data.riskPercent || 0}% (${formatUSD(riskAmount)})\n` +
      `Stop Loss: ${data.stopLossPips || 0} pips\n` +
      `\`\`\`\n\n` +
      `${S.SUCCESS} *REKOMENDASI LOT*\n` +
      `→ *${positionSize.toFixed(2)} Lot*`;

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: createRiskResultButtons() },
    });
  }
}

export class RiskCommand implements Command, CallbackHandler {
  pattern = /^\/risk(?:\s+(\d+)(?:\s+(\d+)(?:\s+(\d+))?)?)?$/;
  prefix = "risk_";
  private inputHandler: RiskInputHandler;

  constructor(inputHandler: RiskInputHandler) {
    this.inputHandler = inputHandler;
  }

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    sessionManager.startRiskWizard(chatId);

    await bot.sendMessage(chatId, `*Kalkulator Risiko*\n\nPilih modal trading anda:`, {
      reply_markup: {
        inline_keyboard: createCapitalButtons(),
      },
      parse_mode: "Markdown",
    });
  }

  async handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;

    const action = data.replace("risk_", "");

    if (action.startsWith("cap_")) {
      if (action === "cap_custom") {
        await safeEditMessage(bot, chatId, messageId, "Masukkan jumlah modal (USD):");
        return;
      }

      const value = parseInt(action.replace("cap_", ""));
      sessionManager.updateRiskData(chatId, { capital: value });
      sessionManager.setRiskStep(chatId, "risk_percent");

      await safeEditMessage(bot, chatId, messageId, `Modal: ${formatUSD(value)}\n\nPilih persentase risiko:`, {
        reply_markup: { inline_keyboard: createRiskPercentButtons() },
      });
    } else if (action.startsWith("pct_")) {
      if (action === "pct_custom") {
        await safeEditMessage(bot, chatId, messageId, "Masukkan persen risiko (contoh: 1.5):");
        return;
      }

      const value = parseFloat(action.replace("pct_", ""));
      sessionManager.updateRiskData(chatId, { riskPercent: value });
      sessionManager.setRiskStep(chatId, "stop_loss");

      await safeEditMessage(bot, chatId, messageId, `Risiko: ${value}%\n\nTentukan Stop Loss (pips):`, {
        reply_markup: { inline_keyboard: createStopLossButtons() },
      });
    } else if (action.startsWith("sl_")) {
      if (action === "sl_custom") {
        await safeEditMessage(bot, chatId, messageId, "Masukkan Stop Loss (pips):");
        return;
      }

      const value = parseInt(action.replace("sl_", ""));
      sessionManager.updateRiskData(chatId, { stopLossPips: value });

      await bot.deleteMessage(chatId, messageId);

      const state = sessionManager.getState(chatId);
      const riskData = state?.data as RiskSessionData;

      if (riskData) {
        await this.inputHandler.showResult(bot, chatId, riskData);
      }
      sessionManager.clearState(chatId);
    } else if (action === "restart") {
      sessionManager.startRiskWizard(chatId);
      await safeEditMessage(bot, chatId, messageId, `*Kalkulator Risiko*\n\nPilih modal trading anda:`, {
        reply_markup: { inline_keyboard: createCapitalButtons() },
        parse_mode: "Markdown",
      });
    } else if (action === "cancel") {
      sessionManager.clearState(chatId);
      await safeEditMessage(bot, chatId, messageId, `${S.FAIL} Kalkulator ditutup.`);
    } else if (action.startsWith("back_")) {
      sessionManager.startRiskWizard(chatId);
      await safeEditMessage(bot, chatId, messageId, `*Kalkulator Risiko*\n\nPilih modal trading anda:`, {
        reply_markup: { inline_keyboard: createCapitalButtons() },
        parse_mode: "Markdown",
      });
    }

    await bot.answerCallbackQuery(query.id);
  }
}
