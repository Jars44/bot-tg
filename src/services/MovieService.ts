/**
 * Movie service using TMDB API
 */

import { HttpClient } from "./HttpClient.js";
import { CONFIG, getEnvVar, ENV_KEYS } from "../config/index.js";

export interface MovieResult {
  title: string;
  releaseDate: string;
  rating: number;
  overview: string;
  posterUrl: string;
}

interface TmdbMovie {
  title: string;
  release_date: string;
  vote_average: number;
  overview: string;
  poster_path: string;
}

interface TmdbSearchResponse {
  results: TmdbMovie[];
}

export class MovieService {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async searchMovie(query: string): Promise<MovieResult | null> {
    try {
      const apiKey = getEnvVar(ENV_KEYS.TMDB_API_KEY);

      const response = await this.http.get<TmdbSearchResponse>(`${CONFIG.API.TMDB}/search/movie`, {
        params: {
          api_key: apiKey,
          query,
        },
      });

      if (!response.results || response.results.length === 0) {
        return null;
      }

      const movie = response.results[0];
      return {
        title: movie.title,
        releaseDate: movie.release_date,
        rating: movie.vote_average,
        overview: movie.overview,
        posterUrl: `${CONFIG.API.TMDB_IMAGE}${movie.poster_path}`,
      };
    } catch {
      return null;
    }
  }
}
