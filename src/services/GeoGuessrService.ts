/**
 * GeoGuessr Service
 * Location-based guessing game engine with reverse geocoding
 * Distribution: 60% Indonesia, 40% World
 */

import { HttpClient } from "./HttpClient.js";

/** Coordinate pair (latitude, longitude) */
export interface Coordinate {
  lat: number;
  lng: number;
  hint: string; // City or landmark name (for internal reference)
}

/** Answer key from reverse geocoding */
export interface AnswerKey {
  country: string;
  state: string | null;
  city: string | null;
  formattedAddress: string;
}

/** Nominatim API Response */
interface NominatimResponse {
  address: {
    country?: string;
    state?: string;
    province?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    country_code?: string;
  };
  display_name: string;
}

/**
 * Indonesia Location Pool (60% probability)
 * Major cities, capitals, and notable landmarks across the archipelago
 */
const ID_LOCATIONS: Coordinate[] = [
  // Java
  { lat: -6.2088, lng: 106.8456, hint: "Jakarta" },
  { lat: -7.7956, lng: 110.3695, hint: "Yogyakarta" },
  { lat: -6.9175, lng: 107.6191, hint: "Bandung" },
  { lat: -7.2575, lng: 112.7521, hint: "Surabaya" },
  { lat: -6.9662, lng: 110.4236, hint: "Semarang" },
  { lat: -8.6705, lng: 115.2126, hint: "Denpasar, Bali" },

  // Sumatra
  { lat: 3.5952, lng: 98.6722, hint: "Medan" },
  { lat: -0.9471, lng: 100.4172, hint: "Padang" },
  { lat: -2.9761, lng: 104.7754, hint: "Palembang" },
  { lat: 0.5071, lng: 101.4478, hint: "Pekanbaru" },
  { lat: -5.4292, lng: 105.2619, hint: "Bandar Lampung" },

  // Kalimantan
  { lat: -0.0263, lng: 109.3425, hint: "Pontianak" },
  { lat: -3.3194, lng: 114.5906, hint: "Banjarmasin" },
  { lat: 1.2711, lng: 116.8253, hint: "Balikpapan" },

  // Sulawesi
  { lat: -5.1477, lng: 119.4327, hint: "Makassar" },
  { lat: 1.4748, lng: 124.8421, hint: "Manado" },

  // Eastern Indonesia
  { lat: -3.6954, lng: 128.1814, hint: "Ambon" },
  { lat: -0.8917, lng: 134.0783, hint: "Sorong, Papua" },
  { lat: -8.5569, lng: 120.6925, hint: "Labuan Bajo, Flores" },
];

/**
 * World Location Pool (40% probability)
 * Major cities and landmarks globally
 */
const WORLD_LOCATIONS: Coordinate[] = [
  // Asia
  { lat: 35.6762, lng: 139.6503, hint: "Tokyo" },
  { lat: 1.3521, lng: 103.8198, hint: "Singapore" },
  { lat: 13.7563, lng: 100.5018, hint: "Bangkok" },
  { lat: 37.5665, lng: 126.978, hint: "Seoul" },
  { lat: 28.6139, lng: 77.209, hint: "New Delhi" },
  { lat: 39.9042, lng: 116.4074, hint: "Beijing" },
  { lat: 21.0285, lng: 105.8542, hint: "Hanoi" },
  { lat: 24.8607, lng: 67.0011, hint: "Karachi" },

  // Europe
  { lat: 51.5074, lng: -0.1278, hint: "London" },
  { lat: 48.8566, lng: 2.3522, hint: "Paris" },
  { lat: 52.52, lng: 13.405, hint: "Berlin" },
  { lat: 41.9028, lng: 12.4964, hint: "Rome" },
  { lat: 55.7558, lng: 37.6173, hint: "Moscow" },
  { lat: 40.4168, lng: -3.7038, hint: "Madrid" },

  // Americas
  { lat: 40.7128, lng: -74.006, hint: "New York" },
  { lat: 34.0522, lng: -118.2437, hint: "Los Angeles" },
  { lat: 19.4326, lng: -99.1332, hint: "Mexico City" },
  { lat: -23.5505, lng: -46.6333, hint: "São Paulo" },
  { lat: 43.6532, lng: -79.3832, hint: "Toronto" },

  // Middle East
  { lat: 25.2048, lng: 55.2708, hint: "Dubai" },
  { lat: 33.3152, lng: 44.3661, hint: "Baghdad" },
  { lat: 31.7683, lng: 35.2137, hint: "Jerusalem" },

  // Africa
  { lat: 30.0444, lng: 31.2357, hint: "Cairo" },
  { lat: -26.2041, lng: 28.0473, hint: "Johannesburg" },
  { lat: -1.2921, lng: 36.8219, hint: "Nairobi" },

  // Oceania
  { lat: -33.8688, lng: 151.2093, hint: "Sydney" },
  { lat: -37.8136, lng: 144.9631, hint: "Melbourne" },
  { lat: -41.2865, lng: 174.7762, hint: "Wellington" },
];

export class GeoGuessrService {
  private httpClient: HttpClient;

  constructor() {
    this.httpClient = new HttpClient();
  }

  /**
   * Generate random location with 60/40 Indonesia/World distribution
   * Applies slight jitter (±0.01 degrees) to avoid exact repetition
   */
  generateRandomLocation(): { lat: number; lng: number; hint: string } {
    const isIndonesia = Math.random() < 0.6; // 60% chance
    const pool = isIndonesia ? ID_LOCATIONS : WORLD_LOCATIONS;

    // Pick random location from pool
    const base = pool[Math.floor(Math.random() * pool.length)];

    // Apply jitter (±0.01 degrees ~= ±1.1 km)
    const jitter = () => (Math.random() - 0.5) * 0.02;
    const lat = base.lat + jitter();
    const lng = base.lng + jitter();

    return { lat, lng, hint: base.hint };
  }

  /**
   * Get answer key using OpenStreetMap Nominatim Reverse Geocoding
   * @param lat Latitude
   * @param lng Longitude
   * @returns Answer key with country, state, city
   */
  async getAnswerKey(lat: number, lng: number): Promise<AnswerKey> {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`;

    try {
      const response = await this.httpClient.get<NominatimResponse>(url);

      const address = response.address;

      // Extract location hierarchy
      const country = address.country || "Unknown";
      const state = address.state || address.province || null;
      const city = address.city || address.town || address.village || address.county || null;

      return {
        country,
        state,
        city,
        formattedAddress: response.display_name,
      };
    } catch (error) {
      console.error("Nominatim API error:", error);
      throw new Error("Failed to fetch location data");
    }
  }

  /**
   * Fuzzy match user's answer against the answer key
   * Returns: { match: true, level: "city"|"state"|"country" } or { match: false }
   * Case-insensitive, allows partial matches and common aliases
   */
  matchAnswer(
    userAnswer: string,
    answerKey: AnswerKey,
  ): { match: boolean; level?: "city" | "state" | "country"; points?: number } {
    const normalized = userAnswer.toLowerCase().trim();

    // Normalize answer key values
    const country = answerKey.country?.toLowerCase() || "";
    const state = answerKey.state?.toLowerCase() || "";
    const city = answerKey.city?.toLowerCase() || "";

    // City match (exact or contains)
    if (city && (normalized === city || city.includes(normalized) || normalized.includes(city))) {
      return { match: true, level: "city", points: 10 };
    }

    // State/Province match
    if (state && (normalized === state || state.includes(normalized) || normalized.includes(state))) {
      return { match: true, level: "state", points: 5 };
    }

    // Country match (including common aliases)
    const countryAliases: Record<string, string[]> = {
      "united states": ["usa", "us", "america", "amerika"],
      "united kingdom": ["uk", "britain", "england", "inggris"],
      indonesia: ["id", "indo"],
      "south korea": ["korea", "korea selatan"],
      japan: ["jepang", "jp"],
      china: ["tiongkok", "cina"],
      singapore: ["singapura", "sg"],
      thailand: ["thai", "muangthai"],
      vietnam: ["viet nam"],
    };

    // Check direct country match
    if (normalized === country || country.includes(normalized) || normalized.includes(country)) {
      return { match: true, level: "country", points: 2 };
    }

    // Check country aliases
    for (const [fullName, aliases] of Object.entries(countryAliases)) {
      if (country.includes(fullName) || fullName.includes(country)) {
        if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
          return { match: true, level: "country", points: 2 };
        }
      }
    }

    return { match: false };
  }
}
