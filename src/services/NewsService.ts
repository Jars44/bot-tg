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

  async getTopHeadlines(limit: number = 5): Promise<NewsArticle[]> {
    try {
      const feed = await this.parser.parseURL("https://www.antaranews.com/rss/top-news");
      let items = feed.items || [];

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

  async searchNews(keyword: string, maxResults: number = 10): Promise<NewsArticle[]> {
    try {
      const encodedKeyword = encodeURIComponent(keyword);
      const feed = await this.parser.parseURL(
        `https://news.google.com/rss/search?q=${encodedKeyword}&hl=en&gl=US&ceid=US:en`,
      );

      if (!feed.items || feed.items.length === 0) {
        return [];
      }

      const items = feed.items.slice(0, maxResults);

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

  private async resolveUrl(url: string): Promise<string> {
    if (!url || !url.includes("news.google.com")) return url;

    try {
      const response = await axios.head(url, {
        timeout: 2000,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
      });
      return response.request.res.responseUrl || url;
    } catch {
      try {
        const response = await axios.get(url, {
          timeout: 2000,
          maxRedirects: 5,
          validateStatus: (status) => status >= 200 && status < 400,
        });
        return response.request.res.responseUrl || url;
      } catch {
        return url;
      }
    }
  }
}
