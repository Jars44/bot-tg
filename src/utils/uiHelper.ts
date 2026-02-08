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

/**
 * Create pagination buttons for lists
 * UX Improvement: Navigate long lists without re-sending messages
 */
export function createPaginationButtons(
  current: number,
  total: number,
  prefix: string,
): TelegramBot.InlineKeyboardButton[][] {
  if (total <= 1) return [];

  const buttons: TelegramBot.InlineKeyboardButton[] = [];

  if (current > 1) {
    buttons.push({ text: "◀️ Prev", callback_data: `${prefix}page_${current - 1}` });
  }

  buttons.push({ text: `${current}/${total}`, callback_data: `${prefix}page_current` });

  if (current < total) {
    buttons.push({ text: "Next ▶️", callback_data: `${prefix}page_${current + 1}` });
  }

  return [buttons];
}

/**
 * Create Market Hub dashboard keyboard
 * UX Improvement: Centralized asset dashboard with all actions in one place
 */
export function createMarketDashboard(symbol: string): TelegramBot.InlineKeyboardButton[][] {
  return [
    [
      { text: "📊 Chart", callback_data: `mkt_chart_${symbol}` },
      { text: "🧠 Sentiment", callback_data: `mkt_sent_${symbol}` },
    ],
    [
      { text: "🧮 Calc Risk", callback_data: `mkt_risk_${symbol}` },
      { text: "🔔 Set Alert", callback_data: `mkt_alert_${symbol}` },
    ],
    [
      { text: "📉 SELL", callback_data: `mkt_sell_${symbol}` },
      { text: "📈 BUY", callback_data: `mkt_buy_${symbol}` },
    ],
    [{ text: "🔙 Back to Menu", callback_data: "menu_back" }],
  ];
}

/**
 * Create Risk Wizard capital selection keyboard
 * UX Improvement: Quick presets + custom input option
 */
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
    [{ text: "✏️ Custom", callback_data: "risk_cap_custom" }],
    [{ text: "❌ Batal", callback_data: "risk_cancel" }],
  ];
}

/**
 * Create Risk Wizard risk percentage keyboard
 * UX Improvement: Standard risk percentages used by traders
 */
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
    [{ text: "✏️ Custom", callback_data: "risk_pct_custom" }],
    [{ text: "⬅️ Kembali", callback_data: "risk_back_capital" }],
  ];
}

/**
 * Create Risk Wizard stop loss keyboard
 * UX Improvement: Common SL pip values for forex
 */
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
    [{ text: "✏️ Custom", callback_data: "risk_sl_custom" }],
    [{ text: "⬅️ Kembali", callback_data: "risk_back_percent" }],
  ];
}

/**
 * Create Risk Wizard result keyboard
 * UX Improvement: Allow recalculation or return to menu
 */
export function createRiskResultButtons(): TelegramBot.InlineKeyboardButton[][] {
  return [
    [{ text: "🔄 Hitung Ulang", callback_data: "risk_restart" }],
    [{ text: "🏠 Menu Utama", callback_data: "menu_back" }],
  ];
}

/**
 * Safe edit message wrapper - handles stale message errors gracefully
 * UX Improvement: Anti-spam by editing instead of sending new messages
 */
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
    // Message was deleted or is stale - need to send new message
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("message to edit not found") || errorMessage.includes("message is not modified")) {
      return false;
    }
    throw error;
  }
}
