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
   * Search for anime by keyword
   */
  async search(keyword: string): Promise<AnimeResult | null> {
    try {
      const result = (await jikanjs.search("anime", keyword)) as JikanSearchResult;

      if (!result.data || result.data.length === 0) {
        return null;
      }

      const anime = result.data[0];
      return {
        title: anime.title,
        type: anime.type,
        year: anime.aired?.prop?.from?.year ?? null,
        score: anime.score,
        synopsis: anime.synopsis?.substring(0, 500) ?? "",
        url: anime.url,
        imageUrl: anime.images.jpg.image_url,
      };
    } catch {
      return null;
    }
  }
}
