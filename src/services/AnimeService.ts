/**
 * Anime service using Jikan API (MyAnimeList)
 */

import jikanjs from "@mateoaranda/jikanjs";

export interface AnimeResult {
  title: string;
  type: string;
  year: number | null;
  score: number | null;
  synopsis: string;
  url: string;
  imageUrl: string;
}

interface JikanAnime {
  title: string;
  type: string;
  aired: {
    prop: {
      from: {
        year: number;
      };
    };
  };
  score: number;
  synopsis: string;
  url: string;
  images: {
    jpg: {
      image_url: string;
    };
  };
}

interface JikanSearchResult {
  data: JikanAnime[];
}

export class AnimeService {
  /**
   * Search for anime by keyword - returns first result
   */
  async search(keyword: string): Promise<AnimeResult | null> {
    const results = await this.searchMultiple(keyword, 1);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Search for multiple anime by keyword - returns top N results
   */
  async searchMultiple(keyword: string, limit: number = 5): Promise<AnimeResult[]> {
    try {
      const result = (await jikanjs.search("anime", keyword)) as JikanSearchResult;

      if (!result.data || result.data.length === 0) {
        return [];
      }

      return result.data.slice(0, limit).map((anime) => ({
        title: anime.title,
        type: anime.type,
        year: anime.aired?.prop?.from?.year ?? null,
        score: anime.score,
        synopsis: anime.synopsis?.substring(0, 500) ?? "",
        url: anime.url,
        imageUrl: anime.images.jpg.image_url,
      }));
    } catch {
      return [];
    }
  }
}
