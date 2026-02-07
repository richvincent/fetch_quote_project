/**
 * @fileoverview Default configuration values.
 * @module config/defaults
 */

import type { AppConfig } from "./types.ts";
import { DEFAULTS } from "../core/constants.ts";

/**
 * Default application configuration.
 */
export const DEFAULT_CONFIG: AppConfig = {
  credentials: {
    alphaVantage: {},
    finnhub: {},
  },

  provider: {
    default: "alpha_vantage",
    fallback: "finnhub",
  },

  cache: {
    enabled: false,
    directory: undefined,
    ttl: {
      quote: DEFAULTS.CACHE_TTL_QUOTE,
      daily: DEFAULTS.CACHE_TTL_DAILY,
      news: DEFAULTS.CACHE_TTL_NEWS,
    },
  },

  display: {
    colorOutput: true,
    chartHeight: DEFAULTS.CHART_HEIGHT,
    chartDays: DEFAULTS.CHART_DAYS,
  },

  trading: {
    buyPct: DEFAULTS.BUY_PCT,
    sellPct: DEFAULTS.SELL_PCT,
  },

  indicators: {
    sma: {
      periods: [...DEFAULTS.SMA_PERIODS],
    },
    rsi: {
      period: DEFAULTS.RSI_PERIOD,
      overbought: DEFAULTS.RSI_OVERBOUGHT,
      oversold: DEFAULTS.RSI_OVERSOLD,
    },
    macd: {
      fast: DEFAULTS.MACD_FAST,
      slow: DEFAULTS.MACD_SLOW,
      signal: DEFAULTS.MACD_SIGNAL,
    },
  },

  portfolio: {
    enabled: false,
    file: "~/.fetch_quote/portfolio.json",
  },

  alerts: {
    enabled: false,
    file: "~/.fetch_quote/alerts.json",
    checkInterval: DEFAULTS.ALERT_CHECK_INTERVAL_SEC,
    defaultCooldown: DEFAULTS.ALERT_COOLDOWN_MINUTES,
    notifiers: {
      console: true,
    },
  },

  watch: {
    interval: DEFAULTS.WATCH_INTERVAL_SEC,
    clearScreen: true,
    sound: false,
  },

  performance: {
    concurrency: DEFAULTS.CONCURRENCY,
  },

  watchlist: [],
};

/**
 * Generates a sample configuration file content.
 */
export function generateSampleConfig(): string {
  return `# fetch_quote configuration file
# Place this file at ~/.fetch_quote.yaml

# API credentials
# You can also use environment variables:
#   ALPHA_VANTAGE_API_KEY, FINNHUB_API_KEY
credentials:
  alphaVantage:
    # apiKey: your-api-key-here
    # Or use a key file:
    # keyFile: ~/.config/fetch_quote/alpha_vantage.key
  finnhub:
    # apiKey: your-finnhub-key

# Data provider settings
provider:
  default: alpha_vantage
  fallback: finnhub

# Cache settings
cache:
  enabled: true
  directory: ~/.cache/fetch_quote
  ttl:
    quote: 60        # seconds
    daily: 21600     # 6 hours
    news: 600        # 10 minutes

# Display settings
display:
  colorOutput: true
  chartHeight: 15
  chartDays: 180

# Trading parameters
trading:
  buyPct: 7
  sellPct: 8

# Technical indicators
indicators:
  sma:
    periods: [50, 200]
  rsi:
    period: 14
    overbought: 70
    oversold: 30
  macd:
    fast: 12
    slow: 26
    signal: 9

# Portfolio settings
portfolio:
  enabled: false
  file: ~/.fetch_quote/portfolio.json

# Alert settings
alerts:
  enabled: false
  file: ~/.fetch_quote/alerts.json
  checkInterval: 300    # 5 minutes
  defaultCooldown: 60   # minutes
  notifiers:
    console: true
    # ntfy:
    #   server: https://ntfy.sh
    #   topic: fetch-quote-alerts
    #   priority: high
    # webhook:
    #   url: https://hooks.slack.com/services/XXX
    # desktop: true

# Watch mode settings
watch:
  interval: 60
  clearScreen: true
  sound: false

# Performance settings
performance:
  concurrency: 2

# Default watchlist
watchlist:
  # - AAPL
  # - MSFT
  # - GOOGL
`;
}
