/**
 * @fileoverview Relative Strength Index (RSI) calculation.
 * @module indicators/rsi
 */

import type { DailyBar, RSIResult } from "../core/types.ts";
import { DEFAULTS } from "../core/constants.ts";

/**
 * Calculates the Relative Strength Index for a series of price data.
 *
 * RSI = 100 - (100 / (1 + RS))
 * where RS = Average Gain / Average Loss
 *
 * @param bars - Daily price bars (must be in chronological order)
 * @param period - RSI period (default 14)
 * @returns RSI result with value and signal
 */
export function calculateRSI(
  bars: DailyBar[],
  period: number = DEFAULTS.RSI_PERIOD,
): RSIResult | null {
  if (bars.length < period + 1) {
    return null;
  }

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    changes.push(bars[i].close - bars[i - 1].close);
  }

  // Calculate initial average gain and loss
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Calculate smoothed RS using Wilder's smoothing
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  // Calculate RSI
  let rsi: number;
  if (avgLoss === 0) {
    rsi = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
  }

  // Determine interpretation
  let interpretation: RSIResult["interpretation"];
  if (rsi <= DEFAULTS.RSI_OVERSOLD) {
    interpretation = "oversold";
  } else if (rsi >= DEFAULTS.RSI_OVERBOUGHT) {
    interpretation = "overbought";
  } else {
    interpretation = "neutral";
  }

  return {
    value: Math.round(rsi * 100) / 100,
    period,
    interpretation,
  };
}

/**
 * Calculates RSI history for charting.
 *
 * @param bars - Daily price bars (chronological order)
 * @param period - RSI period
 * @returns Array of RSI values aligned with input bars
 */
export function calculateRSIHistory(
  bars: DailyBar[],
  period: number = DEFAULTS.RSI_PERIOD,
): number[] {
  if (bars.length < period + 1) {
    return [];
  }

  const rsiValues: number[] = [];

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    changes.push(bars[i].close - bars[i - 1].close);
  }

  // Calculate initial average gain and loss
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // First RSI value
  const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsiValues.push(100 - (100 / (1 + firstRS)));

  // Calculate remaining RSI values
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiValues.push(100 - (100 / (1 + rs)));
  }

  return rsiValues.map((v) => Math.round(v * 100) / 100);
}
