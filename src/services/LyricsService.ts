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
      // Normalize newlines
      let text = response.lyrics.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      // Remove common header junk
      text = text.replace(/^Paroles de la chanson .+$/gm, "");

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
