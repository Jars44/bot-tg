/**
 * Sentiment Analyzer Service
 * Keyword-based heuristic analysis for market sentiment
 */

import type { NewsService } from "./NewsService.js";
import type { SentimentResult } from "../database/types.js";
import { CONFIG } from "../config/index.js";

export class SentimentAnalyzer {
  private newsService: NewsService;

  constructor(newsService: NewsService) {
    this.newsService = newsService;
  }

  /**
   * Analyze sentiment for a given keyword/topic
   */
  async analyzeSentiment(keyword: string): Promise<SentimentResult> {
    try {
      // Fetch news related to the keyword
      const newsItems = await this.newsService.searchNews(keyword);

      if (!newsItems || newsItems.length === 0) {
        return {
          sentiment: "Neutral",
          score: 0,
          headlines: [],
          analysis: `Tidak ada berita ditemukan untuk "${keyword}"`,
          keyword,
        };
      }

      // Extract headlines
      const headlines = newsItems.slice(0, 5).map((item) => ({
        title: item.title,
        url: item.url,
      }));

      // Calculate sentiment score
      let bullishScore = 0;
      let bearishScore = 0;

      const allText = headlines
        .map((h) => h.title)
        .join(" ")
        .toLowerCase();

      // Count bullish keywords
      for (const word of CONFIG.SENTIMENT.BULLISH) {
        const regex = new RegExp(word, "gi");
        const matches = allText.match(regex);
        if (matches) {
          bullishScore += matches.length * 10;
        }
      }

      // Count bearish keywords
      for (const word of CONFIG.SENTIMENT.BEARISH) {
        const regex = new RegExp(word, "gi");
        const matches = allText.match(regex);
        if (matches) {
          bearishScore += matches.length * 10;
        }
      }

      // Calculate final score (-100 to +100)
      const totalScore = bullishScore - bearishScore;
      const normalizedScore = Math.max(-100, Math.min(100, totalScore));

      // Determine sentiment
      let sentiment: "Bullish" | "Bearish" | "Neutral";
      if (normalizedScore > 15) {
        sentiment = "Bullish";
      } else if (normalizedScore < -15) {
        sentiment = "Bearish";
      } else {
        sentiment = "Neutral";
      }

      // Generate analysis text
      const analysis = this.generateAnalysis(sentiment, normalizedScore, bullishScore, bearishScore);

      return {
        sentiment,
        score: normalizedScore,
        headlines,
        analysis,
        keyword,
      };
    } catch (error) {
      console.error("[SentimentAnalyzer] Error analyzing sentiment:", error);
      return {
        sentiment: "Neutral",
        score: 0,
        headlines: [],
        analysis: "Gagal menganalisis sentimen. Silakan coba lagi.",
        keyword,
      };
    }
  }

  /**
   * Generate human-readable analysis
   */
  private generateAnalysis(sentiment: string, score: number, bullishScore: number, bearishScore: number): string {
    const absScore = Math.abs(score);
    let strength: string;

    if (absScore >= 50) {
      strength = "sangat kuat";
    } else if (absScore >= 30) {
      strength = "kuat";
    } else if (absScore >= 15) {
      strength = "moderat";
    } else {
      strength = "lemah";
    }

    if (sentiment === "Neutral") {
      return `Sentimen netral dengan sinyal campuran (bullish: ${bullishScore}, bearish: ${bearishScore})`;
    }

    const direction = sentiment === "Bullish" ? "bullish" : "bearish";
    return `Sentimen ${direction} ${strength} berdasarkan ${bullishScore + bearishScore} indikator kata kunci`;
  }

  /**
   * Format sentiment result for display
   */
  formatSentimentResult(result: SentimentResult): string {
    const indicator = this.getSentimentIndicator(result.sentiment, result.score);
    const scoreSign = result.score >= 0 ? "+" : "";

    let message = `*Sentiment Analysis: ${result.keyword}*\n\n`;
    message += `${indicator} *${result.sentiment}* (${scoreSign}${result.score})\n\n`;
    message += `${result.analysis}\n\n`;

    if (result.headlines.length > 0) {
      message += `*Recent Headlines:*\n`;
      for (const headline of result.headlines) {
        const title = headline.title;
        // Increase limit to 150 chars to show full title + source
        const truncated = title.length > 150 ? title.substring(0, 147) + "..." : title;
        // Check if URL is valid to avoid formatting errors
        if (headline.url && headline.url.startsWith("http")) {
          message += `• [${truncated}](${headline.url})\n`;
        } else {
          message += `• ${truncated}\n`;
        }
      }
    }

    return message;
  }

  /**
   * Get appropriate emoji for sentiment
   */
  private getSentimentIndicator(sentiment: string, score: number): string {
    const absScore = Math.abs(score);

    if (sentiment === "Bullish") {
      if (absScore >= 50) return "▲▲";
      if (absScore >= 30) return "▲";
      return "▲";
    } else if (sentiment === "Bearish") {
      if (absScore >= 50) return "▼▼";
      if (absScore >= 30) return "▼";
      return "▼";
    }
    return "•";
  }
}
