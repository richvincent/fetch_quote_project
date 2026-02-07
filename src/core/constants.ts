/**
 * @fileoverview Default configuration constants for fetch_quote.
 * @module core/constants
 */

/**
 * Application-wide default configuration values.
 * These can be overridden by config file, environment variables, or CLI flags.
 */
export const DEFAULTS = {
  // Trading thresholds
  BUY_PCT: 7,
  SELL_PCT: 8,

  // Performance settings
  CONCURRENCY: 2,

  // Cache TTL values (in seconds)
  CACHE_TTL_QUOTE: 60,
  CACHE_TTL_DAILY: 6 * 3600, // 6 hours
  CACHE_TTL_NEWS: 600, // 10 minutes

  // News settings
  NEWS_DAYS_BACK: 60,
  TOP_NEWS_DAYS_BACK: 3,
  NEWS_ITEM_LIMIT: 6,
  TOP_NEWS_LIMIT: 10,

  // Analysis windows
  TRADING_DAYS_WINDOW: 270, // ~252 trading days/year, padded for safety
  VOLUME_AVG_DAYS: 30,

  // Watch mode
  WATCH_INTERVAL_SEC: 60,
  WATCH_MIN_INTERVAL_SEC: 15,

  // Chart settings
  CHART_DAYS: 180,
  CHART_HEIGHT: 15,

  // Technical indicators
  RSI_PERIOD: 14,
  RSI_OVERBOUGHT: 70,
  RSI_OVERSOLD: 30,
  SMA_PERIODS: [50, 200],
  MACD_FAST: 12,
  MACD_SLOW: 26,
  MACD_SIGNAL: 9,

  // Alert cooldown
  ALERT_COOLDOWN_MINUTES: 60,
  ALERT_CHECK_INTERVAL_SEC: 300,
} as const;

/**
 * Milliseconds per day constant.
 */
export const MS_PER_DAY = 86400_000;

/**
 * API base URLs.
 */
export const API_URLS = {
  ALPHA_VANTAGE: "https://www.alphavantage.co/query",
  FINNHUB: "https://finnhub.io/api/v1",
  NTFY: "https://ntfy.sh",
} as const;

/**
 * Default retry/backoff configuration.
 */
export const BACKOFF_DEFAULTS = {
  maxRetries: 6,
  baseDelayMs: 800,
  factor: 2,
  maxDelayMs: 30_000,
  jitterMs: 400,
} as const;

/**
 * Configuration file paths (in priority order).
 */
export const CONFIG_PATHS = [
  "~/.fetch_quote.yaml",
  "~/.config/fetch_quote/config.yaml",
] as const;

/**
 * Data storage paths.
 */
export const DATA_PATHS = {
  PORTFOLIO: "~/.fetch_quote/portfolio.json",
  ALERTS: "~/.fetch_quote/alerts.json",
  CACHE: "~/.cache/fetch_quote",
} as const;

/**
 * Application version.
 */
export const VERSION = "0.3.0";
