/**
 * Chart Service
 * Server-side candlestick chart generation using chartjs-node-canvas
 */

import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import {
  Chart,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  LineController,
  LineElement,
  PointElement,
} from "chart.js";
// @ts-expect-error - No types for chartjs-chart-financial ESM bundle
import { CandlestickController, CandlestickElement } from "chartjs-chart-financial/dist/chartjs-chart-financial.esm.js";
import { format } from "date-fns";
import type { FinanceDataService } from "./FinanceDataService.js";

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class ChartService {
  private financeService: FinanceDataService;
  private chartCanvas: ChartJSNodeCanvas;

  constructor(financeService: FinanceDataService) {
    this.financeService = financeService;

    // Initialize canvas with dark background
    console.log("Initializing ChartJSNodeCanvas...");
    console.log("CandlestickController.id:", CandlestickController.id);

    this.chartCanvas = new ChartJSNodeCanvas({
      width: 800,
      height: 450,
      backgroundColour: "#1a1a2e",
      chartCallback: (ChartJS) => {
        // Fix for multiple Chart.js instances (Dual Package Hazard):
        // Manually register components to bypass instanceof checks in ChartJS.register()
        if (ChartJS !== Chart) {
          // @ts-expect-error - Internal Chart.js registry access
          ChartJS.registry.controllers.items["candlestick"] = CandlestickController;

          // @ts-expect-error - Internal Chart.js registry access
          ChartJS.registry.elements.items["candlestick"] = CandlestickElement;

          // Register Defaults
          if (CandlestickController.defaults) {
            // @ts-expect-error - Dynamic defaults assignment
            if (!ChartJS.defaults.controllers) ChartJS.defaults.controllers = {};
            // @ts-expect-error - Dynamic defaults assignment
            ChartJS.defaults.controllers["candlestick"] = CandlestickController.defaults;

            // V4 often looks in datasets for types
            // @ts-expect-error - Dynamic defaults assignment
            if (!ChartJS.defaults.datasets) ChartJS.defaults.datasets = {};
            // @ts-expect-error - Dynamic defaults assignment
            ChartJS.defaults.datasets["candlestick"] = CandlestickController.defaults;

            ChartJS.defaults.set("candlestick", CandlestickController.defaults);
          }
          if (CandlestickElement.defaults) {
            // @ts-expect-error - Dynamic defaults assignment
            if (!ChartJS.defaults.elements) ChartJS.defaults.elements = {};
            // @ts-expect-error - Dynamic defaults assignment
            ChartJS.defaults.elements["candlestick"] = CandlestickElement.defaults;
            // @ts-expect-error - Dynamic defaults assignment
            ChartJS.defaults.datasets["candlestick"] = CandlestickController.defaults;

            // CRITICAL FIX: CandlestickController extends ESM BarController, so it uses ESM defaults!
            // We must register defaults on the global Chart (ESM) instance too.
            // @ts-expect-error - Dynamic defaults assignment to ESM Chart instance
            if (!Chart.defaults.elements) Chart.defaults.elements = {};
            // @ts-expect-error - Dynamic defaults assignment to ESM Chart instance
            Chart.defaults.elements["candlestick"] = CandlestickElement.defaults;
            // @ts-expect-error - Dynamic defaults assignment to ESM Chart instance
            if (!Chart.defaults.datasets) Chart.defaults.datasets = {};
            // @ts-expect-error - Dynamic defaults assignment to ESM Chart instance
            Chart.defaults.datasets["candlestick"] = CandlestickController.defaults;
          }
        } else {
          ChartJS.register(CandlestickController, CandlestickElement);
        }

        ChartJS.register(
          CategoryScale,
          LinearScale,
          TimeScale,
          Tooltip,
          Legend,
          LineController,
          LineElement,
          PointElement,
        );
      },
    });
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(data: OHLCVData[], period: number): (number | null)[] {
    const sma: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j].close;
        }
        sma.push(sum / period);
      }
    }

    return sma;
  }

  /**
   * Generate candlestick chart for a symbol
   * @param symbol Asset symbol (BTC, ETH, XAUUSD, etc.)
   * @param timeframe Timeframe (1m, 5m, 15m, 1h, 4h, 1d)
   * @returns PNG image buffer
   */
  async generateChart(symbol: string, timeframe: string = "1h"): Promise<Buffer> {
    // Fetch OHLCV data
    const ohlcv = await this.financeService.getOHLCV(symbol, timeframe, 60);

    if (ohlcv.length === 0) {
      throw new Error(`No data available for ${symbol}`);
    }

    // Calculate SMA(20)
    const sma20 = this.calculateSMA(ohlcv, 20);

    // Prepare labels (time)
    const labels = ohlcv.map((candle) => {
      const date = new Date(candle.timestamp);
      if (timeframe === "1d") {
        return format(date, "MMM dd");
      } else if (timeframe === "4h" || timeframe === "1h") {
        return format(date, "dd HH:mm");
      } else {
        return format(date, "HH:mm");
      }
    });

    // Prepare candlestick data
    const candleData = ohlcv.map((candle) => ({
      x: candle.timestamp,
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close,
    }));

    // Get price range for scaling
    const allPrices = ohlcv.flatMap((c) => [c.open, c.high, c.low, c.close]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const padding = (maxPrice - minPrice) * 0.1;

    // Current price for annotation
    const currentPrice = ohlcv[ohlcv.length - 1].close;
    const priceChange = currentPrice - ohlcv[0].open;
    const priceChangePercent = (priceChange / ohlcv[0].open) * 100;
    const isUp = priceChange >= 0;

    const configuration: any = {
      type: "candlestick",
      data: {
        labels,
        datasets: [
          {
            label: symbol.toUpperCase(),
            data: candleData,
            borderColor: {
              up: "#00ff88",
              down: "#ff4444",
              unchanged: "#888888",
            },
            backgroundColor: {
              up: "rgba(0, 255, 136, 0.8)",
              down: "rgba(255, 68, 68, 0.8)",
              unchanged: "rgba(136, 136, 136, 0.8)",
            },
          },
          {
            label: "SMA(20)",
            type: "line" as const,
            data: sma20,
            borderColor: "#4488ff",
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: false,
        animation: false as const,
        plugins: {
          legend: {
            display: true,
            position: "top" as const,
            labels: {
              color: "#ffffff",
              font: { size: 12 },
            },
          },
          title: {
            display: true,
            text: `${symbol.toUpperCase()} | ${timeframe.toUpperCase()} | ${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${isUp ? "+" : ""}${priceChangePercent.toFixed(2)}%)`,
            color: isUp ? "#00ff88" : "#ff4444",
            font: { size: 16, weight: "bold" as const },
          },
          tooltip: {
            enabled: false,
          },
        },
        scales: {
          x: {
            type: "category" as const,
            ticks: {
              color: "#888888",
              maxRotation: 45,
              maxTicksLimit: 10,
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
          y: {
            type: "linear" as const,
            position: "right" as const,
            min: minPrice - padding,
            max: maxPrice + padding,
            ticks: {
              color: "#888888",
              callback: function (tickValue: string | number) {
                const value = typeof tickValue === "string" ? parseFloat(tickValue) : tickValue;
                return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2 });
              },
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
        },
      },
    };

    // Render chart to buffer
    const buffer = await this.chartCanvas.renderToBuffer(configuration);
    return buffer;
  }
}
