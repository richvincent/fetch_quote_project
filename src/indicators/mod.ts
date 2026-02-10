/**
 * @fileoverview Technical indicators module exports.
 * @module indicators
 */

export { calculateRSI, calculateRSIHistory } from "./rsi.ts";
export {
  calculateSMA,
  calculateSMAHistory,
  calculateSMAs,
  detectSMACross,
} from "./sma.ts";
export { calculateMACD, calculateMACDHistory } from "./macd.ts";

import type { DailyBar, IndicatorOutput, SMAResult } from "../core/types.ts";
import { calculateRSI } from "./rsi.ts";
import { calculateSMAs, detectSMACross } from "./sma.ts";
import { calculateMACD } from "./macd.ts";
import { DEFAULTS } from "../core/constants.ts";

/**
 * Configuration for indicator calculations.
 */
export interface IndicatorConfig {
  rsi?: {
    enabled: boolean;
    period?: number;
  };
  sma?: {
    enabled: boolean;
    periods?: number[];
  };
  macd?: {
    enabled: boolean;
    fast?: number;
    slow?: number;
    signal?: number;
  };
}

/**
 * Calculates all enabled technical indicators.
 *
 * @param bars - Daily price bars (chronological order)
 * @param config - Indicator configuration
 * @returns Combined indicator output
 */
export function calculateIndicators(
  bars: DailyBar[],
  config: IndicatorConfig = {
    rsi: { enabled: true },
    sma: { enabled: true },
    macd: { enabled: true },
  },
): IndicatorOutput {
  const output: IndicatorOutput = {
    computedAt: new Date().toISOString(),
  };

  // Calculate RSI
  if (config.rsi?.enabled !== false) {
    const rsi = calculateRSI(bars, config.rsi?.period ?? DEFAULTS.RSI_PERIOD);
    if (rsi) {
      output.rsi = rsi;
    }
  }

  // Calculate SMAs
  if (config.sma?.enabled !== false) {
    const periods = config.sma?.periods ?? [...DEFAULTS.SMA_PERIODS];
    const smas = calculateSMAs(bars, periods);
    if (smas.size > 0) {
      const smaResults: SMAResult[] = [];

      // Detect SMA cross if we have both 50 and 200
      const cross = (periods.includes(50) && periods.includes(200))
        ? detectSMACross(bars)
        : null;

      for (const [period, sma] of smas) {
        // Add crossover info to the 50-period SMA
        if (period === 50 && cross && cross !== "none") {
          smaResults.push({ ...sma, crossover: cross });
        } else {
          smaResults.push(sma);
        }
      }

      output.sma = smaResults;
    }
  }

  // Calculate MACD
  if (config.macd?.enabled !== false) {
    const macd = calculateMACD(
      bars,
      config.macd?.fast ?? DEFAULTS.MACD_FAST,
      config.macd?.slow ?? DEFAULTS.MACD_SLOW,
      config.macd?.signal ?? DEFAULTS.MACD_SIGNAL,
    );
    if (macd) {
      output.macd = macd;
    }
  }

  return output;
}

/**
 * Formats indicator output for display.
 *
 * @param indicators - Calculated indicators
 * @returns Formatted string array for display
 */
export function formatIndicators(indicators: IndicatorOutput): string[] {
  const lines: string[] = [];

  if (indicators.rsi) {
    const rsi = indicators.rsi;
    const interpText = rsi.interpretation === "neutral"
      ? ""
      : ` (${rsi.interpretation})`;
    lines.push(`  RSI(${rsi.period}): ${rsi.value}${interpText}`);
  }

  if (indicators.sma) {
    for (const sma of indicators.sma) {
      const position = sma.priceRelation === "above"
        ? "price above"
        : sma.priceRelation === "below"
        ? "price below"
        : "price at";
      lines.push(
        `  SMA(${sma.period}): $${sma.value.toFixed(2)} (${position})`,
      );

      if (sma.crossover) {
        const crossType = sma.crossover === "golden"
          ? "Golden Cross"
          : "Death Cross";
        lines.push(`    ^ ${crossType} detected`);
      }
    }
  }

  if (indicators.macd) {
    const macd = indicators.macd;
    const trendText = macd.trend === "neutral" ? "" : ` (${macd.trend})`;
    const histSign = macd.histogram > 0 ? "+" : "";
    lines.push(
      `  MACD: ${macd.macdLine} / ${macd.signalLine} / ${histSign}${macd.histogram}${trendText}`,
    );
  }

  return lines;
}
