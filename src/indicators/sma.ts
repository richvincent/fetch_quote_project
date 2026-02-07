/**
 * @fileoverview Simple Moving Average (SMA) calculation.
 * @module indicators/sma
 */

import type { DailyBar, SMAResult } from "../core/types.ts";
import { DEFAULTS } from "../core/constants.ts";

/**
 * Calculates a Simple Moving Average for a series of price data.
 *
 * @param bars - Daily price bars (must be in chronological order)
 * @param period - SMA period (e.g., 50, 200)
 * @returns SMA result with value and price relationship
 */
export function calculateSMA(
  bars: DailyBar[],
  period: number,
): SMAResult | null {
  if (bars.length < period) {
    return null;
  }

  // Get the most recent 'period' bars
  const recentBars = bars.slice(-period);
  const sum = recentBars.reduce((acc, bar) => acc + bar.close, 0);
  const value = sum / period;

  // Get current price (last bar)
  const currentPrice = bars[bars.length - 1].close;

  // Determine price relation
  let priceRelation: SMAResult["priceRelation"];
  if (currentPrice > value) {
    priceRelation = "above";
  } else if (currentPrice < value) {
    priceRelation = "below";
  } else {
    priceRelation = "at";
  }

  return {
    value: Math.round(value * 100) / 100,
    period,
    priceRelation,
  };
}

/**
 * Calculates multiple SMAs at once.
 *
 * @param bars - Daily price bars (chronological order)
 * @param periods - Array of SMA periods to calculate
 * @returns Map of period to SMA result
 */
export function calculateSMAs(
  bars: DailyBar[],
  periods: number[] = [...DEFAULTS.SMA_PERIODS],
): Map<number, SMAResult> {
  const results = new Map<number, SMAResult>();

  for (const period of periods) {
    const sma = calculateSMA(bars, period);
    if (sma) {
      results.set(period, sma);
    }
  }

  return results;
}

/**
 * Detects golden cross (50 SMA crosses above 200 SMA) or
 * death cross (50 SMA crosses below 200 SMA).
 *
 * @param bars - Daily price bars (chronological order)
 * @param shortPeriod - Short SMA period (default 50)
 * @param longPeriod - Long SMA period (default 200)
 * @returns Cross signal or null if not enough data
 */
export function detectSMACross(
  bars: DailyBar[],
  shortPeriod: number = 50,
  longPeriod: number = 200,
): "golden" | "death" | "none" | null {
  if (bars.length < longPeriod + 1) {
    return null;
  }

  // Calculate current SMAs
  const currentShort = calculateSMA(bars, shortPeriod);
  const currentLong = calculateSMA(bars, longPeriod);

  // Calculate previous SMAs (one day ago)
  const prevBars = bars.slice(0, -1);
  const prevShort = calculateSMA(prevBars, shortPeriod);
  const prevLong = calculateSMA(prevBars, longPeriod);

  if (!currentShort || !currentLong || !prevShort || !prevLong) {
    return null;
  }

  const currentDiff = currentShort.value - currentLong.value;
  const prevDiff = prevShort.value - prevLong.value;

  // Golden cross: short crosses above long
  if (prevDiff <= 0 && currentDiff > 0) {
    return "golden";
  }

  // Death cross: short crosses below long
  if (prevDiff >= 0 && currentDiff < 0) {
    return "death";
  }

  return "none";
}

/**
 * Calculates SMA history for charting.
 *
 * @param bars - Daily price bars (chronological order)
 * @param period - SMA period
 * @returns Array of SMA values aligned with input bars (NaN for insufficient data)
 */
export function calculateSMAHistory(
  bars: DailyBar[],
  period: number,
): number[] {
  const smaValues: number[] = [];

  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) {
      smaValues.push(NaN);
    } else {
      const windowBars = bars.slice(i - period + 1, i + 1);
      const sum = windowBars.reduce((acc, bar) => acc + bar.close, 0);
      smaValues.push(Math.round((sum / period) * 100) / 100);
    }
  }

  return smaValues;
}
