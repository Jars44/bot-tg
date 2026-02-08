/**
 * UI Helper Utilities
 * Common UI patterns for Telegram bot interactions
 */

import TelegramBot from "node-telegram-bot-api";

/** Button type for inline keyboard */
export interface ButtonConfig {
  text: string;
  callback_data: string;
}

/**
 * Execute an action while showing "typing" indicator
 * Automatically sends chat action before running the async operation
 *
 * @param bot - Telegram bot instance
 * @param chatId - Chat ID to send action to
 * @param action - Async function to execute
 * @param chatAction - Type of action indicator (default: "typing")
 * @returns Result of the action function
 */
export async function withLoading<T>(
  bot: TelegramBot,
  chatId: number,
  action: () => Promise<T>,
  chatAction: TelegramBot.ChatAction = "typing",
): Promise<T> {
  // Send chat action indicator
  await bot.sendChatAction(chatId, chatAction);

  // Execute the actual action
  return action();
}

/**
 * Create a grid layout for inline keyboard buttons
 *
 * @param buttons - Array of button configs
 * @param columns - Number of columns per row (default: 2)
 * @returns 2D array suitable for inline_keyboard
 */
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

/**
 * Create standard confirmation buttons (Execute / Cancel)
 *
 * @param yesData - Callback data for "Yes/Execute" button
 * @param noData - Callback data for "No/Cancel" button
 * @param yesText - Custom text for yes button (default: ✅ Execute)
 * @param noText - Custom text for no button (default: ❌ Batal)
 * @returns Inline keyboard row with two buttons
 */
export function createConfirmButtons(
  yesData: string,
  noData: string,
  yesText: string = "✅ Execute",
  noText: string = "❌ Batal",
): TelegramBot.InlineKeyboardButton[][] {
  return [
    [
      { text: yesText, callback_data: yesData },
      { text: noText, callback_data: noData },
    ],
  ];
}

/**
 * Create a numbered selection list (1, 2, 3, 4, 5)
 *
 * @param prefix - Callback data prefix (e.g., "anime_sel_")
 * @param count - Number of items (max 10)
 * @param columns - Buttons per row (default: 5)
 * @returns Inline keyboard with numbered buttons
 */
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

/**
 * Create a back button
 *
 * @param callbackData - Callback data for back action
 * @param text - Button text (default: ⬅️ Kembali)
 * @returns Inline keyboard row with back button
 */
export function createBackButton(
  callbackData: string,
  text: string = "⬅️ Kembali",
): TelegramBot.InlineKeyboardButton[][] {
  return [[{ text, callback_data: callbackData }]];
}

/**
 * Category buttons for expense tracking
 */
export const EXPENSE_CATEGORIES = [
  { text: "🍔 Makanan", callback_data: "exp_cat_food" },
  { text: "🚗 Transport", callback_data: "exp_cat_transport" },
  { text: "🏠 Tagihan", callback_data: "exp_cat_bills" },
  { text: "🛍️ Belanja", callback_data: "exp_cat_shopping" },
  { text: "🎮 Hiburan", callback_data: "exp_cat_entertainment" },
  { text: "✏️ Lainnya", callback_data: "exp_cat_custom" },
];

/**
 * Create expense category keyboard
 */
export function createCategoryKeyboard(): TelegramBot.InlineKeyboardButton[][] {
  return createGrid(EXPENSE_CATEGORIES, 2);
}

/**
 * Main menu buttons for dashboard
 */
export const MENU_BUTTONS = [
  { text: "🌤 Cuaca", callback_data: "menu_weather" },
  { text: "🕌 Sholat", callback_data: "menu_prayer" },
  { text: "💰 Keuangan", callback_data: "menu_expense" },
  { text: "📉 Trading", callback_data: "menu_trading" },
  { text: "🎬 Anime", callback_data: "menu_anime" },
  { text: "🎵 Lirik", callback_data: "menu_lyrics" },
  { text: "📰 Berita", callback_data: "menu_news" },
  { text: "❓ Bantuan", callback_data: "menu_help" },
];

/**
 * Create main menu keyboard
 */
export function createMenuKeyboard(): TelegramBot.InlineKeyboardButton[][] {
  return createGrid(MENU_BUTTONS, 2);
}

/**
 * Trading sub-menu buttons
 */
export const TRADING_BUTTONS = [
  { text: "📊 Portfolio", callback_data: "trade_portfolio" },
  { text: "📈 Buy", callback_data: "trade_buy" },
  { text: "📉 Sell", callback_data: "trade_sell" },
  { text: "🔔 Alerts", callback_data: "trade_alerts" },
  { text: "📅 Calendar", callback_data: "trade_calendar" },
  { text: "⬅️ Menu", callback_data: "menu_back" },
];

/**
 * Create trading sub-menu keyboard
 */
export function createTradingKeyboard(): TelegramBot.InlineKeyboardButton[][] {
  return createGrid(TRADING_BUTTONS, 2);
}

/**
 * Finance sub-menu buttons
 */
export const FINANCE_BUTTONS = [
  { text: "📝 Catat", callback_data: "fin_catat" },
  { text: "📊 Rekap", callback_data: "fin_rekap" },
  { text: "📈 Laporan", callback_data: "fin_laporan" },
  { text: "⬅️ Menu", callback_data: "menu_back" },
];

/**
 * Create finance sub-menu keyboard
 */
export function createFinanceKeyboard(): TelegramBot.InlineKeyboardButton[][] {
  return createGrid(FINANCE_BUTTONS, 2);
}

/**
 * Format currency in Indonesian Rupiah
 */
export function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

/**
 * Format currency in USD
 */
export function formatUSD(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Escape markdown special characters
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}
