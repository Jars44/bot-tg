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
  command: "weather" | "prayer";
}

/** Lyrics search session data */
export interface LyricsSessionData {
  messageId: number;
}

/** TP/SL protection session data */
export interface TpSlSessionData {
  positionId: string;
  symbol: string;
  entryPrice: number;
  takeProfit?: number;
}

/** All possible session states */
export type SessionState =
  | { flow: "expense"; step: "type" | "amount" | "category" | "custom"; data: ExpenseSessionData }
  | { flow: "trade"; step: "confirm"; data: TradeSessionData }
  | { flow: "anime"; step: "select"; data: AnimeSessionData }
  | { flow: "lyrics"; step: "search"; data: LyricsSessionData }
  | { flow: "location"; step: "waiting"; data: LocationSessionData }
  | { flow: "tpsl"; step: "tp" | "sl"; data: TpSlSessionData }
  | null;

/** Session with metadata */
interface Session {
  state: SessionState;
  createdAt: number;
  updatedAt: number;
}

/** Session timeout in milliseconds (10 minutes) */
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

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
        const sessionState: SessionState = {
          flow: state.command as any,
          step: state.step as any,
          data: state.data as any,
        };

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
      flow: "expense",
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
    if (current?.flow !== "expense") return;

    this.setState(chatId, {
      flow: "expense",
      step,
      data: { ...current.data, ...data },
    });
  }

  /**
   * Start trade confirmation flow
   */
  startTradeConfirmation(chatId: number, data: TradeSessionData): void {
    this.setState(chatId, {
      flow: "trade",
      step: "confirm",
      data,
    });
  }

  /**
   * Start anime selection flow
   */
  startAnimeSelection(chatId: number, data: AnimeSessionData): void {
    this.setState(chatId, {
      flow: "anime",
      step: "select",
      data,
    });
  }

  /**
   * Start location request flow
   */
  startLocationRequest(chatId: number, command: "weather" | "prayer"): void {
    this.setState(chatId, {
      flow: "location",
      step: "waiting",
      data: { command },
    });
  }

  /**
   * Start lyrics search flow
   */
  startLyricsSearch(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: "lyrics",
      step: "search",
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
  return state !== null && state.flow === "anime";
}

/** Type guard for location session */
export function isLocationSession(state: SessionState): state is Extract<SessionState, { flow: "location" }> {
  return state !== null && state.flow === "location";
}
