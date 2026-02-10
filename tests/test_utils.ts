/**
 * @fileoverview Shared test utilities and helpers.
 */

import type { DailyBar, Quote } from "../src/core/types.ts";

/**
 * Creates a mock quote for testing.
 */
export function createMockQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    symbol: "AAPL",
    price: 185.5,
    change: 2.25,
    changePercent: 0.0123,
    volume: 58234567,
    previousClose: 183.25,
    latestTradingDay: "2026-02-07",
    timestamp: new Date("2026-02-07T16:00:00Z"),
    source: "mock",
    ...overrides,
  };
}

/**
 * Creates mock daily bars for testing.
 */
export function createMockDailyBars(count = 5): DailyBar[] {
  const bars: DailyBar[] = [];
  const baseDate = new Date("2026-02-07");
  let price = 185.5;

  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    bars.push({
      date: dateStr,
      open: price - 2,
      high: price + 1,
      low: price - 3,
      close: price,
      adjustedClose: price,
      volume: 50000000 + Math.floor(Math.random() * 10000000),
    });

    price -= 2; // Price decreases going back in time
  }

  return bars;
}

/**
 * Creates a mock fetch function for testing HTTP calls.
 */
export function createMockFetch(
  responses: Map<string, { status: number; body: unknown }>,
): typeof fetch {
  return (input: string | URL | Request): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();

    // Find matching response by URL prefix
    for (const [pattern, response] of responses) {
      if (url.includes(pattern)) {
        return Promise.resolve(new Response(JSON.stringify(response.body), {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }));
      }
    }

    return Promise.resolve(new Response("Not Found", { status: 404 }));
  };
}

/**
 * Loads a fixture file.
 */
export async function loadFixture<T>(path: string): Promise<T> {
  const text = await Deno.readTextFile(path);
  return JSON.parse(text) as T;
}

/**
 * Asserts that a value is approximately equal to expected.
 */
export function assertApprox(
  actual: number,
  expected: number,
  tolerance = 0.001,
  msg?: string,
): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      msg || `Expected ${expected} ± ${tolerance}, got ${actual}`,
    );
  }
}
