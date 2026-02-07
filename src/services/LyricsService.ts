/**
 * Lyrics service using lyrics.ovh API
 */

import { HttpClient } from "./HttpClient.js";
import { CONFIG } from "../config/index.js";

export interface LyricsResult {
  lyrics: string;
}

interface LyricsResponse {
  lyrics: string;
}

export class LyricsService {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async getLyrics(artist: string, title: string): Promise<string | null> {
    try {
      const encodedArtist = encodeURIComponent(artist);
      const encodedTitle = encodeURIComponent(title);

      const response = await this.http.get<LyricsResponse>(`${CONFIG.API.LYRICS}/${encodedArtist}/${encodedTitle}`);

      if (!response.lyrics) {
        return null;
      }

      // Clean up excessive line breaks
      return response.lyrics.replace(/\r\n/g, "\n").replace(/(\n{3,})/g, "\n\n");
    } catch {
      return null;
    }
  }
}
