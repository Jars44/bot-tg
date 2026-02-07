/**
 * News service using GNews API
 */

import { HttpClient } from "./HttpClient.js";
import { CONFIG, getEnvVar, ENV_KEYS } from "../config/index.js";

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
}

interface GNewsResponse {
  articles: NewsArticle[];
}

export class NewsService {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async getTopHeadline(): Promise<NewsArticle | null> {
    try {
      const token = getEnvVar(ENV_KEYS.GNEWS_API_TOKEN);

      const response = await this.http.get<GNewsResponse>(`${CONFIG.API.GNEWS}/top-headlines`, {
        params: {
          token,
          lang: "id",
          max: 1,
        },
      });

      if (!response.articles || response.articles.length === 0) {
        return null;
      }

      return response.articles[0];
    } catch {
      return null;
    }
  }
}
