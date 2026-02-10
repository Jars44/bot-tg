/**
 * News service using Google News RSS
 */

import Parser from "rss-parser";

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
}

import axios from "axios";

export class NewsService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 30000,
      customFields: {
        item: ["description", "link", "enclosure"],
      },
    });
  }

  /**
   * Get top headlines (Indonesian)
   * Fetches multiple articles with fallback if few results found
   */
  async getTopHeadlines(limit: number = 5): Promise<NewsArticle[]> {
    try {
      // Primary source: Antara News (Top News) - provides direct links and images
      const feed = await this.parser.parseURL("https://www.antaranews.com/rss/top-news");
      let items = feed.items || [];

      // Limit results
      items = items.slice(0, limit);

      const articles: NewsArticle[] = items.map((item) => {
        return {
          title: item.title || "No title",
          description: item.contentSnippet || item.description || "No description available",
          url: item.link || "",
        };
      });

      return articles;
    } catch (error) {
      console.error("[NewsService] Error fetching top headlines from Antara:", error);

      // Fallback to Google News if Antara fails
      try {
        const feed = await this.parser.parseURL("https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id");
        const items = (feed.items || []).slice(0, limit);

        const articlePromises = items.map(async (item) => {
          const url = await this.resolveUrl(item.link || "");
          return {
            title: item.title || "No title",
            description: item.contentSnippet || item.description || "No description available",
            url: url,
          };
        });

        return Promise.all(articlePromises);
      } catch (innerError) {
        console.error("[NewsService] Google News fallback also failed:", innerError);
        return [];
      }
    }
  }

  /**
   * Search news by keyword
   */
  async searchNews(keyword: string, maxResults: number = 10): Promise<NewsArticle[]> {
    try {
      // Google News RSS search
      const encodedKeyword = encodeURIComponent(keyword);
      const feed = await this.parser.parseURL(
        `https://news.google.com/rss/search?q=${encodedKeyword}&hl=en&gl=US&ceid=US:en`,
      );

      if (!feed.items || feed.items.length === 0) {
        return [];
      }

      // Limit results first to avoid too many requests
      const items = feed.items.slice(0, maxResults);

      // Resolve URLs in parallel with concurrency limit if needed, creates array of promises
      const articlePromises = items.map(async (item) => {
        const url = await this.resolveUrl(item.link || "");
        return {
          title: item.title || "No title",
          description: item.contentSnippet || item.description || "No description available",
          url: url,
        };
      });

      return Promise.all(articlePromises);
    } catch (error) {
      console.error("[NewsService] Error searching news:", error);
      return [];
    }
  }

  /**
   * Resolve Google News redirect URL to the real URL
   */
  private async resolveUrl(url: string): Promise<string> {
    if (!url || !url.includes("news.google.com")) return url;

    try {
      // Set short timeout for resolution to stay responsive
      const response = await axios.head(url, {
        timeout: 2000,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
      });
      return response.request.res.responseUrl || url;
    } catch {
      // If HEAD fails (some sites block it), try small GET
      try {
        const response = await axios.get(url, {
          timeout: 2000,
          maxRedirects: 5,
          validateStatus: (status) => status >= 200 && status < 400,
        });
        return response.request.res.responseUrl || url;
      } catch {
        // Fallback to original URL
        return url;
      }
    }
  }
}
