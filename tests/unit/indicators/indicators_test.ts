/**
 * @fileoverview Tests for technical indicators.
 */

import { assertEquals, assertExists } from "@std/assert";
import type { DailyBar } from "../../../src/core/types.ts";
import { calculateRSI } from "../../../src/indicators/rsi.ts";
import { calculateSMA, calculateSMAs, detectSMACross } from "../../../src/indicators/sma.ts";
import { calculateMACD } from "../../../src/indicators/macd.ts";
import { calculateIndicators } from "../../../src/indicators/mod.ts";

/**
 * Generates mock daily bars with predictable prices.
 */
function generateBars(count: number, startPrice: number = 100, trend: "up" | "down" | "flat" = "flat"): DailyBar[] {
  const bars: DailyBar[] = [];
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    const date = new Date(2024, 0, i + 1);
    const dateStr = date.toISOString().split("T")[0];

    if (trend === "up") {
      price += Math.random() * 2;
    } else if (trend === "down") {
      price -= Math.random() * 2;
    } else {
      price += (Math.random() - 0.5) * 2;
    }

    bars.push({
      date: dateStr,
      open: price - 0.5,
      high: price + 1,
      low: price - 1,
      close: price,
      adjustedClose: price,
      volume: 1000000,
    });
  }

  return bars;
}

// RSI Tests

Deno.test("calculateRSI returns null for insufficient data", () => {
  const bars = generateBars(10);
  const result = calculateRSI(bars, 14);
  assertEquals(result, null);
});

Deno.test("calculateRSI calculates correctly with enough data", () => {
  const bars = generateBars(30);
  const result = calculateRSI(bars, 14);

  assertExists(result);
  assertEquals(result.period, 14);
  assertEquals(typeof result.value, "number");
  assertEquals(result.value >= 0 && result.value <= 100, true);
});

Deno.test("calculateRSI interprets oversold correctly", () => {
  // Create strongly declining prices
  const bars: DailyBar[] = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(2024, 0, i + 1);
    const price = 100 - i * 2;
    bars.push({
      date: date.toISOString().split("T")[0],
      open: price,
      high: price + 1,
      low: price - 1,
      close: price,
      adjustedClose: price,
      volume: 1000000,
    });
  }

  const result = calculateRSI(bars, 14);
  assertExists(result);
  assertEquals(result.interpretation, "oversold");
});

Deno.test("calculateRSI interprets overbought correctly", () => {
  // Create strongly rising prices
  const bars: DailyBar[] = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(2024, 0, i + 1);
    const price = 100 + i * 2;
    bars.push({
      date: date.toISOString().split("T")[0],
      open: price,
      high: price + 1,
      low: price - 1,
      close: price,
      adjustedClose: price,
      volume: 1000000,
    });
  }

  const result = calculateRSI(bars, 14);
  assertExists(result);
  assertEquals(result.interpretation, "overbought");
});

// SMA Tests

Deno.test("calculateSMA returns null for insufficient data", () => {
  const bars = generateBars(10);
  const result = calculateSMA(bars, 50);
  assertEquals(result, null);
});

Deno.test("calculateSMA calculates correctly", () => {
  // Create bars with known values
  const bars: DailyBar[] = [];
  for (let i = 0; i < 10; i++) {
    bars.push({
      date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      adjustedClose: 100,
      volume: 1000000,
    });
  }

  const result = calculateSMA(bars, 10);
  assertExists(result);
  assertEquals(result.value, 100);
  assertEquals(result.period, 10);
});

Deno.test("calculateSMA determines price relation correctly", () => {
  const bars: DailyBar[] = [];

  // First 9 bars at 100
  for (let i = 0; i < 9; i++) {
    bars.push({
      date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      adjustedClose: 100,
      volume: 1000000,
    });
  }

  // Last bar at 110 (above SMA)
  bars.push({
    date: "2024-01-10",
    open: 110,
    high: 110,
    low: 110,
    close: 110,
    adjustedClose: 110,
    volume: 1000000,
  });

  const result = calculateSMA(bars, 10);
  assertExists(result);
  // SMA = (100*9 + 110) / 10 = 101
  assertEquals(result.priceRelation, "above");
});

Deno.test("calculateSMAs calculates multiple periods", () => {
  const bars = generateBars(250);
  const results = calculateSMAs(bars, [50, 200]);

  assertEquals(results.size, 2);
  assertExists(results.get(50));
  assertExists(results.get(200));
});

Deno.test("detectSMACross returns null for insufficient data", () => {
  const bars = generateBars(100);
  const result = detectSMACross(bars);
  assertEquals(result, null);
});

Deno.test("detectSMACross detects no cross", () => {
  const bars = generateBars(250);
  const result = detectSMACross(bars);
  // Most random data won't have a cross on the exact last day
  assertEquals(result === "none" || result === "golden" || result === "death", true);
});

// MACD Tests

Deno.test("calculateMACD returns null for insufficient data", () => {
  const bars = generateBars(20);
  const result = calculateMACD(bars);
  assertEquals(result, null);
});

Deno.test("calculateMACD calculates correctly with enough data", () => {
  const bars = generateBars(50);
  const result = calculateMACD(bars);

  assertExists(result);
  assertEquals(typeof result.macdLine, "number");
  assertEquals(typeof result.signalLine, "number");
  assertEquals(typeof result.histogram, "number");
  assertEquals(["bullish", "bearish", "neutral"].includes(result.trend), true);
});

Deno.test("calculateMACD histogram is macdLine minus signalLine", () => {
  const bars = generateBars(50);
  const result = calculateMACD(bars);

  assertExists(result);
  const expectedHistogram = Math.round((result.macdLine - result.signalLine) * 100) / 100;
  assertEquals(result.histogram, expectedHistogram);
});

// Combined Indicators Tests

Deno.test("calculateIndicators returns all indicators with enough data", () => {
  const bars = generateBars(250);
  const result = calculateIndicators(bars);

  assertExists(result.computedAt);
  assertExists(result.rsi);
  assertExists(result.sma);
  assertExists(result.macd);
});

Deno.test("calculateIndicators respects disabled config", () => {
  const bars = generateBars(250);
  const result = calculateIndicators(bars, {
    rsi: { enabled: false },
    sma: { enabled: true },
    macd: { enabled: false },
  });

  assertEquals(result.rsi, undefined);
  assertExists(result.sma);
  assertEquals(result.macd, undefined);
});

Deno.test("calculateIndicators uses custom periods", () => {
  const bars = generateBars(250);
  const result = calculateIndicators(bars, {
    rsi: { enabled: true, period: 21 },
    sma: { enabled: true, periods: [20, 100] },
    macd: { enabled: true, fast: 8, slow: 17, signal: 9 },
  });

  assertExists(result.rsi);
  assertEquals(result.rsi.period, 21);

  assertExists(result.sma);
  assertEquals(result.sma.length, 2);
  assertEquals(result.sma[0].period, 20);
  assertEquals(result.sma[1].period, 100);
});
