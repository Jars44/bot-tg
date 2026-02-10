/**
 * Database type definitions
 * Extended for Financial Suite
 */

// ==================== Existing Types ====================

export interface Reminder {
  id: string;
  chatId: number;
  time: string; // Format: "HH:mm"
  message: string;
  createdAt: number;
}

export interface UserRateLimit {
  userId: number;
  stickerCount: number;
  lastReset: number;
}

// ==================== Financial Types ====================

/** Transaction type for expense tracking */
export type TransactionType = "expense" | "income";

/** Expense/Income transaction record */
export interface Transaction {
  id: string;
  chatId: number;
  type: TransactionType;
  amount: number;
  description: string;
  category?: string;
  createdAt: number;
}

/** Trading position (Long-only for MVP) */
export interface Position {
  id: string;
  symbol: string;
  entryPrice: number;
  quantity: number;
  type: "long";
  openedAt: number;
  /** Take Profit price level */
  takeProfit?: number;
  /** Stop Loss price level */
  stopLoss?: number;
}

/** Trade execution record */
export interface TradeRecord {
  id: string;
  symbol: string;
  action: "buy" | "sell";
  price: number;
  quantity: number;
  commission: number;
  pnl?: number;
  executedAt: number;
}

/** User's paper trading portfolio */
export interface Portfolio {
  chatId: number;
  cashBalance: number;
  positions: Position[];
  tradeHistory: TradeRecord[];
  createdAt: number;
}

/** Price alert condition operators */
export type AlertCondition = ">" | "<" | ">=" | "<=";

/** Price alert configuration */
export interface PriceAlert {
  id: string;
  chatId: number;
  symbol: string;
  targetPrice: number;
  condition: AlertCondition;
  createdAt: number;
  triggered: boolean;
}

/** Conversation state for multi-step commands */
export interface ConversationState {
  chatId: number;
  command: string;
  step: string;
  data: Record<string, unknown>;
  expiresAt: number;
}

// ==================== Database Schema ====================

export interface DatabaseSchema {
  reminders: Reminder[];
  rateLimits: UserRateLimit[];
  transactions: Transaction[];
  portfolios: Portfolio[];
  alerts: PriceAlert[];
  conversationStates: ConversationState[];
}

// ==================== Service Types ====================

/** Price data from any source */
export interface PriceData {
  symbol: string;
  price: number;
  change24h?: number;
  source: "crypto" | "forex" | "stock";
  timestamp: number;
}

/** Trade execution result */
export interface TradeResult {
  success: boolean;
  message: string;
  position?: Position;
  trade?: TradeRecord;
  pnl?: number;
}

/** Portfolio summary with live values */
export interface PortfolioSummary {
  cashBalance: number;
  equity: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  positions: PositionWithPnL[];
}

/** Position with calculated PnL */
export interface PositionWithPnL extends Position {
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

/** Sentiment analysis result */
export interface SentimentResult {
  sentiment: "Bullish" | "Bearish" | "Neutral";
  score: number; // -100 to +100
  headlines: { title: string; url: string }[];
  analysis: string;
  keyword: string;
}

/** Economic calendar event */
export interface EconomicEvent {
  title: string;
  country: string;
  impact: "high" | "medium" | "low";
  time: string;
  forecast?: string;
  previous?: string;
  date: string;
}

/** Transaction summary stats */
export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  count: number;
}
