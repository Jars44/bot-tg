/**
 * Earthquake service using BMKG API
 */

import { HttpClient } from "./HttpClient.js";
import { CONFIG } from "../config/index.js";

export interface EarthquakeData {
  date: string;
  time: string;
  magnitude: string;
  depth: string;
  region: string;
  potential: string;
  coordinates: string;
  latitude: string;
  longitude: string;
  shakemapUrl: string;
}

interface BmkgEarthquake {
  Tanggal: string;
  Jam: string;
  Magnitude: string;
  Kedalaman: string;
  Wilayah: string;
  Potensi: string;
  Coordinates: string;
  Lintang: string;
  Bujur: string;
  Shakemap: string;
}

interface BmkgResponse {
  Infogempa: {
    gempa: BmkgEarthquake;
  };
}

export class EarthquakeService {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async getLatestEarthquake(): Promise<EarthquakeData | null> {
    try {
      const response = await this.http.get<BmkgResponse>(`${CONFIG.API.BMKG_BASE}/autogempa.json`);

      if (!response.Infogempa?.gempa) {
        return null;
      }

      const quake = response.Infogempa.gempa;
      return {
        date: quake.Tanggal,
        time: quake.Jam,
        magnitude: quake.Magnitude,
        depth: quake.Kedalaman,
        region: quake.Wilayah,
        potential: quake.Potensi,
        coordinates: quake.Coordinates,
        latitude: quake.Lintang,
        longitude: quake.Bujur,
        shakemapUrl: `${CONFIG.API.BMKG_BASE}${quake.Shakemap}`,
      };
    } catch {
      return null;
    }
  }
}
