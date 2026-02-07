/**
 * @fileoverview Formatting and validation utility functions.
 * @module utils/format
 */

/**
 * Formats a number as USD currency.
 * @param n - Number to format
 * @returns Formatted string like "$123.45" or "—" for invalid numbers
 */
export function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}`;
}

/**
 * Formats a number as an integer with thousands separators.
 * @param n - Number to format
 * @returns Formatted string like "1,234,567" or "—" for invalid numbers
 */
export function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

/**
 * Formats a number as a percentage.
 * @param n - Number to format (0.05 = 5%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string like "+5.00%" or "-3.50%"
 */
export function fmtPercent(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return "—";
  const pct = n * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(decimals)}%`;
}

/**
 * Parses a percentage string like "1.25%" into a decimal.
 * @param s - String to parse
 * @returns Decimal value (0.0125 for "1.25%") or NaN if invalid
 */
export function parseChangePercent(s?: string): number {
  if (!s) return NaN;
  const m = s.trim().match(/^(-?\d+(?:\.\d+)?)%$/);
  if (!m) return NaN;
  return Number(m[1]) / 100;
}

/**
 * Validates a stock ticker symbol.
 * Accepts formats: AAPL, BRK.B, BRK-A, TSX:RY, NYSE:BRK-A
 * @param s - String to validate
 * @returns True if valid ticker format
 */
export function validateTicker(s: string): boolean {
  // Must start with letter, allow letters, digits, dots, dashes
  // Optional exchange prefix like "TSX:" or "NYSE:"
  return /^[A-Z][A-Z0-9]*(?:[.\-][A-Z0-9]+)*(?::[A-Z][A-Z0-9]*(?:[.\-][A-Z0-9]+)*)?$/.test(s);
}

/**
 * Normalizes a ticker symbol to uppercase.
 * @param s - Ticker string
 * @returns Uppercase ticker
 */
export function normalizeTicker(s: string): string {
  return s.trim().toUpperCase();
}

/**
 * Parses a comma-separated list of tickers.
 * @param s - Comma-separated ticker list
 * @returns Array of valid, normalized tickers
 */
export function parseTickers(s: string): string[] {
  return s
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(validateTicker);
}

/**
 * Formats a date as ISO string without milliseconds.
 * @param d - Date to format
 * @returns ISO string like "2025-01-08T12:34:56Z"
 */
export function fmtDate(d: Date): string {
  return d.toISOString().replace(".000", "");
}

/**
 * Parses Alpha Vantage timestamp format to Date.
 * AV format: "20230914T210000"
 * @param s - AV timestamp string
 * @returns Parsed Date or null if invalid
 */
export function parseAVTimestamp(s?: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, Y, M, D, h, min, sec] = m;
  return new Date(`${Y}-${M}-${D}T${h}:${min}:${sec}Z`);
}

/**
 * Expands a path with ~ to full home directory path.
 * @param path - Path potentially containing ~
 * @returns Expanded path
 */
export function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    const home = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "";
    return home + path.slice(1);
  }
  return path;
}

/**
 * Truncates a string to a maximum length with ellipsis.
 * @param s - String to truncate
 * @param maxLen - Maximum length
 * @returns Truncated string
 */
export function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "…";
}

/**
 * Pads a string to a fixed width.
 * @param s - String to pad
 * @param width - Target width
 * @param align - Alignment ("left" | "right")
 * @returns Padded string
 */
export function pad(s: string, width: number, align: "left" | "right" = "left"): string {
  if (s.length >= width) return s;
  const padding = " ".repeat(width - s.length);
  return align === "left" ? s + padding : padding + s;
}

/**
 * Strips ANSI escape codes from a string.
 * @param s - String with potential ANSI codes
 * @returns Clean string
 */
export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}
