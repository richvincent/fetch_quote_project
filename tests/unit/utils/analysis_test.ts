/**
 * @fileoverview Unit tests for analysis utilities.
 */

import { assertAlmostEquals, assertEquals } from "@std/assert";
import {
  calculateZones,
  computeMetrics,
  determineSignal,
  extractPriceHistory,
  volumeComparison,
} from "../../../src/utils/analysis.ts";
import { createMockDailyBars } from "../../test_utils.ts";

Deno.test("computeMetrics calculates 52-week high", () => {
  const bars = createMockDailyBars(10);
  const metrics = computeMetrics(bars);

  // The highest bar should be the first one (most recent)
  assertEquals(metrics.high52Week, bars[0].high);
});

Deno.test("computeMetrics calculates 30-day average volume", () => {
  const bars = createMockDailyBars(5);
  const metrics = computeMetrics(bars);

  const expectedAvg = bars.slice(0, 5).reduce((sum, b) => sum + b.volume, 0) /
    5;

  // Allow some tolerance due to random volume generation
  assertAlmostEquals(metrics.avgVolume30Day, expectedAvg, 1);
});

Deno.test("computeMetrics handles empty array", () => {
  const metrics = computeMetrics([]);

  assertEquals(Number.isNaN(metrics.high52Week), true);
  assertEquals(Number.isNaN(metrics.avgVolume30Day), true);
});

Deno.test("calculateZones computes correct boundaries", () => {
  const zones = calculateZones(100, 7, 8);

  assertEquals(zones.buyZoneHigh, 100);
  assertEquals(zones.buyZoneLow, 93);
  assertEquals(zones.sellThreshold, 92);
});

Deno.test("calculateZones uses defaults", () => {
  const zones = calculateZones(200);

  assertEquals(zones.buyZoneHigh, 200);
  assertEquals(zones.buyZoneLow, 186); // 200 * 0.93
  assertEquals(zones.sellThreshold, 184); // 200 * 0.92
});

Deno.test("determineSignal returns BUY in buy zone", () => {
  // Price at 95, high at 100, buy zone is 93-100
  assertEquals(determineSignal(95, 100, 7, 8), "BUY");
  assertEquals(determineSignal(100, 100, 7, 8), "BUY");
  assertEquals(determineSignal(93, 100, 7, 8), "BUY");
});

Deno.test("determineSignal returns SELL below threshold", () => {
  // Price at 90, high at 100, sell threshold is 92
  assertEquals(determineSignal(90, 100, 7, 8), "SELL");
  assertEquals(determineSignal(92, 100, 7, 8), "SELL");
});

Deno.test("determineSignal returns HOLD in neutral zone", () => {
  // Price at 92.5, high at 100 (between sell 92 and buy 93)
  assertEquals(determineSignal(92.5, 100, 7, 8), "HOLD");
});

Deno.test("determineSignal returns null for invalid input", () => {
  assertEquals(determineSignal(NaN, 100), null);
  assertEquals(determineSignal(95, NaN), null);
  assertEquals(determineSignal(95, 0), null);
  assertEquals(determineSignal(95, -100), null);
});

Deno.test("volumeComparison calculates percentage difference", () => {
  assertAlmostEquals(volumeComparison(110, 100), 0.1, 0.001);
  assertAlmostEquals(volumeComparison(90, 100), -0.1, 0.001);
  assertAlmostEquals(volumeComparison(100, 100), 0, 0.001);
});

Deno.test("volumeComparison handles edge cases", () => {
  assertEquals(Number.isNaN(volumeComparison(100, 0)), true);
  assertEquals(Number.isNaN(volumeComparison(NaN, 100)), true);
});

Deno.test("extractPriceHistory extracts in chronological order", () => {
  const bars = createMockDailyBars(5);
  const history = extractPriceHistory(bars, 5);

  // First item should be oldest (last in bars array)
  assertEquals(history[0].date, bars[4].date);
  // Last item should be newest (first in bars array)
  assertEquals(history[4].date, bars[0].date);
});

Deno.test("extractPriceHistory uses adjustedClose", () => {
  const bars = createMockDailyBars(3);
  const history = extractPriceHistory(bars, 3);

  assertEquals(history[2].price, bars[0].adjustedClose);
});

Deno.test("extractPriceHistory limits days", () => {
  const bars = createMockDailyBars(10);
  const history = extractPriceHistory(bars, 5);

  assertEquals(history.length, 5);
});
