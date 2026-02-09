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

    // Forex pairs / Commodities
    if (this.isForex(symbol)) {
      if (upper.startsWith("XAU")) {
        return "GC=F"; // Gold Futures
      }
      if (upper.startsWith("XAG")) {
        return "SI=F"; // Silver Futures
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
      const quote = (await yahooFinance.quote(yahooSymbol)) as any; // Use any to access potential fields safely

      if (!quote) {
        throw new Error(`No data for ${symbol}`);
      }

      // Try multiple fields for price
      const price =
        quote.regularMarketPrice ||
        quote.price ||
        quote.ask ||
        quote.bid ||
        quote.preMarketPrice ||
        quote.postMarketPrice;

      if (!price) {
        console.warn(`[FinanceDataService] Missing price fields for ${symbol}. Quote:`, JSON.stringify(quote));
        throw new Error(`No price data for ${symbol}`);
      }

      const source = this.isForex(symbol) ? "forex" : "stock";

      return {
        symbol: symbol.toUpperCase(),
        price: price,
        change24h: quote.regularMarketChangePercent ?? quote.regularMarketChange ?? 0,
        source,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`[FinanceDataService] Error fetching Yahoo price for ${symbol}:`, error);

      // Fallback for Gold if XAUUSD fails
      if (symbol === "XAUUSD" || symbol === "XAUUSD=X") {
        console.log("[FinanceDataService] Attempting fallback to GC=F for Gold");
        try {
          return await this.getYahooPrice("GC=F");
        } catch {
          throw new Error(`Failed to fetch price for ${symbol} (and fallback failed)`);
        }
      }

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
      if (
        error instanceof Error &&
        (error.message.includes("fetch failed") ||
          error.name === "NetworkError" ||
          error.name === "ExchangeNotAvailable" || // Geo-restriction
          error.message.includes("451"))
      ) {
        console.warn(`[FinanceDataService] Binance unavailable for trades (${symbol}). Whale monitoring paused.`);
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

  /**
   * OHLCV data point for charting
   */
  static readonly TIMEFRAMES: Record<string, string> = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
  };

  /**
   * Get OHLCV (candlestick) data for charting
   * @param symbol Asset symbol (BTC, ETH, XAUUSD, etc.)
   * @param timeframe Timeframe (1m, 5m, 15m, 1h, 4h, 1d)
   * @param limit Number of candles to fetch (default: 100)
   */
  async getOHLCV(
    symbol: string,
    timeframe: string = "1h",
    limit: number = 100,
  ): Promise<Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }>> {
    // Validate timeframe
    const tf = FinanceDataService.TIMEFRAMES[timeframe] || "1h";

    if (this.isCrypto(symbol)) {
      return this.getCryptoOHLCV(symbol, tf, limit);
    } else {
      return this.getYahooOHLCV(symbol, timeframe, limit);
    }
  }

  /**
   * Get OHLCV from Binance for crypto (with Yahoo fallback)
   */
  private async getCryptoOHLCV(
    symbol: string,
    timeframe: string,
    limit: number,
  ): Promise<Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }>> {
    try {
      const normalizedSymbol = this.normalizeCryptoSymbol(symbol);
      const ohlcv = await this.binance.fetchOHLCV(normalizedSymbol, timeframe, undefined, limit);

      return ohlcv.map((candle) => ({
        timestamp: candle[0] as number,
        open: candle[1] as number,
        high: candle[2] as number,
        low: candle[3] as number,
        close: candle[4] as number,
        volume: candle[5] as number,
      }));
    } catch (error) {
      console.warn(
        `[FinanceDataService] Binance failed for OHLCV ${symbol}: ${error instanceof Error ? error.message : String(error)}. Failing back to Yahoo Finance...`,
      );
      return this.getYahooOHLCV(symbol, timeframe, limit);
    }
  }

  /**
   * Get OHLCV from Yahoo Finance for forex/stocks
   */
  private async getYahooOHLCV(
    symbol: string,
    timeframe: string,
    limit: number,
  ): Promise<Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }>> {
    try {
      const yahooSymbol = this.normalizeYahooSymbol(symbol);

      // Map timeframe to Yahoo interval
      const intervalMap: Record<string, string> = {
        "1m": "1m",
        "5m": "5m",
        "15m": "15m",
        "1h": "1h",
        "4h": "1h", // Yahoo doesn't support 4h, use 1h
        "1d": "1d",
      };

      const interval = intervalMap[timeframe] || "1h";

      // Calculate date range based on timeframe
      const now = new Date();
      let startDate: Date;

      switch (timeframe) {
        case "1m":
        case "5m":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
          break;
        case "15m":
        case "1h":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
          break;
        case "4h":
        case "1d":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const result = await yahooFinance.chart(yahooSymbol, {
        period1: startDate,
        period2: now,
        interval: interval as "1m" | "5m" | "15m" | "1h" | "1d",
      });

      if (!result.quotes || result.quotes.length === 0) {
        throw new Error(`No OHLCV data for ${symbol}`);
      }

      // Take last 'limit' candles
      const quotes = result.quotes.slice(-limit);

      return quotes.map((q) => ({
        timestamp: new Date(q.date).getTime(),
        open: q.open ?? 0,
        high: q.high ?? 0,
        low: q.low ?? 0,
        close: q.close ?? 0,
        volume: q.volume ?? 0,
      }));
    } catch (error) {
      console.error(`[FinanceDataService] Error fetching Yahoo OHLCV for ${symbol}:`, error);
      throw new Error(`Failed to fetch OHLCV data for ${symbol}`);
    }
  }
}
