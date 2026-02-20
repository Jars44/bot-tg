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

    this.chartCanvas = new ChartJSNodeCanvas({
      width: 800,
      height: 600,
      backgroundColour: "#131722",
      chartCallback: (ChartJS) => {
        if (ChartJS !== Chart) {
          // @ts-expect-error - Internal Chart.js registry access
          ChartJS.registry.controllers.items["candlestick"] = CandlestickController;

          // @ts-expect-error - Internal Chart.js registry access
          ChartJS.registry.elements.items["candlestick"] = CandlestickElement;

          if (CandlestickController.defaults) {
            // @ts-expect-error - Dynamic defaults assignment
            if (!ChartJS.defaults.controllers) ChartJS.defaults.controllers = {};
            // @ts-expect-error - Dynamic defaults assignment
            ChartJS.defaults.controllers["candlestick"] = CandlestickController.defaults;

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

  private calculateBollingerBands(
    data: OHLCVData[],
    period: number = 20,
    stdDeviation: number = 2,
  ): {
    middle: (number | null)[];
    upper: (number | null)[];
    lower: (number | null)[];
  } {
    const middle = this.calculateSMA(data, period);
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(null);
        lower.push(null);
      } else {
        const middleValue = middle[i] as number;
        let variance = 0;
        for (let j = 0; j < period; j++) {
          const diff = data[i - j].close - middleValue;
          variance += diff * diff;
        }
        const stdDev = Math.sqrt(variance / period);
        upper.push(middleValue + stdDeviation * stdDev);
        lower.push(middleValue - stdDeviation * stdDev);
      }
    }

    return { middle, upper, lower };
  }

  private calculateRSI(data: OHLCVData[], period: number = 14): (number | null)[] {
    const rsi: (number | null)[] = [];
    const deltas: number[] = [];

    for (let i = 1; i < data.length; i++) {
      deltas.push(data[i].close - data[i - 1].close);
    }

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        rsi.push(null);
      } else {
        let gain = 0;
        let loss = 0;

        for (let j = 0; j < period; j++) {
          const delta = deltas[i - 1 - j];
          if (delta > 0) {
            gain += delta;
          } else {
            loss += Math.abs(delta);
          }
        }

        const avgGain = gain / period;
        const avgLoss = loss / period;

        if (avgLoss === 0) {
          rsi.push(avgGain === 0 ? 50 : 100);
        } else {
          const rs = avgGain / avgLoss;
          rsi.push(100 - 100 / (1 + rs));
        }
      }
    }

    return rsi;
  }

  async generateChart(symbol: string, timeframe: string = "1h"): Promise<Buffer> {
    let ohlcv = await this.financeService.getOHLCV(symbol, timeframe, 60);

    if (ohlcv.length === 0) {
      throw new Error(`No data available for ${symbol}`);
    }

    ohlcv = ohlcv.slice(-90);

    const bollingerBands = this.calculateBollingerBands(ohlcv, 20, 2);
    const rsi = this.calculateRSI(ohlcv, 14);

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

    const candleData = ohlcv.map((candle) => ({
      x: candle.timestamp,
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close,
    }));

    const volumeData = ohlcv.map((candle, idx) => ({
      x: idx,
      y: candle.volume,
    }));
    const maxVolume = Math.max(...ohlcv.map((c) => c.volume));

    const volumeColors = ohlcv.map((candle) => {
      const isBullish = candle.close >= candle.open;
      return isBullish ? "rgba(8, 153, 129, 0.5)" : "rgba(242, 54, 69, 0.5)";
    });

    const allPrices = ohlcv.flatMap((c) => [c.open, c.high, c.low, c.close]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const padding = (maxPrice - minPrice) * 0.15;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ChartConfiguration uses complex nested types
    const configuration: any = {
      type: "candlestick",
      data: {
        labels,
        datasets: [
          {
            label: "Volume",
            type: "bar" as const,
            data: volumeData,
            backgroundColor: volumeColors,
            borderColor: volumeColors,
            borderWidth: 0,
            barThickness: "flex",
            barPercentage: 0.8,
            yAxisID: "yVolume",
            order: 1,
          },

          {
            label: "BB Band",
            type: "line" as const,
            data: bollingerBands.upper,
            borderColor: "transparent",
            backgroundColor: "rgba(68, 136, 255, 0.08)",
            borderWidth: 0,
            pointRadius: 0,
            fill: true,
            fillBetween: "BB Lower",
            yAxisID: "y",
            order: 2,
          },

          {
            label: "BB Upper (20)",
            type: "line" as const,
            data: bollingerBands.upper,
            borderColor: "rgba(242, 54, 69, 0.5)",
            borderWidth: 1.2,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            yAxisID: "y",
            order: 3,
          },

          {
            label: "BB Lower (20)",
            type: "line" as const,
            data: bollingerBands.lower,
            borderColor: "rgba(242, 54, 69, 0.5)",
            borderWidth: 1.2,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            yAxisID: "y",
            order: 3,
          },

          {
            label: "SMA (20)",
            type: "line" as const,
            data: bollingerBands.middle,
            borderColor: "#4488ff",
            borderWidth: 1.8,
            pointRadius: 0,
            fill: false,
            yAxisID: "y",
            order: 4,
          },

          {
            label: "RSI (14)",
            type: "line" as const,
            data: rsi,
            borderColor: "#9b59b6",
            borderWidth: 2.2,
            pointRadius: 0,
            fill: false,
            tension: 0.1,
            yAxisID: "yRsi",
            order: 5,
          },

          {
            label: symbol.toUpperCase(),
            data: candleData,
            color: {
              up: "#089981",
              down: "#f23645",
              unchanged: "#6c757d",
            },
            borderColor: {
              up: "#089981",
              down: "#f23645",
              unchanged: "#6c757d",
            },
            yAxisID: "y",
            borderWidth: 1.5,
            order: 6,
          },
        ],
      },
      options: {
        responsive: false,
        animation: false as const,
        interaction: {
          mode: "nearest" as const,
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            align: "start" as const,
            text: `${symbol.toUpperCase()}/USD • ${timeframe.toUpperCase()} • JARVIS BOT`,
            color: "#D1D4DC",
            font: { size: 14, weight: "normal" as const, family: "Arial, Helvetica, sans-serif" },
            padding: { bottom: 12 },
          },
          tooltip: {
            enabled: false,
          },
        },

        layout: {
          padding: {
            right: 50,
            top: 20,
            left: 10,
            bottom: 10,
          },
        },

        scales: {
          x: {
            type: "category" as const,
            ticks: {
              color: "#787B86",
              maxRotation: 45,
              minRotation: 0,
              maxTicksLimit: 12,
              font: { size: 11, family: "Arial, Helvetica, sans-serif" },
            },
            grid: {
              color: "#2b2b43",
              drawBorder: false,
              drawOnChartArea: true,
              drawTicks: true,
            },
          },

          y: {
            type: "linear" as const,
            position: "right" as const,
            min: minPrice - padding,
            max: maxPrice + padding,
            ticks: {
              color: "#787B86",
              callback: function (tickValue: string | number) {
                const value = typeof tickValue === "string" ? parseFloat(tickValue) : tickValue;
                return value.toLocaleString("en-US", { minimumFractionDigits: 0 });
              },
              font: { size: 11, family: "Arial, Helvetica, sans-serif" },
              maxTicksLimit: 8,
            },
            grid: {
              color: "#2b2b43",
              drawBorder: false,
              drawOnChartArea: true,
            },
            title: {
              display: false,
            },
          },

          yRsi: {
            type: "linear" as const,
            position: "left" as const,
            min: 0,
            max: 100,
            ticks: {
              color: "#787B86",
              callback: function (tickValue: string | number) {
                return tickValue.toString();
              },
              font: { size: 11, family: "Arial, Helvetica, sans-serif" },
              maxTicksLimit: 5,
            },
            grid: {
              color: "rgba(43, 43, 67, 0.5)",
              drawBorder: false,
              drawOnChartArea: true,
            },
            title: {
              display: false,
            },
          },

          yVolume: {
            type: "linear" as const,
            position: "right" as const,
            min: 0,
            max: maxVolume * 4,
            display: false,
            ticks: {
              display: false,
            },
            grid: {
              display: false,
            },
          },
        },
      },
    };

    const buffer = await this.chartCanvas.renderToBuffer(configuration);
    return buffer;
  }
}
