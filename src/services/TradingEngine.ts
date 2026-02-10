/**
 * Paper Trading Engine
 * Handles virtual trading logic with real market prices
 */

import type { JsonDb } from "../database/JsonDb.js";
import type { TradeResult, PortfolioSummary, PositionWithPnL } from "../database/types.js";
import type { FinanceDataService } from "./FinanceDataService.js";
import { CONFIG } from "../config/index.js";

export class TradingEngine {
  private db: JsonDb;
  private financeService: FinanceDataService;

  constructor(db: JsonDb, financeService: FinanceDataService) {
    this.db = db;
    this.financeService = financeService;
  }

  /**
   * Get price for a symbol (delegated to finance service)
   */
  async getPrice(symbol: string) {
    return this.financeService.getPrice(symbol);
  }

  /**
   * Execute a buy order
   */
  async executeBuy(chatId: number, symbol: string, quantity: number): Promise<TradeResult> {
    try {
      // Get current price
      const priceData = await this.financeService.getPrice(symbol);
      const price = priceData.price;

      // Calculate total cost with commission
      const grossCost = price * quantity;
      const commission = grossCost * CONFIG.PAPER_TRADING.COMMISSION_RATE;
      const totalCost = grossCost + commission;

      // Get portfolio
      const portfolio = await this.db.getOrCreatePortfolio(chatId);

      // Check if user has enough cash
      if (portfolio.cashBalance < totalCost) {
        return {
          success: false,
          message: `Saldo tidak cukup. Dibutuhkan: $${totalCost.toFixed(2)}, Saldo: $${portfolio.cashBalance.toFixed(2)}`,
        };
      }

      // Check if position already exists for this symbol
      const existingPosition = await this.db.getPosition(chatId, symbol);

      if (existingPosition) {
        // Average up the position
        const totalQuantity = existingPosition.quantity + quantity;
        const totalCostBasis = existingPosition.entryPrice * existingPosition.quantity + price * quantity;
        const averagePrice = totalCostBasis / totalQuantity;

        existingPosition.quantity = totalQuantity;
        existingPosition.entryPrice = averagePrice;

        // Deduct cash
        portfolio.cashBalance -= totalCost;
        await this.db.updatePortfolio(chatId, {
          cashBalance: portfolio.cashBalance,
          positions: portfolio.positions,
        });

        // Record trade
        const trade = await this.db.addTradeRecord(chatId, {
          symbol: symbol.toUpperCase(),
          action: "buy",
          price,
          quantity,
          commission,
          executedAt: Date.now(),
        });

        return {
          success: true,
          message:
            `✓ Menambah posisi ${symbol.toUpperCase()}\n` +
            `Total: ${totalQuantity} @ $${averagePrice.toFixed(2)} (avg)\n` +
            `Sisa saldo: $${portfolio.cashBalance.toFixed(2)}`,
          position: existingPosition,
          trade,
        };
      }

      // Create new position
      const position = await this.db.addPosition(chatId, {
        symbol: symbol.toUpperCase(),
        entryPrice: price,
        quantity,
        type: "long",
        openedAt: Date.now(),
      });

      // Deduct cash
      portfolio.cashBalance -= totalCost;
      await this.db.updatePortfolio(chatId, { cashBalance: portfolio.cashBalance });

      // Record trade
      const trade = await this.db.addTradeRecord(chatId, {
        symbol: symbol.toUpperCase(),
        action: "buy",
        price,
        quantity,
        commission,
        executedAt: Date.now(),
      });

      return {
        success: true,
        message:
          `✓ Beli ${quantity} ${symbol.toUpperCase()}\n` +
          `Harga: $${price.toFixed(2)}\n` +
          `Total: $${totalCost.toFixed(2)}\n` +
          `Sisa saldo: $${portfolio.cashBalance.toFixed(2)}`,
        position,
        trade,
      };
    } catch (error) {
      console.error("[TradingEngine] Buy error:", error);
      return {
        success: false,
        message: `Gagal membeli ${symbol}. Pastikan simbol valid (contoh: BTC, ETH, XAUUSD)`,
      };
    }
  }

  /**
   * Execute a sell order
   */
  async executeSell(chatId: number, symbol: string, quantity: number): Promise<TradeResult> {
    try {
      // Get current price
      const priceData = await this.financeService.getPrice(symbol);
      const price = priceData.price;

      // Get portfolio and position
      const portfolio = await this.db.getOrCreatePortfolio(chatId);
      const position = await this.db.getPosition(chatId, symbol);

      if (!position) {
        return {
          success: false,
          message: `Kamu tidak punya posisi ${symbol.toUpperCase()}`,
        };
      }

      if (quantity > position.quantity) {
        return {
          success: false,
          message: `Quantity melebihi posisi. Posisi saat ini: ${position.quantity}`,
        };
      }

      // Calculate proceeds and PnL
      const grossProceeds = price * quantity;
      const commission = grossProceeds * CONFIG.PAPER_TRADING.COMMISSION_RATE;
      const netProceeds = grossProceeds - commission;
      const costBasis = position.entryPrice * quantity;
      const pnl = netProceeds - costBasis;
      const pnlPercent = (pnl / costBasis) * 100;

      if (quantity === position.quantity) {
        // Close entire position
        const trade = await this.db.closePosition(chatId, position.id, price);

        return {
          success: true,
          message:
            `✓ Jual ${quantity} ${symbol.toUpperCase()}\n` +
            `Harga: $${price.toFixed(2)}\n` +
            `${pnl >= 0 ? "▲" : "▼"} PnL: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)\n` +
            `Saldo: $${(portfolio.cashBalance + netProceeds).toFixed(2)}`,
          trade: trade ?? undefined,
          pnl,
        };
      }

      // Partial sell
      position.quantity -= quantity;
      await this.db.updatePortfolio(chatId, { positions: portfolio.positions });

      // Add proceeds to cash
      portfolio.cashBalance += netProceeds;
      await this.db.updatePortfolio(chatId, { cashBalance: portfolio.cashBalance });

      // Record trade
      const trade = await this.db.addTradeRecord(chatId, {
        symbol: symbol.toUpperCase(),
        action: "sell",
        price,
        quantity,
        commission,
        pnl,
        executedAt: Date.now(),
      });

      return {
        success: true,
        message:
          `✓ Jual ${quantity} ${symbol.toUpperCase()}\n` +
          `Harga: $${price.toFixed(2)}\n` +
          `${pnl >= 0 ? "▲" : "▼"} PnL: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)\n` +
          `Sisa posisi: ${position.quantity}\n` +
          `Saldo: $${portfolio.cashBalance.toFixed(2)}`,
        trade,
        pnl,
      };
    } catch (error) {
      console.error("[TradingEngine] Sell error:", error);
      return {
        success: false,
        message: `Gagal menjual ${symbol}. Silakan coba lagi.`,
      };
    }
  }

  /**
   * Close all open positions
   */
  async closeAllPositions(chatId: number): Promise<{ success: boolean; message: string; trades: TradeResult[] }> {
    try {
      const portfolio = await this.db.getOrCreatePortfolio(chatId);
      const positions = portfolio.positions;

      if (positions.length === 0) {
        return {
          success: false,
          message: "Tidak ada posisi terbuka untuk ditutup.",
          trades: [],
        };
      }

      const results: TradeResult[] = [];
      let successCount = 0;
      let totalPnL = 0;

      // Close each position
      for (const position of positions) {
        // Execute sell for full quantity
        const result = await this.executeSell(chatId, position.symbol, position.quantity);
        results.push(result);

        if (result.success) {
          successCount++;
          if (result.pnl) totalPnL += result.pnl;
        }
      }

      const pnlIndicator = totalPnL >= 0 ? "▲" : "▼";
      const pnlSign = totalPnL >= 0 ? "+" : "";

      return {
        success: true,
        message:
          `✓ Menutup ${successCount} dari ${positions.length} posisi\n` +
          `${pnlIndicator} Total Realized PnL: ${pnlSign}$${totalPnL.toFixed(2)}\n\n` +
          `Gunakan /portfolio untuk melihat saldo terbaru.`,
        trades: results,
      };
    } catch (error) {
      console.error("[TradingEngine] Close all error:", error);
      return {
        success: false,
        message: "Gagal memproses penutupan semua posisi.",
        trades: [],
      };
    }
  }

  /**
   * Get portfolio summary with live prices
   */
  async getPortfolioSummary(chatId: number): Promise<PortfolioSummary> {
    const portfolio = await this.db.getOrCreatePortfolio(chatId);

    const positionsWithPnL: PositionWithPnL[] = [];
    let totalUnrealizedPnL = 0;
    let totalEquity = portfolio.cashBalance;
    let totalCostBasis = 0;

    // Get live prices for all positions
    for (const position of portfolio.positions) {
      try {
        const priceData = await this.financeService.getPrice(position.symbol);
        const currentPrice = priceData.price;
        const marketValue = currentPrice * position.quantity;
        const costBasis = position.entryPrice * position.quantity;
        const unrealizedPnL = marketValue - costBasis;
        const unrealizedPnLPercent = (unrealizedPnL / costBasis) * 100;

        positionsWithPnL.push({
          ...position,
          currentPrice,
          marketValue,
          unrealizedPnL,
          unrealizedPnLPercent,
        });

        totalUnrealizedPnL += unrealizedPnL;
        totalEquity += marketValue;
        totalCostBasis += costBasis;
      } catch (error) {
        console.error(`[TradingEngine] Failed to get price for ${position.symbol}:`, error);
        // Include position without live price
        positionsWithPnL.push({
          ...position,
          currentPrice: position.entryPrice,
          marketValue: position.entryPrice * position.quantity,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
        });
      }
    }

    const unrealizedPnLPercent = totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;

    return {
      cashBalance: portfolio.cashBalance,
      equity: totalEquity,
      unrealizedPnL: totalUnrealizedPnL,
      unrealizedPnLPercent,
      positions: positionsWithPnL,
    };
  }

  /**
   * Format portfolio summary for display
   */
  formatPortfolioSummary(summary: PortfolioSummary): string {
    const pnlIndicator = summary.unrealizedPnL >= 0 ? "▲" : "▼";
    const pnlSign = summary.unrealizedPnL >= 0 ? "+" : "";

    let message = `*Paper Trading Portfolio*\n\n`;
    message += `Cash: $${summary.cashBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n`;
    message += `Equity: $${summary.equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n`;
    message += `${pnlIndicator} Unrealized PnL: ${pnlSign}$${summary.unrealizedPnL.toFixed(2)} (${pnlSign}${summary.unrealizedPnLPercent.toFixed(2)}%)\n`;

    if (summary.positions.length > 0) {
      message += `\n*Open Positions*\n`;

      for (const pos of summary.positions) {
        const posIndicator = pos.unrealizedPnL >= 0 ? "▲" : "▼";
        const posPnlSign = pos.unrealizedPnL >= 0 ? "+" : "";

        message += `• ${pos.symbol}: ${pos.quantity} @ $${pos.entryPrice.toFixed(2)}\n`;
        message += `   ${posIndicator} $${pos.marketValue.toFixed(2)} (${posPnlSign}${pos.unrealizedPnLPercent.toFixed(2)}%)\n`;
      }
    } else {
      message += `\n_Tidak ada posisi terbuka_`;
    }

    return message;
  }
}
