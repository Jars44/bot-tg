/**
 * Weather service with Nominatim geocoding and Open-Meteo weather API
 * IMPORTANT: User-Agent header is required for Nominatim to avoid IP blocking
 */

import { HttpClient } from "./HttpClient.js";
import { CONFIG } from "../config/index.js";

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface WeatherData {
  temperature: number;
  windspeed: number;
  is_day: boolean;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

interface OpenMeteoResponse {
  current_weather: WeatherData;
}

export class WeatherService {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  /**
   * Get coordinates for a city name using Nominatim
   * CRITICAL: User-Agent header is injected to prevent IP blocking
   */
  async getCoordinates(cityName: string): Promise<Coordinates | null> {
    try {
      const response = await this.http.get<NominatimResult[]>(`${CONFIG.API.NOMINATIM}/search`, {
        params: {
          format: "json",
          q: cityName,
        },
        headers: {
          // CRITICAL: Nominatim requires User-Agent to avoid blocking
          "User-Agent": CONFIG.USER_AGENT,
        },
      });

      if (response.length > 0) {
        return {
          lat: parseFloat(response[0].lat),
          lon: parseFloat(response[0].lon),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get current weather for coordinates
   */
  async getWeather(lat: number, lon: number): Promise<WeatherData> {
    const response = await this.http.get<OpenMeteoResponse>(`${CONFIG.API.OPEN_METEO}/forecast`, {
      params: {
        latitude: lat,
        longitude: lon,
        current_weather: true,
      },
    });

    return response.current_weather;
  }

  /**
   * Get weather for a location name
   * Falls back to default location if not specified
   */
  async getWeatherByLocation(location?: string): Promise<{
    weather: WeatherData;
    locationName: string;
  } | null> {
    let lat: number = CONFIG.DEFAULT_LOCATION.lat;
    let lon: number = CONFIG.DEFAULT_LOCATION.lon;
    let locationName: string = CONFIG.DEFAULT_LOCATION.name;

    if (location) {
      const coords = await this.getCoordinates(location);
      if (!coords) {
        return null;
      }
      lat = coords.lat;
      lon = coords.lon;
      locationName = location;
    }

    const weather = await this.getWeather(lat, lon);
    return { weather, locationName };
  }

  /**
   * Get weather directly from coordinates (for GPS location)
   */
  async getWeatherByCoords(
    lat: number,
    lon: number,
  ): Promise<{
    weather: WeatherData;
    locationName: string;
  } | null> {
    try {
      const weather = await this.getWeather(lat, lon);
      // Use coordinates as location name when we don't have a city name
      const locationName = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      return { weather, locationName };
    } catch {
      return null;
    }
  }
}
