export const CONFIG = {
  STICKER_LIMIT: 5,
  RATE_LIMIT_RESET_MS: 10 * 60 * 1000,
  TEMP_FILE_MAX_AGE_MS: 60 * 60 * 1000,
  STICKER_MAX_CHARS_PER_LINE: 20,
  STICKER_SIZE: 512,
  HTTP_TIMEOUT_MS: 30000,

  DEFAULT_LOCATION: {
    name: "Malang",
    lat: -7.98,
    lon: 112.63,
  },

  API: {
    BMKG_BASE: "https://data.bmkg.go.id/DataMKG/TEWS/",
    BMKG_API: "https://api.bmkg.go.id/publik/prakiraan-cuaca",
    BMKG_NOWCAST: "https://www.bmkg.go.id/alerts/nowcast/id",
    NOMINATIM: "https://nominatim.openstreetmap.org",
    OPEN_METEO: "https://api.open-meteo.com/v1/forecast",
    LYRICS: "https://lrclib.net/api/search",
    FAVQS: "https://favqs.com/api/qotd",
    GNEWS: "https://gnews.io/api/v4",
    ALADHAN: "https://api.aladhan.com/v1",
    TMDB: "https://api.themoviedb.org/3",
    TMDB_IMAGE: "https://image.tmdb.org/t/p/w500",
    COBALT: "https://cobalt.canine.tools",
    FOREX_FACTORY: "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  },

  USER_AGENT: "TelegramBot/2.0 (https://t.me/Jars44_Bot)",

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

  DEFAULT_FONT_SIZE: 40,
  MAX_FONT_SIZE: 160,

  PAPER_TRADING: {
    INITIAL_BALANCE: 10000,
    COMMISSION_RATE: 0.001,
  },

  ALERTS: {
    WHALE_THRESHOLD_USD: 500000,
    ARBITRAGE_THRESHOLD_PCT: 1.5,
    CHECK_INTERVAL_MS: 60 * 1000,
    STATE_EXPIRY_MS: 10 * 60 * 1000,
  },

  SENTIMENT: {
    BEARISH: ["crash", "plunge", "crisis", "dump", "sell-off", "bearish", "decline", "drop", "fall", "recession"],
    BULLISH: ["surge", "record", "bull", "rally", "breakout", "bullish", "gain", "rise", "soar", "moon"],
  },

  AI: {
    MAX_HISTORY_PAIRS: 5,
    MODEL: "gemini-2.5-flash",
  },
} as const;

export const ENV_KEYS = {
  BOT_TOKEN: "BOT_TOKEN",
  TMDB_API_KEY: "TMDB_API_KEY",
  GNEWS_API_TOKEN: "GNEWS_API_TOKEN",
  GEMINI_API_KEY: "GEMINI_API_KEY",
} as const;

export function getEnvVar(key: keyof typeof ENV_KEYS): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getOptionalEnvVar(key: string): string | null {
  return process.env[key] ?? null;
}
