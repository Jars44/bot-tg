export interface Reminder {
  id: string;
  chatId: number;
  time: string;
  message: string;
  createdAt: number;
}

export interface UserRateLimit {
  userId: number;
  stickerCount: number;
  lastReset: number;
}

export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  chatId: number;
  type: TransactionType;
  amount: number;
  description: string;
  category?: string;
  createdAt: number;
}

export interface Position {
  id: string;
  symbol: string;
  entryPrice: number;
  quantity: number;
  type: "long";
  openedAt: number;
  takeProfit?: number;
  stopLoss?: number;
}

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

export interface Portfolio {
  chatId: number;
  cashBalance: number;
  positions: Position[];
  tradeHistory: TradeRecord[];
  createdAt: number;
}

export type AlertCondition = ">" | "<" | ">=" | "<=";

export interface PriceAlert {
  id: string;
  chatId: number;
  symbol: string;
  targetPrice: number;
  condition: AlertCondition;
  createdAt: number;
  triggered: boolean;
}

export interface ConversationState {
  chatId: number;
  command: string;
  step: string;
  data: Record<string, unknown>;
  expiresAt: number;
}

export interface DatabaseSchema {
  reminders: Reminder[];
  rateLimits: UserRateLimit[];
  transactions: Transaction[];
  portfolios: Portfolio[];
  alerts: PriceAlert[];
  conversationStates: ConversationState[];
}

export interface PriceData {
  symbol: string;
  price: number;
  change24h?: number;
  source: "crypto" | "forex" | "stock";
  timestamp: number;
}

export interface TradeResult {
  success: boolean;
  message: string;
  position?: Position;
  trade?: TradeRecord;
  pnl?: number;
}

export interface PortfolioSummary {
  cashBalance: number;
  equity: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  positions: PositionWithPnL[];
}

export interface PositionWithPnL extends Position {
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface SentimentResult {
  sentiment: "Bullish" | "Bearish" | "Neutral";
  score: number;
  headlines: { title: string; url: string }[];
  analysis: string;
  keyword: string;
}

export interface EconomicEvent {
  title: string;
  country: string;
  impact: "high" | "medium" | "low";
  time: string;
  forecast?: string;
  previous?: string;
  date: string;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  count: number;
}
