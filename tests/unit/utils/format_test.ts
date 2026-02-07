/**
 * @fileoverview Unit tests for format utilities.
 */

import { assertEquals, assertStrictEquals } from "@std/assert";
import {
  fmtMoney,
  fmtInt,
  fmtPercent,
  parseChangePercent,
  validateTicker,
  parseTickers,
  parseAVTimestamp,
  stripAnsi,
} from "../../../src/utils/format.ts";

Deno.test("fmtMoney formats positive numbers", () => {
  assertEquals(fmtMoney(185.5), "$185.50");
  assertEquals(fmtMoney(1000), "$1000.00");
  assertEquals(fmtMoney(0.5), "$0.50");
});

Deno.test("fmtMoney handles edge cases", () => {
  assertEquals(fmtMoney(0), "$0.00");
  assertEquals(fmtMoney(-50.25), "$-50.25");
  assertEquals(fmtMoney(NaN), "—");
  assertEquals(fmtMoney(Infinity), "—");
});

Deno.test("fmtInt formats with thousands separators", () => {
  assertEquals(fmtInt(1234567), "1,234,567");
  assertEquals(fmtInt(100), "100");
  assertEquals(fmtInt(0), "0");
});

Deno.test("fmtInt handles edge cases", () => {
  assertEquals(fmtInt(NaN), "—");
  assertEquals(fmtInt(Infinity), "—");
});

Deno.test("fmtPercent formats percentages", () => {
  assertEquals(fmtPercent(0.0123), "+1.23%");
  assertEquals(fmtPercent(-0.05), "-5.00%");
  assertEquals(fmtPercent(0), "+0.00%");
});

Deno.test("parseChangePercent parses valid percentages", () => {
  assertEquals(parseChangePercent("1.25%"), 0.0125);
  assertEquals(parseChangePercent("-3.5%"), -0.035);
  assertEquals(parseChangePercent("0%"), 0);
});

Deno.test("parseChangePercent returns NaN for invalid input", () => {
  assertEquals(Number.isNaN(parseChangePercent("")), true);
  assertEquals(Number.isNaN(parseChangePercent("abc")), true);
  assertEquals(Number.isNaN(parseChangePercent(undefined)), true);
});

Deno.test("validateTicker accepts valid tickers", () => {
  assertStrictEquals(validateTicker("AAPL"), true);
  assertStrictEquals(validateTicker("MSFT"), true);
  assertStrictEquals(validateTicker("BRK.B"), true);
  assertStrictEquals(validateTicker("BRK-A"), true);
  assertStrictEquals(validateTicker("TSX:RY"), true);
  assertStrictEquals(validateTicker("NYSE:BRK-A"), true);
});

Deno.test("validateTicker rejects invalid tickers", () => {
  assertStrictEquals(validateTicker(""), false);
  assertStrictEquals(validateTicker("123"), false);
  assertStrictEquals(validateTicker("---"), false);
  assertStrictEquals(validateTicker("a]pl"), false);
  assertStrictEquals(validateTicker("aapl"), false); // lowercase
});

Deno.test("parseTickers splits and validates", () => {
  assertEquals(parseTickers("AAPL,MSFT,GOOGL"), ["AAPL", "MSFT", "GOOGL"]);
  assertEquals(parseTickers("aapl, msft"), ["AAPL", "MSFT"]);
  assertEquals(parseTickers("AAPL,invalid!,MSFT"), ["AAPL", "MSFT"]);
});

Deno.test("parseAVTimestamp parses Alpha Vantage format", () => {
  const result = parseAVTimestamp("20230914T210000");
  assertEquals(result?.toISOString(), "2023-09-14T21:00:00.000Z");
});

Deno.test("parseAVTimestamp returns null for invalid input", () => {
  assertEquals(parseAVTimestamp(""), null);
  assertEquals(parseAVTimestamp("invalid"), null);
  assertEquals(parseAVTimestamp(undefined), null);
});

Deno.test("stripAnsi removes ANSI escape codes", () => {
  assertEquals(stripAnsi("\x1b[32mgreen\x1b[0m"), "green");
  assertEquals(stripAnsi("no codes"), "no codes");
  assertEquals(stripAnsi("\x1b[1;31mbold red\x1b[0m"), "bold red");
});
