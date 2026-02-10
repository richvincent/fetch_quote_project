/**
 * @fileoverview Moving Average Convergence Divergence (MACD) calculation.
 * @module indicators/macd
 */

import type { DailyBar, MACDResult } from "../core/types.ts";
import { DEFAULTS } from "../core/constants.ts";

/**
 * Calculates Exponential Moving Average.
 *
 * @param values - Array of values
 * @param period - EMA period
 * @returns Array of EMA values
 */
function calculateEMA(values: number[], period: number): number[] {
  if (values.length < period) {
    return [];
  }

  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  ema.push(sum / period);

  // Calculate remaining EMAs
  for (let i = period; i < values.length; i++) {
    const newEma = (values[i] - ema[ema.length - 1]) * multiplier +
      ema[ema.length - 1];
    ema.push(newEma);
  }

  return ema;
}

/**
 * Calculates the MACD indicator for a series of price data.
 *
 * MACD Line = 12-day EMA - 26-day EMA
 * Signal Line = 9-day EMA of MACD Line
 * Histogram = MACD Line - Signal Line
 *
 * @param bars - Daily price bars (must be in chronological order)
 * @param fastPeriod - Fast EMA period (default 12)
 * @param slowPeriod - Slow EMA period (default 26)
 * @param signalPeriod - Signal EMA period (default 9)
 * @returns MACD result with line, signal, histogram, and trend
 */
export function calculateMACD(
  bars: DailyBar[],
  fastPeriod: number = DEFAULTS.MACD_FAST,
  slowPeriod: number = DEFAULTS.MACD_SLOW,
  signalPeriod: number = DEFAULTS.MACD_SIGNAL,
): MACDResult | null {
  // Need enough bars for slow EMA + signal EMA
  const minBars = slowPeriod + signalPeriod - 1;
  if (bars.length < minBars) {
    return null;
  }

  const prices = bars.map((b) => b.close);

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // Align EMAs (slow EMA starts later)
  const offset = slowPeriod - fastPeriod;
  const alignedFastEMA = fastEMA.slice(offset);

  // Calculate MACD line
  const macdLine: number[] = [];
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(alignedFastEMA[i] - slowEMA[i]);
  }

  // Calculate signal line (9-day EMA of MACD)
  const signalLine = calculateEMA(macdLine, signalPeriod);

  if (signalLine.length === 0) {
    return null;
  }

  // Get current values
  const currentMACD = macdLine[macdLine.length - 1];
  const currentSignal = signalLine[signalLine.length - 1];
  const currentHistogram = currentMACD - currentSignal;

  // Get previous values for trend detection
  const prevHistogram = macdLine.length > 1 && signalLine.length > 1
    ? macdLine[macdLine.length - 2] - signalLine[signalLine.length - 2]
    : 0;

  // Determine trend
  let trend: MACDResult["trend"];
  if (prevHistogram <= 0 && currentHistogram > 0) {
    trend = "bullish";
  } else if (prevHistogram >= 0 && currentHistogram < 0) {
    trend = "bearish";
  } else {
    trend = "neutral";
  }

  const roundedMACD = Math.round(currentMACD * 100) / 100;
  const roundedSignal = Math.round(currentSignal * 100) / 100;
  return {
    macdLine: roundedMACD,
    signalLine: roundedSignal,
    histogram: Math.round((roundedMACD - roundedSignal) * 100) / 100,
    trend,
  };
}

/**
 * Calculates MACD history for charting.
 *
 * @param bars - Daily price bars (chronological order)
 * @param fastPeriod - Fast EMA period
 * @param slowPeriod - Slow EMA period
 * @param signalPeriod - Signal EMA period
 * @returns Object with macd, signal, and histogram arrays
 */
export function calculateMACDHistory(
  bars: DailyBar[],
  fastPeriod: number = DEFAULTS.MACD_FAST,
  slowPeriod: number = DEFAULTS.MACD_SLOW,
  signalPeriod: number = DEFAULTS.MACD_SIGNAL,
): { macd: number[]; signal: number[]; histogram: number[] } {
  const prices = bars.map((b) => b.close);

  if (prices.length < slowPeriod) {
    return { macd: [], signal: [], histogram: [] };
  }

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // Align EMAs
  const offset = slowPeriod - fastPeriod;
  const alignedFastEMA = fastEMA.slice(offset);

  // Calculate MACD line
  const macdLine: number[] = [];
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(alignedFastEMA[i] - slowEMA[i]);
  }

  // Calculate signal line
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // Calculate histogram (aligned with signal line)
  const histogram: number[] = [];
  const signalOffset = signalPeriod - 1;
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + signalOffset] - signalLine[i]);
  }

  return {
    macd: macdLine.map((v) => Math.round(v * 100) / 100),
    signal: signalLine.map((v) => Math.round(v * 100) / 100),
    histogram: histogram.map((v) => Math.round(v * 100) / 100),
  };
}
