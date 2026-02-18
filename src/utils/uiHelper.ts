import TelegramBot from "node-telegram-bot-api";
import { S } from "../config/symbols.js";
import { escapeMarkdown } from "./sanitize.js";

export { escapeMarkdown };

export interface ButtonConfig {
  text: string;
  callback_data: string;
}

export async function withLoading<T>(
  bot: TelegramBot,
  chatId: number,
  action: () => Promise<T>,
  chatAction: TelegramBot.ChatAction = "typing",
): Promise<T> {
  await bot.sendChatAction(chatId, chatAction);
  return action();
}

export function createGrid(buttons: ButtonConfig[], columns: number = 2): TelegramBot.InlineKeyboardButton[][] {
  const grid: TelegramBot.InlineKeyboardButton[][] = [];

  for (let i = 0; i < buttons.length; i += columns) {
    const row = buttons.slice(i, i + columns).map((btn) => ({
      text: btn.text,
      callback_data: btn.callback_data,
    }));
    grid.push(row);
  }

  return grid;
}

export function createConfirmButtons(
  yesData: string,
  noData: string,
  yesText: string = "Konfirmasi",
  noText: string = "Batal",
): TelegramBot.InlineKeyboardButton[][] {
  return [
    [
      { text: yesText, callback_data: yesData },
      { text: noText, callback_data: noData },
    ],
  ];
}

export function createNumberedButtons(
  prefix: string,
  count: number,
  columns: number = 5,
): TelegramBot.InlineKeyboardButton[][] {
  const maxCount = Math.min(count, 10);
  const buttons: ButtonConfig[] = [];

  for (let i = 1; i <= maxCount; i++) {
    buttons.push({
      text: `${i}`,
      callback_data: `${prefix}${i}`,
    });
  }

  return createGrid(buttons, columns);
}

export function createBackButton(callbackData: string, text: string = "Kembali"): TelegramBot.InlineKeyboardButton[][] {
  return [[{ text, callback_data: callbackData }]];
}

export const EXPENSE_CATEGORIES = [
  { text: "Makanan", callback_data: "exp_cat_food" },
  { text: "Transport", callback_data: "exp_cat_transport" },
  { text: "Tagihan", callback_data: "exp_cat_bills" },
  { text: "Belanja", callback_data: "exp_cat_shopping" },
  { text: "Hiburan", callback_data: "exp_cat_entertainment" },
  { text: "Lainnya", callback_data: "exp_cat_custom" },
];

export function createCategoryKeyboard(): TelegramBot.InlineKeyboardButton[][] {
  return createGrid(EXPENSE_CATEGORIES, 2);
}

export const MENU_CORE_BUTTONS = [
  { text: "Keuangan", callback_data: "menu_expense" },
  { text: "Trading", callback_data: "menu_trading" },
  { text: "Sholat", callback_data: "menu_prayer" },
  { text: "Kutipan", callback_data: "menu_quote" },
];

export const MENU_EXPERIMENTAL_BUTTONS = [
  { text: "Cuaca", callback_data: "menu_weather" },
  { text: "Berita", callback_data: "menu_news" },
  { text: "Anime", callback_data: "menu_anime" },
  { text: "Lirik", callback_data: "menu_lyrics" },
  { text: "Film", callback_data: "menu_movie" },
  { text: "GeoGuessr", callback_data: "menu_geoguessr" },
  { text: "Help", callback_data: "menu_help" },
];

export const MENU_LIFESTYLE_BUTTONS = [
  { text: `${S.NOTE} Vibe`, callback_data: "menu_vibe" },
  { text: `${S.PALETTE} Moodboard`, callback_data: "menu_moodboard" },
  { text: `${S.LENS} Hunt`, callback_data: "menu_hunt" },
  { text: `${S.BULB} Brainstorm`, callback_data: "menu_brainstorm" },
];

export function createMenuKeyboard(): TelegramBot.InlineKeyboardButton[][] {
  const coreGrid = createGrid(MENU_CORE_BUTTONS, 2);
  const lifestyleGrid = createGrid(MENU_LIFESTYLE_BUTTONS, 2);
  const experimentalGrid = createGrid(MENU_EXPERIMENTAL_BUTTONS, 3);

  const separator: TelegramBot.InlineKeyboardButton[] = [{ text: "· · ·", callback_data: "noop" }];

  return [...coreGrid, separator, ...lifestyleGrid, separator, ...experimentalGrid];
}

export const TRADING_BUTTONS = [
  { text: "Portfolio", callback_data: "trade_portfolio" },
  { text: "Buy", callback_data: "trade_buy" },
  { text: "Sell", callback_data: "trade_sell" },
  { text: "Alerts", callback_data: "trade_alerts" },
  { text: "Calendar", callback_data: "trade_calendar" },
  { text: "Kembali", callback_data: "menu_back" },
];

export function createTradingKeyboard(): TelegramBot.InlineKeyboardButton[][] {
  return createGrid(TRADING_BUTTONS, 2);
}

export const FINANCE_BUTTONS = [
  { text: "Catat", callback_data: "fin_catat" },
  { text: "Rekap", callback_data: "fin_rekap" },
  { text: "Laporan", callback_data: "fin_laporan" },
  { text: "Kembali", callback_data: "menu_back" },
];

export function createFinanceKeyboard(): TelegramBot.InlineKeyboardButton[][] {
  return createGrid(FINANCE_BUTTONS, 2);
}

export function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

export function formatUSD(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function createPaginationButtons(
  current: number,
  total: number,
  prefix: string,
): TelegramBot.InlineKeyboardButton[][] {
  if (total <= 1) return [];

  const buttons: TelegramBot.InlineKeyboardButton[] = [];

  if (current > 1) {
    buttons.push({ text: "Sebelumnya", callback_data: `${prefix}page_${current - 1}` });
  }

  buttons.push({ text: `${current}/${total}`, callback_data: `${prefix}page_current` });

  if (current < total) {
    buttons.push({ text: "Berikutnya", callback_data: `${prefix}page_${current + 1}` });
  }

  return [buttons];
}

export function createMarketDashboard(symbol: string): TelegramBot.InlineKeyboardButton[][] {
  return [
    [
      { text: "Chart", callback_data: `mkt_chart_${symbol}` },
      { text: "Sentimen", callback_data: `mkt_sent_${symbol}` },
    ],
    [
      { text: "Risk", callback_data: `mkt_risk_${symbol}` },
      { text: "Alert", callback_data: `mkt_alert_${symbol}` },
    ],
    [
      { text: "Jual", callback_data: `mkt_sell_${symbol}` },
      { text: "Beli", callback_data: `mkt_buy_${symbol}` },
    ],
    [{ text: "Kembali", callback_data: "menu_back" }],
  ];
}

export function createCapitalButtons(): TelegramBot.InlineKeyboardButton[][] {
  return [
    [
      { text: "$100", callback_data: "risk_cap_100" },
      { text: "$500", callback_data: "risk_cap_500" },
      { text: "$1,000", callback_data: "risk_cap_1000" },
    ],
    [
      { text: "$5,000", callback_data: "risk_cap_5000" },
      { text: "$10,000", callback_data: "risk_cap_10000" },
    ],
    [{ text: "Kustom", callback_data: "risk_cap_custom" }],
    [{ text: "Batal", callback_data: "risk_cancel" }],
  ];
}

export function createRiskPercentButtons(): TelegramBot.InlineKeyboardButton[][] {
  return [
    [
      { text: "0.5%", callback_data: "risk_pct_0.5" },
      { text: "1%", callback_data: "risk_pct_1" },
      { text: "2%", callback_data: "risk_pct_2" },
    ],
    [
      { text: "3%", callback_data: "risk_pct_3" },
      { text: "5%", callback_data: "risk_pct_5" },
    ],
    [{ text: "Kustom", callback_data: "risk_pct_custom" }],
    [{ text: "Kembali", callback_data: "risk_back_capital" }],
  ];
}

export function createStopLossButtons(): TelegramBot.InlineKeyboardButton[][] {
  return [
    [
      { text: "10 pips", callback_data: "risk_sl_10" },
      { text: "20 pips", callback_data: "risk_sl_20" },
      { text: "30 pips", callback_data: "risk_sl_30" },
    ],
    [
      { text: "50 pips", callback_data: "risk_sl_50" },
      { text: "100 pips", callback_data: "risk_sl_100" },
    ],
    [{ text: "Kustom", callback_data: "risk_sl_custom" }],
    [{ text: "Kembali", callback_data: "risk_back_percent" }],
  ];
}

export function createRiskResultButtons(): TelegramBot.InlineKeyboardButton[][] {
  return [
    [{ text: "Hitung Ulang", callback_data: "risk_restart" }],
    [{ text: "Menu Utama", callback_data: "menu_back" }],
  ];
}

export function getBackToMenuButton(): TelegramBot.InlineKeyboardButton[][] {
  return [[{ text: "Menu Utama", callback_data: "menu_back" }]];
}

export function appendMenuButton(keyboard: TelegramBot.InlineKeyboardButton[][]): TelegramBot.InlineKeyboardButton[][] {
  return [...keyboard, [{ text: "Menu Utama", callback_data: "menu_back" }]];
}

export async function safeEditMessage(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
  text: string,
  options?: TelegramBot.EditMessageTextOptions,
): Promise<boolean> {
  try {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      ...options,
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("message to edit not found") ||
      errorMessage.includes("message is not modified") ||
      errorMessage.includes("message can't be edited")
    ) {
      return false;
    }
    throw error;
  }
}
