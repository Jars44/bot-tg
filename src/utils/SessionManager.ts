/**
 * Session Manager
 * In-memory state manager for interactive wizard flows
 * Tracks user states for multi-step command interactions
 */

/** Expense flow session data */
export interface ExpenseSessionData {
  type?: "income" | "expense";
  amount?: number;
  category?: string;
}

/** Trade confirmation session data */
export interface TradeSessionData {
  action: "buy" | "sell";
  symbol: string;
  quantity: number;
  price: number;
  messageId: number;
}

/** Anime selection session data */
export interface AnimeSessionData {
  results: Array<{
    id: number;
    title: string;
    type: string;
    score: number | null;
    imageUrl: string;
    url: string;
    synopsis: string;
    year: number | null;
  }>;
  messageId: number;
}

/** Location request session data */
export interface LocationSessionData {
  pendingCommand?: "weather" | "prayer";
}

/** Lyrics search session data */
export interface LyricsSessionData {
  messageId: number;
}

/** Movie search session data */
export interface MovieSessionData {
  messageId: number;
}

/** TP/SL protection session data */
export interface TpSlSessionData {
  positionId: string;
  symbol: string;
  entryPrice: number;
  takeProfit?: number;
}

/** Market Hub session data - Asset-centric dashboard */
export interface MarketHubSessionData {
  symbol: string;
  messageId: number;
  previousView?: "chart" | "sentiment" | "risk" | "alert";
}

/** Download wizard session data */
export interface DownloadSessionData {
  platform?: "youtube" | "tiktok" | "instagram" | "twitter" | "other";
  format?: "video" | "audio";
  messageId?: number;
}

/** Risk Wizard session data - Interactive position sizing calculator */
export interface RiskSessionData {
  capital?: number;
  riskPercent?: number;
  stopLossPips?: number;
  messageId?: number;
}

/** Buy Wizard session data */
export interface BuyWizardSessionData {
  symbol?: string;
  quantity?: number;
  messageId?: number;
}

/** Sell Wizard session data */
export interface SellWizardSessionData {
  symbol?: string;
  quantity?: number;
  messageId?: number;
}

/** Weather menu wizard session data */
export interface WeatherMenuSessionData {
  messageId: number;
}

/** Prayer menu wizard session data */
export interface PrayerMenuSessionData {
  messageId: number;
}

/** Smart Paste session data - stores detected URL for confirmation */
export interface SmartPasteSessionData {
  url: string;
  messageId: number;
}

/** Chart wizard session data */
export interface ChartSessionData {
  messageId: number;
}

/** Sticker wizard session data */
export interface StickerSessionData {
  messageId: number;
}

/** Sentiment wizard session data */
export interface SentimentSessionData {
  messageId: number;
}

/** Alert wizard session data */
export interface AlertSessionData {
  messageId: number;
}

/** Reminder wizard session data */
export interface ReminderSessionData {
  messageId: number;
}

/** All possible session states */
export type SessionState =
  | { flow: "expense"; step: "type" | "amount" | "category" | "custom"; data: ExpenseSessionData }
  | { flow: "trade"; step: "confirm"; data: TradeSessionData }
  | { flow: "anime"; step: "search" | "select"; data: AnimeSessionData }
  | { flow: "lyrics"; step: "search"; data: LyricsSessionData }
  | { flow: "movie"; step: "search"; data: MovieSessionData }
  | { flow: "location"; step: "waiting"; data: LocationSessionData }
  | { flow: "tpsl"; step: "tp" | "sl"; data: TpSlSessionData }
  | { flow: "market_hub"; step: "symbol_input" | "dashboard"; data: MarketHubSessionData }
  | { flow: "risk"; step: "capital" | "risk_percent" | "stop_loss" | "result"; data: RiskSessionData }
  | { flow: "buy_wizard"; step: "symbol" | "quantity"; data: BuyWizardSessionData }
  | { flow: "sell_wizard"; step: "symbol" | "quantity"; data: SellWizardSessionData }
  | { flow: "download"; step: "platform" | "format" | "url"; data: DownloadSessionData }
  | { flow: "weather_menu"; step: "city_input"; data: WeatherMenuSessionData }
  | { flow: "prayer_menu"; step: "city_input"; data: PrayerMenuSessionData }
  | { flow: "smart_paste"; step: "confirm"; data: SmartPasteSessionData }
  | { flow: "chart"; step: "input"; data: ChartSessionData }
  | { flow: "sticker"; step: "input"; data: StickerSessionData }
  | { flow: "sentiment"; step: "input"; data: SentimentSessionData }
  | { flow: "alert"; step: "input"; data: AlertSessionData }
  | { flow: "reminder"; step: "input"; data: ReminderSessionData }
  | null;

/** Session with metadata */
interface Session {
  state: SessionState;
  createdAt: number;
  updatedAt: number;
}

/** Session timeout in milliseconds (10 minutes) */
/** Session timeout in milliseconds (10 minutes) */
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

/** Centralized Session Flow Keys */
export const SESSION_FLOWS = {
  EXPENSE: "expense",
  TRADE: "trade",
  ANIME: "anime",
  LYRICS: "lyrics",
  MOVIE: "movie",
  LOCATION: "location",
  TPSL: "tpsl",
  MARKET_HUB: "market_hub",
  RISK: "risk",
  BUY_WIZARD: "buy_wizard",
  SELL_WIZARD: "sell_wizard",
  DOWNLOAD: "download",
  WEATHER_MENU: "weather_menu",
  PRAYER_MENU: "prayer_menu",
  SMART_PASTE: "smart_paste",
  CHART: "chart",
  STICKER: "sticker",
  SENTIMENT: "sentiment",
  ALERT: "alert",
  REMINDER: "reminder",
} as const;

/**
 * In-memory session manager for wizard flows
 * Sessions are ephemeral and reset on bot restart
 */
import type { JsonDb } from "../database/JsonDb.js"; // Import type only to avoid circular dependency issues if any

/**
 * In-memory session manager for wizard flows with JSON persistence
 * Sessions are cached in memory for speed but persisted to DB
 */
export class SessionManager {
  private sessions: Map<number, Session> = new Map();
  private db: JsonDb | null = null;

  /**
   * Initialize with database instance and load persisted sessions
   */
  async initialize(db: JsonDb): Promise<void> {
    this.db = db;

    // Load persisted sessions
    try {
      const states = await this.db.getAllConversationStates();

      for (const state of states) {
        // Skip expired sessions (double check)
        if (state.expiresAt < Date.now()) continue;

        // Map ConversationState to Session structure
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const sessionState: SessionState = {
          flow: state.command as any,
          step: state.step as any,
          data: state.data as any,
        };
        /* eslint-enable @typescript-eslint/no-explicit-any */

        // Populate cache
        // Estimated updatedAt based on expiresAt
        const estimatedUpdatedAt = state.expiresAt - SESSION_TIMEOUT_MS;

        this.sessions.set(state.chatId, {
          state: sessionState,
          createdAt: estimatedUpdatedAt,
          updatedAt: estimatedUpdatedAt,
        });
      }

      console.log(`[SessionManager] Loaded ${states.length} active sessions from DB`);
    } catch (error) {
      console.error("[SessionManager] Failed to load sessions:", error);
    }
  }

  /**
   * Get user session state
   */
  getState(chatId: number): SessionState {
    const session = this.sessions.get(chatId);

    if (!session) return null;

    // Check if session has expired
    if (Date.now() - session.updatedAt > SESSION_TIMEOUT_MS) {
      this.clearState(chatId);
      return null;
    }

    return session.state;
  }

  /**
   * Set user session state
   */
  async setState(chatId: number, state: SessionState): Promise<void> {
    const now = Date.now();
    const existing = this.sessions.get(chatId);

    // Update in-memory
    this.sessions.set(chatId, {
      state,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    // Update DB if initialized
    if (this.db && state) {
      await this.db.setConversationState(chatId, state.flow, state.step, state.data as Record<string, unknown>);
    }
  }

  /**
   * Clear user session
   */
  async clearState(chatId: number): Promise<void> {
    this.sessions.delete(chatId);

    if (this.db) {
      await this.db.clearConversationState(chatId);
    }
  }

  /**
   * Check if user has an active session
   */
  hasActiveSession(chatId: number): boolean {
    return this.getState(chatId) !== null;
  }

  /**
   * Check if user is in a specific flow
   */
  isInFlow(chatId: number, flow: NonNullable<SessionState>["flow"]): boolean {
    const state = this.getState(chatId);
    return state !== null && state.flow === flow;
  }

  /**
   * Start expense flow
   */
  startExpenseFlow(chatId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.EXPENSE,
      step: "type",
      data: {},
    });
  }

  /**
   * Update expense flow with new data
   */
  updateExpenseFlow(
    chatId: number,
    step: "type" | "amount" | "category" | "custom",
    data: Partial<ExpenseSessionData>,
  ): void {
    const current = this.getState(chatId);
    if (current?.flow !== SESSION_FLOWS.EXPENSE) return;

    this.setState(chatId, {
      flow: SESSION_FLOWS.EXPENSE,
      step,
      data: { ...current.data, ...data },
    });
  }

  /**
   * Start trade confirmation flow
   */
  startTradeConfirmation(chatId: number, data: TradeSessionData): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.TRADE,
      step: "confirm",
      data,
    });
  }

  /**
   * Start anime selection flow
   */
  startAnimeSelection(chatId: number, data: AnimeSessionData): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.ANIME,
      step: "select",
      data,
    });
  }

  /**
   * Start location request flow
   */
  startLocationRequest(chatId: number, pendingCommand: "weather" | "prayer"): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.LOCATION,
      step: "waiting",
      data: { pendingCommand },
    });
  }

  /**
   * Start lyrics search flow
   */
  startLyricsSearch(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.LYRICS,
      step: "search",
      data: { messageId },
    });
  }

  /**
   * Start anime search flow (from menu)
   */
  startAnimeSearch(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.ANIME,
      step: "search",
      data: { results: [], messageId },
    });
  }

  /**
   * Start movie search flow
   */
  startMovieSearch(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.MOVIE,
      step: "search",
      data: { messageId },
    });
  }

  /**
   * Start risk wizard flow
   */
  startRiskWizard(chatId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.RISK,
      step: "capital",
      data: {},
    });
  }

  /**
   * Update risk session data
   */
  updateRiskData(chatId: number, data: Partial<RiskSessionData>): void {
    const current = this.getState(chatId);
    if (current?.flow !== SESSION_FLOWS.RISK) return;

    this.setState(chatId, {
      flow: SESSION_FLOWS.RISK,
      step: current.step,
      data: { ...current.data, ...data },
    });
  }

  /**
   * Set risk wizard step
   */
  setRiskStep(chatId: number, step: "capital" | "risk_percent" | "stop_loss" | "result"): void {
    const current = this.getState(chatId);
    if (current?.flow !== SESSION_FLOWS.RISK) return;

    this.setState(chatId, {
      flow: SESSION_FLOWS.RISK,
      step,
      data: current.data,
    });
  }

  /**
   * Start weather menu wizard flow
   */
  startWeatherMenu(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.WEATHER_MENU,
      step: "city_input",
      data: { messageId },
    });
  }

  /**
   * Start prayer menu wizard flow
   */
  startPrayerMenu(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.PRAYER_MENU,
      step: "city_input",
      data: { messageId },
    });
  }

  /**
   * Start smart paste confirmation flow
   */
  startSmartPaste(chatId: number, url: string, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.SMART_PASTE,
      step: "confirm",
      data: { url, messageId },
    });
  }

  /**
   * Start buy wizard flow
   */
  startBuyWizard(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.BUY_WIZARD,
      step: "symbol",
      data: { messageId },
    });
  }

  /**
   * Start sell wizard flow
   */
  /**
   * Start sell wizard flow
   */
  startSellWizard(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.SELL_WIZARD,
      step: "symbol",
      data: { messageId },
    });
  }

  startChartWizard(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.CHART,
      step: "input",
      data: { messageId },
    });
  }

  startStickerWizard(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.STICKER,
      step: "input",
      data: { messageId },
    });
  }

  startSentimentWizard(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.SENTIMENT,
      step: "input",
      data: { messageId },
    });
  }

  startAlertWizard(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.ALERT,
      step: "input",
      data: { messageId },
    });
  }

  startReminderWizard(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.REMINDER,
      step: "input",
      data: { messageId },
    });
  }

  /**
   * Cleanup expired sessions (call periodically)
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [chatId, session] of this.sessions.entries()) {
      if (now - session.updatedAt > SESSION_TIMEOUT_MS) {
        this.sessions.delete(chatId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get session count (for debugging)
   */
  getSessionCount(): number {
    return this.sessions.size;
  }
}

/** Singleton instance */
export const sessionManager = new SessionManager();

/** Type guard for expense session */
export function isExpenseSession(state: SessionState): state is Extract<SessionState, { flow: "expense" }> {
  return state !== null && state.flow === "expense";
}

/** Type guard for trade session */
export function isTradeSession(state: SessionState): state is Extract<SessionState, { flow: "trade" }> {
  return state !== null && state.flow === "trade";
}

/** Type guard for anime session */
export function isAnimeSession(state: SessionState): state is Extract<SessionState, { flow: "anime" }> {
  return state !== null && state.flow === SESSION_FLOWS.ANIME;
}

/** Type guard for location session */
export function isLocationSession(state: SessionState): state is Extract<SessionState, { flow: "location" }> {
  return state !== null && state.flow === "location";
}

/** Type guard for market hub session */
export function isMarketHubSession(state: SessionState): state is Extract<SessionState, { flow: "market_hub" }> {
  return state !== null && state.flow === "market_hub";
}

/** Type guard for risk session */
export function isRiskSession(state: SessionState): state is Extract<SessionState, { flow: "risk" }> {
  return state !== null && state.flow === SESSION_FLOWS.RISK;
}

/** Type guard for movie session */
export function isMovieSession(state: SessionState): state is Extract<SessionState, { flow: "movie" }> {
  return state !== null && state.flow === "movie";
}

/** Type guard for weather menu session */
export function isWeatherMenuSession(state: SessionState): state is Extract<SessionState, { flow: "weather_menu" }> {
  return state !== null && state.flow === "weather_menu";
}

/** Type guard for prayer menu session */
export function isPrayerMenuSession(state: SessionState): state is Extract<SessionState, { flow: "prayer_menu" }> {
  return state !== null && state.flow === "prayer_menu";
}

/** Type guard for smart paste session */
export function isSmartPasteSession(state: SessionState): state is Extract<SessionState, { flow: "smart_paste" }> {
  return state !== null && state.flow === "smart_paste";
}
