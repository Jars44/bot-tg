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

  async getCoordinates(cityName: string): Promise<Coordinates | null> {
    try {
      const response = await this.http.get<NominatimResult[]>(`${CONFIG.API.NOMINATIM}/search`, {
        params: {
          format: "json",
          q: cityName,
        },
        headers: {
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

  async getWeatherByCoords(
    lat: number,
    lon: number,
  ): Promise<{
    weather: WeatherData;
    locationName: string;
  } | null> {
    try {
      const weather = await this.getWeather(lat, lon);
      const locationName = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      return { weather, locationName };
    } catch {
      return null;
    }
  }

  async formattedWeatherByCoords(lat: number, lon: number): Promise<string> {
    const result = await this.getWeatherByCoords(lat, lon);

    if (!result) {
      throw new Error("Failed to fetch weather data");
    }

    const { weather, locationName } = result;
    const dayTime = weather.is_day ? "Siang" : "Malam";

    return `Cuaca di ${locationName}:\nSuhu: ${weather.temperature}°C\nAngin: ${weather.windspeed} km/h\nSiang/Malam: ${dayTime}`;
  }
}
