import { HttpClient } from "./HttpClient.js";
import { CONFIG } from "../config/index.js";

export interface LyricsResult {
  lyrics: string;
}

interface LrcLibResult {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string;
  syncedLyrics: string;
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

      const results = await this.http.get<LrcLibResult[]>(
        `${CONFIG.API.LYRICS}?artist_name=${encodedArtist}&track_name=${encodedTitle}`,
      );

      if (!Array.isArray(results) || results.length === 0) {
        return null;
      }

      const result = results.find((r) => r.plainLyrics);
      if (!result?.plainLyrics) {
        return null;
      }

      let text = result.plainLyrics.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      const singleNewlines = (text.match(/(?<!\n)\n(?!\n)/g) || []).length;
      const doubleNewlines = (text.match(/\n{2,}/g) || []).length;

      if (doubleNewlines > singleNewlines) {
        text = text.replace(/\n{3,}/g, "\u00a7\u00a7VERSE\u00a7\u00a7");
        text = text.replace(/\n{2}/g, "\n");
        text = text.replace(/\u00a7\u00a7VERSE\u00a7\u00a7/g, "\n\n");
      } else {
        text = text.replace(/\n{3,}/g, "\n\n");
      }

      return text.trim();
    } catch {
      return null;
    }
  }
}
