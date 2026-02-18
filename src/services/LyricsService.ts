/**
 * Lyrics service using lrclib.net API
 */

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

      // lrclib.net search endpoint: /api/search?artist_name=...&track_name=...
      const results = await this.http.get<LrcLibResult[]>(
        `${CONFIG.API.LYRICS}?artist_name=${encodedArtist}&track_name=${encodedTitle}`,
      );

      if (!Array.isArray(results) || results.length === 0) {
        return null;
      }

      // Pick the first result with plainLyrics
      const result = results.find((r) => r.plainLyrics);
      if (!result?.plainLyrics) {
        return null;
      }

      // Clean up excessive line breaks
      // Normalize newlines
      let text = result.plainLyrics.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      // Smart newline reduction
      // Check if text is "double spaced" (more double newlines than single newlines)
      const singleNewlines = (text.match(/(?<!\n)\n(?!\n)/g) || []).length;
      const doubleNewlines = (text.match(/\n{2,}/g) || []).length;

      if (doubleNewlines > singleNewlines) {
        // Double spaced detected: 2=Line, 3+=Verse
        // 1. Preserve deep breaks as Verse
        text = text.replace(/\n{3,}/g, "§§VERSE§§");
        // 2. Reduce 2 newlines to 1 (Line break)
        text = text.replace(/\n{2}/g, "\n");
        // 3. Restore Verse breaks
        text = text.replace(/§§VERSE§§/g, "\n\n");
      } else {
        // Standard spacing: 1=Line, 2=Verse
        // Just ensure we don't have excessive >2 newlines
        text = text.replace(/\n{3,}/g, "\n\n");
      }

      return text.trim();
    } catch {
      return null;
    }
  }
}
