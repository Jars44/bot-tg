export interface ExpenseSessionData {
  type?: "income" | "expense";
  amount?: number;
  category?: string;
}

export interface TradeSessionData {
  action: "buy" | "sell";
  symbol: string;
  quantity: number;
  price: number;
  messageId: number;
}

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

export interface LocationSessionData {
  pendingCommand?: "weather" | "prayer";
  messageId?: number;
}

export interface LyricsSessionData {
  messageId: number;
}

export interface MovieSessionData {
  messageId: number;
}

export interface TpSlSessionData {
  positionId: string;
  symbol: string;
  entryPrice: number;
  takeProfit?: number;
}

export interface MarketHubSessionData {
  symbol: string;
  messageId: number;
  previousView?: "chart" | "sentiment" | "risk" | "alert";
}

export interface DownloadSessionData {
  platform?: "youtube" | "tiktok" | "instagram" | "twitter" | "other";
  format?: "video" | "audio";
  messageId?: number;
}

export interface RiskSessionData {
  capital?: number;
  riskPercent?: number;
  stopLossPips?: number;
  messageId?: number;
}

export interface BuyWizardSessionData {
  symbol?: string;
  quantity?: number;
  messageId?: number;
}

export interface SellWizardSessionData {
  symbol?: string;
  quantity?: number;
  messageId?: number;
}

export interface WeatherMenuSessionData {
  messageId: number;
}

export interface PrayerMenuSessionData {
  messageId: number;
}

export interface SmartPasteSessionData {
  url: string;
  messageId: number;
}

export interface ChartSessionData {
  messageId: number;
}

export interface MoodboardSessionData {
  messageId: number;
}

export interface StickerSessionData {
  messageId: number;
  type?: "text" | "image";
}

export interface SentimentSessionData {
  messageId: number;
}

export interface AlertSessionData {
  messageId: number;
}

export interface ReminderSessionData {
  messageId: number;
}

export interface GeoGuessrSessionData {
  targetCountry: string;
  targetState: string | null;
  targetCity: string | null;
  formattedAddress: string;
  lat: number;
  lng: number;
  attempts: number;
  messageId: number;
  score: number;
}

export interface AiChatSessionData {
  history: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }>;
}

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
  | { flow: "sticker"; step: "type_selection" | "awaiting_text" | "awaiting_image" | "input"; data: StickerSessionData }
  | { flow: "sentiment"; step: "input"; data: SentimentSessionData }
  | { flow: "alert"; step: "input"; data: AlertSessionData }
  | { flow: "reminder"; step: "input"; data: ReminderSessionData }
  | { flow: "geoguessr"; step: "guessing"; data: GeoGuessrSessionData }
  | { flow: "ai_chat"; step: "chatting"; data: AiChatSessionData }
  | { flow: "moodboard"; step: "keyword_input"; data: MoodboardSessionData }
  | null;

interface Session {
  state: SessionState;
  createdAt: number;
  updatedAt: number;
}

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

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
  GEOGUESSR: "geoguessr",
  AI_CHAT: "ai_chat",
  MOODBOARD: "moodboard",
} as const;

import type { JsonDb } from "../database/JsonDb.js";

export class SessionManager {
  private sessions: Map<number, Session> = new Map();
  private db: JsonDb | null = null;

  async initialize(db: JsonDb): Promise<void> {
    this.db = db;

    try {
      const states = await this.db.getAllConversationStates();

      for (const state of states) {
        if (state.expiresAt < Date.now()) continue;

        const sessionState: SessionState = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          flow: state.command as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          step: state.step as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: state.data as any,
        };

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

  getState(chatId: number): SessionState {
    const session = this.sessions.get(chatId);

    if (!session) return null;

    if (Date.now() - session.updatedAt > SESSION_TIMEOUT_MS) {
      this.clearState(chatId);
      return null;
    }

    return session.state;
  }

  async setState(chatId: number, state: SessionState): Promise<void> {
    const now = Date.now();
    const existing = this.sessions.get(chatId);

    this.sessions.set(chatId, {
      state,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    if (this.db && state) {
      await this.db.setConversationState(chatId, state.flow, state.step, state.data as Record<string, unknown>);
    }
  }

  async clearState(chatId: number): Promise<void> {
    this.sessions.delete(chatId);

    if (this.db) {
      await this.db.clearConversationState(chatId);
    }
  }

  hasActiveSession(chatId: number): boolean {
    return this.getState(chatId) !== null;
  }

  isInFlow(chatId: number, flow: NonNullable<SessionState>["flow"]): boolean {
    const state = this.getState(chatId);
    return state !== null && state.flow === flow;
  }

  startExpenseFlow(chatId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.EXPENSE,
      step: "type",
      data: {},
    });
  }

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

  startTradeConfirmation(chatId: number, data: TradeSessionData): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.TRADE,
      step: "confirm",
      data,
    });
  }

  startAnimeSelection(chatId: number, data: AnimeSessionData): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.ANIME,
      step: "select",
      data,
    });
  }

  startLocationRequest(chatId: number, pendingCommand: "weather" | "prayer", messageId?: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.LOCATION,
      step: "waiting",
      data: { pendingCommand, messageId },
    });
  }

  startLyricsSearch(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.LYRICS,
      step: "search",
      data: { messageId },
    });
  }

  startAnimeSearch(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.ANIME,
      step: "search",
      data: { results: [], messageId },
    });
  }

  startMovieSearch(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.MOVIE,
      step: "search",
      data: { messageId },
    });
  }

  startRiskWizard(chatId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.RISK,
      step: "capital",
      data: {},
    });
  }

  updateRiskData(chatId: number, data: Partial<RiskSessionData>): void {
    const current = this.getState(chatId);
    if (current?.flow !== SESSION_FLOWS.RISK) return;

    this.setState(chatId, {
      flow: SESSION_FLOWS.RISK,
      step: current.step,
      data: { ...current.data, ...data },
    });
  }

  setRiskStep(chatId: number, step: "capital" | "risk_percent" | "stop_loss" | "result"): void {
    const current = this.getState(chatId);
    if (current?.flow !== SESSION_FLOWS.RISK) return;

    this.setState(chatId, {
      flow: SESSION_FLOWS.RISK,
      step,
      data: current.data,
    });
  }

  startWeatherMenu(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.WEATHER_MENU,
      step: "city_input",
      data: { messageId },
    });
  }

  startPrayerMenu(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.PRAYER_MENU,
      step: "city_input",
      data: { messageId },
    });
  }

  startSmartPaste(chatId: number, url: string, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.SMART_PASTE,
      step: "confirm",
      data: { url, messageId },
    });
  }

  startBuyWizard(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.BUY_WIZARD,
      step: "symbol",
      data: { messageId },
    });
  }

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

  startMoodboardMenu(chatId: number, messageId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.MOODBOARD,
      step: "keyword_input",
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

  startAiChat(chatId: number): void {
    this.setState(chatId, {
      flow: SESSION_FLOWS.AI_CHAT,
      step: "chatting",
      data: { history: [] },
    });
  }

  updateAiChatHistory(chatId: number, role: "user" | "model", text: string): void {
    const current = this.getState(chatId);
    if (current?.flow !== SESSION_FLOWS.AI_CHAT) return;

    const newMessage = { role, parts: [{ text }] };
    const updatedHistory = [...current.data.history, newMessage];

    const MAX_MESSAGES = 10;
    const trimmedHistory = updatedHistory.slice(-MAX_MESSAGES);

    this.setState(chatId, {
      flow: SESSION_FLOWS.AI_CHAT,
      step: "chatting",
      data: { history: trimmedHistory },
    });
  }

  shouldShowMenuButton(chatId: number): boolean {
    const state = this.getState(chatId);
    return state !== null && (state.flow === SESSION_FLOWS.WEATHER_MENU || state.flow === SESSION_FLOWS.PRAYER_MENU);
  }

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

  getSessionCount(): number {
    return this.sessions.size;
  }
}

export const sessionManager = new SessionManager();

export function isExpenseSession(state: SessionState): state is Extract<SessionState, { flow: "expense" }> {
  return state !== null && state.flow === "expense";
}

export function isTradeSession(state: SessionState): state is Extract<SessionState, { flow: "trade" }> {
  return state !== null && state.flow === "trade";
}

export function isAnimeSession(state: SessionState): state is Extract<SessionState, { flow: "anime" }> {
  return state !== null && state.flow === SESSION_FLOWS.ANIME;
}

export function isLocationSession(state: SessionState): state is Extract<SessionState, { flow: "location" }> {
  return state !== null && state.flow === "location";
}

export function isMarketHubSession(state: SessionState): state is Extract<SessionState, { flow: "market_hub" }> {
  return state !== null && state.flow === "market_hub";
}

export function isRiskSession(state: SessionState): state is Extract<SessionState, { flow: "risk" }> {
  return state !== null && state.flow === SESSION_FLOWS.RISK;
}

export function isMovieSession(state: SessionState): state is Extract<SessionState, { flow: "movie" }> {
  return state !== null && state.flow === "movie";
}

export function isWeatherMenuSession(state: SessionState): state is Extract<SessionState, { flow: "weather_menu" }> {
  return state !== null && state.flow === "weather_menu";
}

export function isPrayerMenuSession(state: SessionState): state is Extract<SessionState, { flow: "prayer_menu" }> {
  return state !== null && state.flow === "prayer_menu";
}

export function isSmartPasteSession(state: SessionState): state is Extract<SessionState, { flow: "smart_paste" }> {
  return state !== null && state.flow === "smart_paste";
}

export function isStickerSession(state: SessionState): state is Extract<SessionState, { flow: "sticker" }> {
  return state !== null && state.flow === SESSION_FLOWS.STICKER;
}
