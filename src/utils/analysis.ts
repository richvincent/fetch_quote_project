/**
 * @fileoverview Analysis and metrics calculation utilities.
 * @module utils/analysis
 */

import type { DailyBar, Metrics, Signal, TradingZones } from "../core/types.ts";
import { DEFAULTS } from "../core/constants.ts";

/**
 * Computes 52-week high (adjusted for splits) and 30-day average volume.
 * @param bars - Array of daily bars sorted by date descending
 * @returns Metrics object with high52Week and avgVolume30Day
 */
export function computeMetrics(bars: DailyBar[]): Metrics {
  const window = bars.slice(0, DEFAULTS.TRADING_DAYS_WINDOW);

  let high52Week = -Infinity;
  let volSum30 = 0;
  let volCount = 0;

  for (let i = 0; i < window.length; i++) {
    const bar = window[i];

    // Calculate split-adjusted high
    const multiplier =
      Number.isFinite(bar.adjustedClose) &&
      Number.isFinite(bar.close) &&
      bar.close !== 0
        ? bar.adjustedClose / bar.close
        : 1;

    const adjHigh = bar.high * multiplier;
    if (Number.isFinite(adjHigh)) {
      high52Week = Math.max(high52Week, adjHigh);
    }

    // Calculate 30-day average volume
    if (i < DEFAULTS.VOLUME_AVG_DAYS) {
      if (Number.isFinite(bar.volume)) {
        volSum30 += bar.volume;
        volCount++;
      }
    }
  }

  return {
    high52Week: Number.isFinite(high52Week) ? high52Week : NaN,
    avgVolume30Day: volCount > 0 ? volSum30 / volCount : NaN,
  };
}

/**
 * Calculates trading zones based on 52-week high.
 * @param high52Week - The 52-week high price
 * @param buyPct - Buy zone percentage below high (default: 7)
 * @param sellPct - Sell threshold percentage below high (default: 8)
 * @returns Trading zone boundaries
 */
export function calculateZones(
  high52Week: number,
  buyPct = DEFAULTS.BUY_PCT,
  sellPct = DEFAULTS.SELL_PCT,
): TradingZones {
  return {
    buyZoneLow: high52Week * (1 - buyPct / 100),
    buyZoneHigh: high52Week,
    sellThreshold: high52Week * (1 - sellPct / 100),
  };
}

/**
 * Determines trading signal based on price position.
 * @param price - Current price
 * @param high52Week - 52-week high
 * @param buyPct - Buy zone percentage
 * @param sellPct - Sell threshold percentage
 * @returns Trading signal
 */
export function determineSignal(
  price: number,
  high52Week: number,
  buyPct = DEFAULTS.BUY_PCT,
  sellPct = DEFAULTS.SELL_PCT,
): Signal {
  if (!Number.isFinite(price) || !Number.isFinite(high52Week) || high52Week <= 0) {
    return null;
  }

  const zones = calculateZones(high52Week, buyPct, sellPct);

  if (price <= zones.sellThreshold) {
    return "SELL";
  } else if (price >= zones.buyZoneLow && price <= zones.buyZoneHigh) {
    return "BUY";
  }

  return "HOLD";
}

/**
 * Calculates volume comparison to average.
 * @param todayVolume - Today's volume
 * @param avgVolume - Average volume
 * @returns Percentage difference (positive = above average)
 */
export function volumeComparison(todayVolume: number, avgVolume: number): number {
  if (!Number.isFinite(todayVolume) || !Number.isFinite(avgVolume) || avgVolume === 0) {
    return NaN;
  }
  return (todayVolume - avgVolume) / avgVolume;
}

/**
 * Extracts recent price history for charting.
 * @param bars - Daily bars sorted by date descending
 * @param days - Number of days to extract
 * @returns Array of {date, price} in chronological order
 */
export function extractPriceHistory(
  bars: DailyBar[],
  days = 90,
): Array<{ date: string; price: number }> {
  const recent = bars.slice(0, days).reverse(); // chronological order

  return recent
    .map((bar) => ({
      date: bar.date,
      price: bar.adjustedClose || bar.close,
    }))
    .filter((d) => Number.isFinite(d.price));
}
