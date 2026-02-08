/**
 * Finance Data Service
 * Unified wrapper for CCXT (crypto) and Yahoo Finance (stocks/forex)
 */

import ccxt, { Exchange } from "ccxt";
import YahooFinance from "yahoo-finance2";
import type { PriceData } from "../database/types.js";

const yahooFinance = new YahooFinance();

/** Common crypto symbols */
const CRYPTO_SYMBOLS = new Set([
  "BTC",
  "ETH",
  "BNB",
  "XRP",
  "ADA",
  "SOL",
  "DOGE",
  "DOT",
  "MATIC",
  "SHIB",
  "AVAX",
  "LINK",
  "LTC",
  "UNI",
  "ATOM",
  "XMR",
  "ETC",
  "BCH",
  "FIL",
  "APT",
]);

/** Common forex pairs */
const FOREX_PAIRS = new Set([
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "USDCHF",
  "AUDUSD",
  "USDCAD",
  "NZDUSD",
  "XAUUSD",
  "XAGUSD",
  "GBPJPY",
  "EURJPY",
  "AUDJPY",
]);

export class FinanceDataService {
  private binance: Exchange;
  private priceCache: Map<string, { price: PriceData; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 30000; // 30 seconds

  constructor() {
    this.binance = new ccxt.binance({
      enableRateLimit: true,
    });
  }

  /**
   * Check if symbol is a cryptocurrency
   */
  private isCrypto(symbol: string): boolean {
    const upper = symbol.toUpperCase().replace("/USDT", "").replace("USDT", "");
    return CRYPTO_SYMBOLS.has(upper);
  }

  /**
   * Check if symbol is a forex pair
   */
  private isForex(symbol: string): boolean {
    const upper = symbol.toUpperCase().replace("/", "").replace("=X", "");
    return FOREX_PAIRS.has(upper);
  }

  /**
   * Normalize symbol for exchange API
   */
  private normalizeCryptoSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.includes("/")) return upper;
    if (upper.endsWith("USDT")) return upper.replace("USDT", "/USDT");
    return `${upper}/USDT`;
  }

  /**
   * Normalize symbol for Yahoo Finance
   */
  private normalizeYahooSymbol(symbol: string): string {
    const upper = symbol.toUpperCase().replace("/", "");

    // Crypto
    if (this.isCrypto(symbol)) {
      if (upper.endsWith("USDT")) {
        return `${upper.replace("USDT", "")}-USD`;
      }
      return `${upper}-USD`;
    }

    // Forex pairs
    if (this.isForex(symbol)) {
      if (upper.startsWith("XAU") || upper.startsWith("XAG")) {
        return `${upper}=X`;
      }
      return `${upper}=X`;
    }

    // Stocks - just return as-is
    return upper;
  }

  /**
   * Get cryptocurrency price from Binance (with Yahoo fallback)
   */
  async getCryptoPrice(symbol: string): Promise<PriceData> {
    const normalizedSymbol = this.normalizeCryptoSymbol(symbol);

    try {
      const ticker = await this.binance.fetchTicker(normalizedSymbol);

      return {
        symbol: symbol.toUpperCase(),
        price: ticker.last ?? 0,
        change24h: ticker.percentage ?? 0,
        source: "crypto",
        timestamp: Date.now(),
      };
    } catch (error) {
      console.warn(
        `[FinanceDataService] Binance failed for ${symbol}: ${error instanceof Error ? error.message : String(error)}. Failing back to Yahoo Finance...`,
      );
      try {
        const yahooPrice = await this.getYahooPrice(symbol);
        yahooPrice.source = "crypto"; // Keep strict type
        return yahooPrice;
      } catch (yahooError) {
        console.error(`[FinanceDataService] Both Binance and Yahoo failed for ${symbol}:`, yahooError);
        throw new Error(`Failed to fetch price for ${symbol}`);
      }
    }
  }

  /**
   * Get forex/stock price from Yahoo Finance
   */
  async getYahooPrice(symbol: string): Promise<PriceData> {
    const yahooSymbol = this.normalizeYahooSymbol(symbol);

    try {
      const quote = (await yahooFinance.quote(yahooSymbol)) as {
        regularMarketPrice?: number;
        regularMarketChangePercent?: number;
      } | null;

      if (!quote || !quote.regularMarketPrice) {
        throw new Error(`No data for ${symbol}`);
      }

      const source = this.isForex(symbol) ? "forex" : "stock";

      return {
        symbol: symbol.toUpperCase(),
        price: quote.regularMarketPrice,
        change24h: quote.regularMarketChangePercent ?? 0,
        source,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`[FinanceDataService] Error fetching Yahoo price for ${symbol}:`, error);
      throw new Error(`Failed to fetch price for ${symbol}`);
    }
  }

  /**
   * Get price from any source (auto-detects asset type)
   */
  async getPrice(symbol: string): Promise<PriceData> {
    const cacheKey = symbol.toUpperCase();
    const cached = this.priceCache.get(cacheKey);

    // Return cached if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.price;
    }

    let priceData: PriceData;

    if (this.isCrypto(symbol)) {
      priceData = await this.getCryptoPrice(symbol);
    } else {
      priceData = await this.getYahooPrice(symbol);
    }

    // Cache the result
    this.priceCache.set(cacheKey, { price: priceData, timestamp: Date.now() });

    return priceData;
  }

  /**
   * Get prices for multiple symbols
   */
  async getPrices(symbols: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();

    // Batch requests for efficiency
    const promises = symbols.map(async (symbol) => {
      try {
        const price = await this.getPrice(symbol);
        results.set(symbol.toUpperCase(), price);
      } catch (error) {
        console.error(`[FinanceDataService] Failed to get price for ${symbol}:`, error);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get recent large trades from Binance (for whale monitoring)
   */
  async getRecentLargeTrades(
    symbol: string,
    thresholdUSD: number = 500000,
  ): Promise<Array<{ price: number; amount: number; valueUSD: number; timestamp: number }>> {
    try {
      const normalizedSymbol = this.normalizeCryptoSymbol(symbol);
      const trades = await this.binance.fetchTrades(normalizedSymbol, undefined, 100);

      const largeTrades = trades.filter((trade) => {
        const valueUSD = (trade.price ?? 0) * (trade.amount ?? 0);
        return valueUSD >= thresholdUSD;
      });

      return largeTrades.map((trade) => ({
        price: trade.price ?? 0,
        amount: trade.amount ?? 0,
        valueUSD: (trade.price ?? 0) * (trade.amount ?? 0),
        timestamp: trade.timestamp ?? Date.now(),
      }));
    } catch (error) {
      if (error instanceof Error && (error.message.includes("fetch failed") || error.name === "NetworkError")) {
        console.warn(`[FinanceDataService] Binance unreachable for trades (${symbol}). Whale monitoring paused.`);
      } else {
        console.error(`[FinanceDataService] Error fetching trades for ${symbol}:`, error);
      }
      return [];
    }
  }

  /**
   * Get price from multiple exchanges for arbitrage detection
   */
  async getPriceFromExchanges(
    symbol: string,
    exchangeIds: string[] = ["binance", "kraken"],
  ): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    const normalizedSymbol = this.normalizeCryptoSymbol(symbol);

    const promises = exchangeIds.map(async (exchangeId) => {
      try {
        let exchange: Exchange;

        if (exchangeId === "binance") {
          exchange = new ccxt.binance({ enableRateLimit: true });
        } else if (exchangeId === "kraken") {
          exchange = new ccxt.kraken({ enableRateLimit: true });
        } else {
          return; // Unsupported exchange
        }

        const ticker = await exchange.fetchTicker(normalizedSymbol);
        if (ticker.last) {
          results.set(exchangeId, ticker.last);
        }
      } catch {
        // Silently fail for arbitrage as it's optional and likely to fail if blocked
        // console.warn(`[FinanceDataService] ${exchangeId} failed for arbitrage:`, error);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Calculate arbitrage opportunity
   */
  async checkArbitrage(
    symbol: string,
    thresholdPercent: number = 1.5,
  ): Promise<{ hasOpportunity: boolean; spreadPercent: number; exchanges: Map<string, number> }> {
    const prices = await this.getPriceFromExchanges(symbol);

    if (prices.size < 2) {
      return { hasOpportunity: false, spreadPercent: 0, exchanges: prices };
    }

    const priceValues = Array.from(prices.values());
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const spreadPercent = ((maxPrice - minPrice) / minPrice) * 100;

    return {
      hasOpportunity: spreadPercent >= thresholdPercent,
      spreadPercent,
      exchanges: prices,
    };
  }
}
