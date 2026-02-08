/**
 * Risk Calculator Command
 * Calculate position size based on capital, risk %, and stop loss
 */

import TelegramBot from "node-telegram-bot-api";
import type { Command } from "./types.js";

/**
 * Position size calculator
 * Usage: /risk [capital] [risk_%] [stoploss_pips]
 */
export class RiskCommand implements Command {
  pattern = /^\/risk\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void> {
    const chatId = msg.chat.id;

    if (!match || !match[1] || !match[2] || !match[3]) {
      await bot.sendMessage(
        chatId,
        "❌ Format salah!\n\n" +
          "Gunakan: `/risk [capital] [risk_%] [stoploss_pips]`\n" +
          "Contoh: `/risk 10000 2 50`\n\n" +
          "_Artinya: $10,000 modal, 2% risk, 50 pips stop loss_",
        { parse_mode: "Markdown" },
      );
      return;
    }

    const capital = parseFloat(match[1]);
    const riskPercent = parseFloat(match[2]);
    const stopLossPips = parseFloat(match[3]);

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

    // Calculate risk amount in dollars
    const riskAmount = capital * (riskPercent / 100);

    // Pip value calculations (assuming standard forex pairs with USD)
    // For most pairs: 1 standard lot = $10 per pip
    // 1 mini lot = $1 per pip
    // 1 micro lot = $0.10 per pip

    const pipValueStandard = 10; // $10 per pip for standard lot
    const pipValueMini = 1; // $1 per pip for mini lot
    const pipValueMicro = 0.1; // $0.10 per pip for micro lot

    // Calculate lot sizes
    const standardLots = riskAmount / (stopLossPips * pipValueStandard);
    const miniLots = riskAmount / (stopLossPips * pipValueMini);
    const microLots = riskAmount / (stopLossPips * pipValueMicro);

    // Calculate actual risk per lot type
    const actualRiskStandard = standardLots * stopLossPips * pipValueStandard;
    const actualRiskMini = miniLots * stopLossPips * pipValueMini;
    const actualRiskMicro = microLots * stopLossPips * pipValueMicro;

    const message =
      `🧮 *Position Size Calculator*\n\n` +
      `💵 Capital: $${capital.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n` +
      `⚠️ Risk: ${riskPercent}% ($${riskAmount.toFixed(2)})\n` +
      `🛑 Stop Loss: ${stopLossPips} pips\n\n` +
      `*Recommended Lot Sizes:*\n` +
      `├ 📊 Standard (1.0): ${standardLots.toFixed(2)} lots\n` +
      `├ 📈 Mini (0.1): ${miniLots.toFixed(2)} lots\n` +
      `└ 📉 Micro (0.01): ${microLots.toFixed(2)} lots\n\n` +
      `*Risk Per Trade:*\n` +
      `├ Standard: $${actualRiskStandard.toFixed(2)}\n` +
      `├ Mini: $${actualRiskMini.toFixed(2)}\n` +
      `└ Micro: $${actualRiskMicro.toFixed(2)}\n\n` +
      `_⚠️ Perhitungan ini untuk pasangan forex standar (XXX/USD)_`;

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }
}

/**
 * Help command for risk calculator
 */
export class RiskHelpCommand implements Command {
  pattern = /^\/risk$/;

  async execute(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const message =
      `🧮 *Position Size Calculator*\n\n` +
      `Hitung ukuran lot yang tepat berdasarkan:\n` +
      `• Modal (Capital)\n` +
      `• Persentase risiko\n` +
      `• Stop loss dalam pips\n\n` +
      `*Format:*\n` +
      `\`/risk [capital] [risk_%] [stoploss_pips]\`\n\n` +
      `*Contoh:*\n` +
      `\`/risk 10000 2 50\`\n` +
      `_→ $10,000 modal, 2% risk, 50 pips SL_\n\n` +
      `\`/risk 5000 1 30\`\n` +
      `_→ $5,000 modal, 1% risk, 30 pips SL_`;

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }
}
