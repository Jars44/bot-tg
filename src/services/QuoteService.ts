import { HttpClient } from "./HttpClient.js";
import { CONFIG } from "../config/index.js";

export interface Quote {
  body: string;
  author: string;
}

interface FavQsResponse {
  quote: {
    body: string;
    author: string;
  };
}

export class QuoteService {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async getQuoteOfTheDay(): Promise<Quote | null> {
    try {
      const response = await this.http.get<FavQsResponse>(CONFIG.API.FAVQS);

      if (!response.quote) {
        return null;
      }

      return {
        body: response.quote.body,
        author: response.quote.author,
      };
    } catch {
      return null;
    }
  }
}
