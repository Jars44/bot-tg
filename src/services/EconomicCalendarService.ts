import type { HttpClient } from "./HttpClient.js";
import type { EconomicEvent } from "../database/types.js";
import { CONFIG } from "../config/index.js";
import { getCountryFlag } from "../utils/helpers.js";
import { S } from "../config/symbols.js";

interface ForexFactoryEvent {
  title: string;
  country: string;
  date: string;
  time: string;
  impact: string;
  forecast: string;
  previous: string;
}

export class EconomicCalendarService {
  private httpClient: HttpClient;
  private cache: { events: EconomicEvent[]; timestamp: number } | null = null;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async getWeeklyEvents(): Promise<EconomicEvent[]> {
    if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL_MS) {
      return this.cache.events;
    }

    try {
      const response = await this.httpClient.get<ForexFactoryEvent[]>(CONFIG.API.FOREX_FACTORY);

      if (!response || !Array.isArray(response)) {
        return [];
      }

      const events: EconomicEvent[] = response.map((event) => ({
        title: event.title,
        country: event.country,
        impact: this.normalizeImpact(event.impact),
        time: event.time || "All Day",
        date: event.date,
        forecast: event.forecast || undefined,
        previous: event.previous || undefined,
      }));

      this.cache = { events, timestamp: Date.now() };

      return events;
    } catch (error) {
      console.error("[EconomicCalendarService] Error fetching calendar:", error);
      return [];
    }
  }

  async getTodayEvents(): Promise<EconomicEvent[]> {
    const allEvents = await this.getWeeklyEvents();
    const today = new Date().toISOString().split("T")[0];

    return allEvents.filter((event) => {
      const eventDate = this.parseDate(event.date);
      return eventDate === today;
    });
  }

  async getHighImpactEvents(): Promise<EconomicEvent[]> {
    const todayEvents = await this.getTodayEvents();
    return todayEvents.filter((event) => event.impact === "high");
  }

  async getEventsByCountry(country: string): Promise<EconomicEvent[]> {
    const todayEvents = await this.getTodayEvents();
    return todayEvents.filter((event) => event.country.toUpperCase() === country.toUpperCase());
  }

  formatEvents(events: EconomicEvent[]): string {
    if (events.length === 0) {
      return "Tidak ada event ekonomi penting hari ini.";
    }

    let message = "*Economic Calendar — Today*\n\n";

    const highImpact = events.filter((e) => e.impact === "high");
    const mediumImpact = events.filter((e) => e.impact === "medium");
    const lowImpact = events.filter((e) => e.impact === "low");

    if (highImpact.length > 0) {
      message += "*HIGH IMPACT*\n";
      for (const event of highImpact) {
        message += this.formatEventLine(event);
      }
      message += "\n";
    }

    if (mediumImpact.length > 0) {
      message += "*MEDIUM IMPACT*\n";
      for (const event of mediumImpact.slice(0, 5)) {
        message += this.formatEventLine(event);
      }
      message += "\n";
    }

    if (lowImpact.length > 0 && highImpact.length + mediumImpact.length < 5) {
      message += "*LOW IMPACT*\n";
      for (const event of lowImpact.slice(0, 3)) {
        message += this.formatEventLine(event);
      }
    }

    return message;
  }

  private formatEventLine(event: EconomicEvent): string {
    const flag = getCountryFlag(event.country);
    let line = `${S.BULLET_ALT} ${event.time} ${flag} ${event.title}\n`;

    if (event.forecast || event.previous) {
      line += `  Forecast: ${event.forecast || "N/A"} | Previous: ${event.previous || "N/A"}\n`;
    }

    return line;
  }

  private normalizeImpact(impact: string): "high" | "medium" | "low" {
    const lower = impact.toLowerCase();
    if (lower.includes("high") || lower === "red") return "high";
    if (lower.includes("medium") || lower === "orange") return "medium";
    return "low";
  }

  private parseDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toISOString().split("T")[0];
    } catch {
      return dateStr;
    }
  }
}
