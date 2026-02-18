/**
 * Vibe Service — Audio & Scent Sync
 * Curates a personalized "vibe" (Music + Perfume) based on
 * user location, weather conditions, and time of day.
 *
 * Primary: AI-generated via Gemini Flash 2.5
 * Fallback: Hardcoded weather→vibe mapping
 */

import type { AIService } from "./GenAIService.js";
import type { WeatherService, WeatherData } from "./WeatherService.js";
import type { HttpClient } from "./HttpClient.js";
import { CONFIG } from "../config/index.js";

// ─── Types ────────────────────────────────────────────────────

export interface VibeProfile {
  mood: string;
  music: {
    track: string;
    artist: string;
    genre: string;
    spotifyUrl: string | null;
  };
  scent: {
    name: string;
    brand: string;
    topNotes: string[];
    baseNotes: string[];
    description: string;
  };
  caption: string;
}

interface AIVibeResponse {
  mood: string;
  music: {
    track: string;
    artist: string;
    genre: string;
    spotifyUrl: string | null;
  };
  scent: {
    name: string;
    brand: string;
    topNotes: string[];
    baseNotes: string[];
    description: string;
  };
  caption: string;
}

type WeatherCondition = "rain" | "clear_day" | "clear_night" | "cloudy" | "hot" | "cold" | "windy";

interface NominatimReverseResult {
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

// ─── Fallback Data ────────────────────────────────────────────

const FALLBACK_VIBES: Map<WeatherCondition, VibeProfile> = new Map([
  [
    "rain",
    {
      mood: "Melancholic",
      music: {
        track: "Somewhere Only We Know",
        artist: "Keane",
        genre: "Alternative / Indie",
        spotifyUrl: "https://open.spotify.com/track/0ll8uFnPOGAMpUKKEPMbsd",
      },
      scent: {
        name: "Petrichor & Tobacco",
        brand: "Maison Margiela",
        topNotes: ["Petrichor", "Green Leaves"],
        baseNotes: ["Tobacco", "Cedarwood", "Musk"],
        description: "Earthy rain scent with warm tobacco undertones",
      },
      caption: "Rain washed streets. Old playlists. The scent of wet earth.",
    },
  ],
  [
    "clear_night",
    {
      mood: "Dark Academia",
      music: {
        track: "Motion Sickness",
        artist: "Phoebe Bridgers",
        genre: "Indie Folk",
        spotifyUrl: "https://open.spotify.com/track/3bHe6LpjJMLMhQFNzXOLhn",
      },
      scent: {
        name: "Oud & Amber Noir",
        brand: "Tom Ford",
        topNotes: ["Black Pepper", "Saffron"],
        baseNotes: ["Oud", "Amber", "Sandalwood"],
        description: "Deep, mysterious. Library shelves and candlelight.",
      },
      caption: "Midnight ink. Worn leather. Pages yet unread.",
    },
  ],
  [
    "clear_day",
    {
      mood: "Golden Hour",
      music: {
        track: "Heat Waves",
        artist: "Glass Animals",
        genre: "Indie Pop",
        spotifyUrl: "https://open.spotify.com/track/02MWAaffLxlfxAUY7c5dvx",
      },
      scent: {
        name: "Bergamot & Honey",
        brand: "Jo Malone",
        topNotes: ["Bergamot", "Lemon Zest"],
        baseNotes: ["Honey", "Vanilla", "White Musk"],
        description: "Bright citrus opening that melts into warm honey",
      },
      caption: "Sunlit café tables. Iced tea condensation. That golden glow.",
    },
  ],
  [
    "cloudy",
    {
      mood: "Cottagecore",
      music: {
        track: "From the Dining Table",
        artist: "Harry Styles",
        genre: "Soft Pop",
        spotifyUrl: "https://open.spotify.com/track/1kPVjeGIJJPCiMulWRBAMU",
      },
      scent: {
        name: "Earl Grey & Lavender",
        brand: "Diptyque",
        topNotes: ["Bergamot Tea", "Lavender"],
        baseNotes: ["Linen", "Soft Musk"],
        description: "Quiet afternoons and knitted blankets",
      },
      caption: "Overcast skies tell the best stories.",
    },
  ],
  [
    "hot",
    {
      mood: "Tropical Escape",
      music: {
        track: "Island in the Sun",
        artist: "Weezer",
        genre: "Alternative Rock",
        spotifyUrl: "https://open.spotify.com/track/2MLHyLy5z5l5YRp7momlgw",
      },
      scent: {
        name: "Coconut & Sea Salt",
        brand: "Replica",
        topNotes: ["Coconut Milk", "Sea Salt"],
        baseNotes: ["Musk", "Driftwood"],
        description: "Beach breeze bottled up",
      },
      caption: "Heatwaves shimmer. Ice cream melts. No plans today.",
    },
  ],
  [
    "cold",
    {
      mood: "Winter Solitude",
      music: {
        track: "Skinny Love",
        artist: "Bon Iver",
        genre: "Indie Folk",
        spotifyUrl: "https://open.spotify.com/track/1Kz6JtPIkjcoJleUPMUvaT",
      },
      scent: {
        name: "Pine & Cashmere",
        brand: "Le Labo",
        topNotes: ["Pine Needles", "Frost"],
        baseNotes: ["Cashmere", "Cedar", "Smoke"],
        description: "Cold mountain air meeting warm cabin fire",
      },
      caption: "Wool scarves. Fogged windows. Silence that speaks.",
    },
  ],
  [
    "windy",
    {
      mood: "Wanderlust",
      music: {
        track: "Ribs",
        artist: "Lorde",
        genre: "Art Pop",
        spotifyUrl: "https://open.spotify.com/track/4JOFo07gt6FGfKwQiISCpz",
      },
      scent: {
        name: "Wind & Wildflower",
        brand: "Byredo",
        topNotes: ["Ozone", "Wild Grass"],
        baseNotes: ["Iris", "Vetiver"],
        description: "Open fields, untamed. Carried by the breeze.",
      },
      caption: "Let the wind decide. Follow through.",
    },
  ],
]);

// ─── Service ──────────────────────────────────────────────────

export class VibeService {
  private aiService: AIService;
  private weatherService: WeatherService;
  private httpClient: HttpClient;

  constructor(aiService: AIService, weatherService: WeatherService, httpClient: HttpClient) {
    this.aiService = aiService;
    this.weatherService = weatherService;
    this.httpClient = httpClient;
  }

  /**
   * Generate a vibe profile for the given coordinates.
   * Attempts AI generation first, falls back to procedural mapping.
   */
  async getVibe(lat: number, lon: number): Promise<VibeProfile> {
    // Gather context
    const [weatherResult, locationName] = await Promise.all([
      this.weatherService.getWeatherByCoords(lat, lon),
      this.reverseGeocode(lat, lon),
    ]);

    const weather = weatherResult?.weather ?? { temperature: 25, windspeed: 10, is_day: true };
    const resolvedLocation = locationName ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    const hour = new Date().getHours();
    const timeLabel = this.getTimeLabel(hour);

    // Primary: AI generation
    try {
      return await this.generateVibeAI(weather, resolvedLocation, hour, timeLabel);
    } catch (error: unknown) {
      const isUnavailable = error instanceof Error && error.name === "AIServiceUnavailableError";
      if (!isUnavailable) {
        console.error("[VibeService] Unexpected AI error:", error);
      }
      console.log("[VibeService] Falling back to procedural vibe generation");
    }

    // Fallback: Procedural
    return this.generateVibeFallback(weather);
  }

  /**
   * Generate vibe from city name (no coordinates).
   */
  async getVibeByCity(cityName: string): Promise<VibeProfile> {
    const result = await this.weatherService.getWeatherByLocation(cityName);
    if (!result) {
      // Return a generic fallback
      return this.generateVibeFallback({ temperature: 25, windspeed: 10, is_day: true });
    }

    const hour = new Date().getHours();
    const timeLabel = this.getTimeLabel(hour);

    try {
      return await this.generateVibeAI(result.weather, result.locationName, hour, timeLabel);
    } catch {
      return this.generateVibeFallback(result.weather);
    }
  }

  // ─── AI Path ──────────────────────────────────────────────

  private async generateVibeAI(
    weather: WeatherData,
    location: string,
    hour: number,
    timeLabel: string,
  ): Promise<VibeProfile> {
    const weatherDesc = this.describeWeather(weather);
    const prompt = [
      `You are a lifestyle curator specializing in music and fragrance pairing.`,
      `Context: It is ${timeLabel} (${hour}:00) in ${location}. Weather: ${weatherDesc}, ${weather.temperature}°C, wind ${weather.windspeed} km/h.`,
      ``,
      `Generate a "vibe" that pairs:`,
      `1. A specific music track (with Spotify URL if you know it) that matches the mood`,
      `2. A perfume/fragrance profile with top notes & base notes, plus a real brand suggestion`,
      ``,
      `Return ONLY valid JSON (no markdown, no explanation) with this exact structure:`,
      `{`,
      `  "mood": "string (2-3 word aesthetic label, e.g. 'Dark Academia', 'Coastal Calm')",`,
      `  "music": { "track": "string", "artist": "string", "genre": "string", "spotifyUrl": "string|null" },`,
      `  "scent": { "name": "string", "brand": "string", "topNotes": ["string"], "baseNotes": ["string"], "description": "string (one line)" },`,
      `  "caption": "string (poetic one-liner that captures the vibe)"`,
      `}`,
    ].join("\n");

    return this.aiService.generateJSON<AIVibeResponse>(prompt, 0.9);
  }

  // ─── Fallback Path ────────────────────────────────────────

  private generateVibeFallback(weather: WeatherData): VibeProfile {
    const condition = this.classifyWeather(weather);
    return FALLBACK_VIBES.get(condition) ?? FALLBACK_VIBES.get("clear_day")!;
  }

  // ─── Helpers ──────────────────────────────────────────────

  private classifyWeather(weather: WeatherData): WeatherCondition {
    // Simple heuristic classification based on available data
    if (weather.windspeed > 40) return "windy";
    if (weather.temperature < 10) return "cold";
    if (weather.temperature > 33) return "hot";

    // Use is_day + wind to approximate cloud/rain
    if (!weather.is_day) return "clear_night";
    if (weather.windspeed > 20) return "cloudy";

    return "clear_day";
  }

  private describeWeather(weather: WeatherData): string {
    const parts: string[] = [];
    if (!weather.is_day) parts.push("nighttime");
    if (weather.windspeed > 30) parts.push("windy");
    if (weather.temperature < 15) parts.push("cold");
    else if (weather.temperature > 30) parts.push("hot");
    else parts.push("mild");

    return parts.join(", ") || "clear";
  }

  private getTimeLabel(hour: number): string {
    if (hour >= 5 && hour < 10) return "early morning";
    if (hour >= 10 && hour < 14) return "midday";
    if (hour >= 14 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 20) return "golden hour / evening";
    if (hour >= 20 && hour < 23) return "night";
    return "late night / midnight";
  }

  private async reverseGeocode(lat: number, lon: number): Promise<string | null> {
    try {
      const result = await this.httpClient.get<NominatimReverseResult>(`${CONFIG.API.NOMINATIM}/reverse`, {
        params: { format: "json", lat, lon },
        headers: { "User-Agent": CONFIG.USER_AGENT },
      });
      const addr = result.address;
      const city = addr?.city ?? addr?.town ?? addr?.village ?? null;
      const country = addr?.country ?? null;
      return city && country ? `${city}, ${country}` : (city ?? country ?? null);
    } catch {
      return null;
    }
  }

  /**
   * Format a VibeProfile into a Telegram-friendly message.
   */
  formatVibeMessage(vibe: VibeProfile, locationLabel?: string): string {
    const header = locationLabel ? `Vibe Check — ${locationLabel}` : "Vibe Check";
    const musicUrl = vibe.music.spotifyUrl ? `\n[Spotify](${vibe.music.spotifyUrl})` : "";

    return [
      `*${header}*`,
      `Mood: *${vibe.mood}*`,
      ``,
      `*Music*`,
      `${vibe.music.track} — ${vibe.music.artist}`,
      `Genre: ${vibe.music.genre}${musicUrl}`,
      ``,
      `*Scent Profile*`,
      `${vibe.scent.name} — ${vibe.scent.brand}`,
      `Top: ${vibe.scent.topNotes.join(", ")}`,
      `Base: ${vibe.scent.baseNotes.join(", ")}`,
      `_${vibe.scent.description}_`,
      ``,
      `_"${vibe.caption}"_`,
    ].join("\n");
  }
}
