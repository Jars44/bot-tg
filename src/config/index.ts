/**
 * Application configuration constants
 * All magic numbers and API URLs extracted here
 */

export const CONFIG = {
  /** Maximum stickers per user before rate limit */
  STICKER_LIMIT: 5,

  /** Rate limit reset interval in milliseconds (10 minutes) */
  RATE_LIMIT_RESET_MS: 10 * 60 * 1000,

  /** Temp file max age before cleanup in milliseconds (1 hour) */
  TEMP_FILE_MAX_AGE_MS: 60 * 60 * 1000,

  /** Maximum characters per line for sticker text */
  STICKER_MAX_CHARS_PER_LINE: 20,

  /** Sticker image dimensions */
  STICKER_SIZE: 512,

  /** HTTP request timeout in milliseconds */
  HTTP_TIMEOUT_MS: 30000,

  /** Default location for weather (fallback) */
  DEFAULT_LOCATION: {
    name: "Malang",
    lat: -7.98,
    lon: 112.63,
  },

  /** API endpoints */
  API: {
    BMKG_BASE: "https://data.bmkg.go.id/DataMKG/TEWS/",
    NOMINATIM: "https://nominatim.openstreetmap.org",
    OPEN_METEO: "https://api.open-meteo.com/v1",
    LYRICS: "https://api.lyrics.ovh/v1",
    FAVQS: "https://favqs.com/api/qotd",
    GNEWS: "https://gnews.io/api/v4",
    ALADHAN: "https://api.aladhan.com/v1",
    TMDB: "https://api.themoviedb.org/3",
    TMDB_IMAGE: "https://image.tmdb.org/t/p/w500",
    COBALT: "https://cobalt.canine.tools", // Universal Downloader (v10)
    FOREX_FACTORY: "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  },

  /** User-Agent header for APIs that require it (especially Nominatim) */
  USER_AGENT: "TelegramBot/2.0 (https://t.me/Jars44_Bot)",

  /** Font size mapping for sticker text based on longest line length */
  FONT_SIZE_MAP: {
    1: 280,
    3: 190,
    4: 160,
    5: 130,
    6: 110,
    7: 95,
    8: 85,
    9: 75,
    10: 68,
    11: 60,
    12: 55,
    13: 50,
    14: 45,
    15: 40,
  } as Record<number, number>,

  /** Default font size for longer text */
  DEFAULT_FONT_SIZE: 40,

  /** Maximum font size for short text */
  MAX_FONT_SIZE: 160,

  /** Paper Trading Configuration */
  PAPER_TRADING: {
    /** Starting virtual USD balance */
    INITIAL_BALANCE: 10000,
    /** Commission rate per trade (0.1%) */
    COMMISSION_RATE: 0.001,
  },

  /** Alert & Monitoring Thresholds */
  ALERTS: {
    /** Whale alert threshold in USD */
    WHALE_THRESHOLD_USD: 500000,
    /** Arbitrage opportunity threshold percentage */
    ARBITRAGE_THRESHOLD_PCT: 1.5,
    
    /** Price check interval in milliseconds (1 minute) */
    CHECK_INTERVAL_MS: 60 * 1000,
    /** Conversation state expiry in milliseconds (10 minutes) */
    STATE_EXPIRY_MS: 10 * 60 * 1000,
  },

  /** Sentiment Analysis Keywords */
  SENTIMENT: {
    BEARISH: ["crash", "plunge", "crisis", "dump", "sell-off", "bearish", "decline", "drop", "fall", "recession"],
    BULLISH: ["surge", "record", "bull", "rally", "breakout", "bullish", "gain", "rise", "soar", "moon"],
  },
} as const;

/** Environment variable keys */
export const ENV_KEYS = {
  BOT_TOKEN: "BOT_TOKEN",
  TMDB_API_KEY: "TMDB_API_KEY",
  GNEWS_API_TOKEN: "GNEWS_API_TOKEN",
} as const;

/** Get environment variable with validation */
export function getEnvVar(key: keyof typeof ENV_KEYS): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
