/**
 * Prayer times service using Aladhan API
 */

import { HttpClient } from "./HttpClient.js";
import { CONFIG } from "../config/index.js";

export interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface AladhanResponse {
  data: {
    timings: PrayerTimes;
  };
}

export class PrayerService {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async getPrayerTimes(city: string): Promise<PrayerTimes | null> {
    try {
      const response = await this.http.get<AladhanResponse>(`${CONFIG.API.ALADHAN}/timingsByCity`, {
        params: {
          city,
          country: "Indonesia",
          method: 11, // Muhammadiyah calculation method
        },
      });

      if (!response.data?.timings) {
        return null;
      }

      return response.data.timings;
    } catch {
      return null;
    }
  }

  /**
   * Get prayer times by coordinates
   */
  async getPrayerTimesByCoords(lat: number, lon: number): Promise<PrayerTimes | null> {
    try {
      const response = await this.http.get<AladhanResponse>(`${CONFIG.API.ALADHAN}/timings`, {
        params: {
          latitude: lat,
          longitude: lon,
          method: 11, // Muhammadiyah calculation method
        },
      });

      if (!response.data?.timings) {
        return null;
      }

      return response.data.timings;
    } catch {
      return null;
    }
  }
  /**
   * Get formatted prayer timings string for coordinates
   */
  async formattedTimingsByCoords(lat: number, lon: number): Promise<string> {
    const times = await this.getPrayerTimesByCoords(lat, lon);

    if (!times) {
      throw new Error("Failed to fetch prayer times");
    }

    return `🕌 Jadwal Sholat:\nSubuh: ${times.Fajr}\nDzuhur: ${times.Dhuhr}\nAshar: ${times.Asr}\nMaghrib: ${times.Maghrib}\nIsya: ${times.Isha}`;
  }
}
