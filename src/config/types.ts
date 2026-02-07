/**
 * @fileoverview Configuration types and interfaces.
 * @module config/types
 */

/**
 * API credentials configuration.
 */
export interface CredentialsConfig {
  alphaVantage?: {
    apiKey?: string;
    keyFile?: string;
  };
  finnhub?: {
    apiKey?: string;
  };
}

/**
 * Data provider configuration.
 */
export interface ProviderConfig {
  default: "alpha_vantage" | "finnhub";
  fallback?: "alpha_vantage" | "finnhub";
}

/**
 * Cache configuration.
 */
export interface CacheConfig {
  enabled: boolean;
  directory?: string;
  ttl: {
    quote: number;
    daily: number;
    news: number;
  };
}

/**
 * Display configuration.
 */
export interface DisplayConfig {
  colorOutput: boolean;
  chartHeight: number;
  chartDays: number;
}

/**
 * Trading parameters configuration.
 */
export interface TradingConfig {
  buyPct: number;
  sellPct: number;
}

/**
 * Technical indicators configuration.
 */
export interface IndicatorsConfig {
  sma?: {
    periods: number[];
  };
  rsi?: {
    period: number;
    overbought: number;
    oversold: number;
  };
  macd?: {
    fast: number;
    slow: number;
    signal: number;
  };
}

/**
 * Portfolio configuration.
 */
export interface PortfolioConfig {
  enabled: boolean;
  file?: string;
}

/**
 * Alert notifier configuration.
 */
export interface NotifiersConfig {
  console?: boolean;
  ntfy?: {
    server: string;
    topic: string;
    priority?: string;
  };
  webhook?: {
    url: string;
    method?: "GET" | "POST";
  };
  desktop?: boolean;
}

/**
 * Alerts configuration.
 */
export interface AlertsConfig {
  enabled: boolean;
  file?: string;
  checkInterval: number;
  defaultCooldown: number;
  notifiers?: NotifiersConfig;
}

/**
 * Watch mode configuration.
 */
export interface WatchConfig {
  interval: number;
  clearScreen: boolean;
  sound: boolean;
}

/**
 * Performance configuration.
 */
export interface PerformanceConfig {
  concurrency: number;
}

/**
 * Complete application configuration.
 */
export interface AppConfig {
  credentials: CredentialsConfig;
  provider: ProviderConfig;
  cache: CacheConfig;
  display: DisplayConfig;
  trading: TradingConfig;
  indicators: IndicatorsConfig;
  portfolio: PortfolioConfig;
  alerts: AlertsConfig;
  watch: WatchConfig;
  performance: PerformanceConfig;
  watchlist: string[];
}

/**
 * Partial configuration (for merging).
 */
export type PartialConfig = {
  [K in keyof AppConfig]?: Partial<AppConfig[K]>;
};

/**
 * CLI arguments that override config.
 */
export interface CLIArgs {
  ticker?: string;
  buyPct?: number;
  sellPct?: number;
  news?: boolean;
  topNews?: boolean;
  chart?: boolean;
  indicators?: boolean;
  rsi?: boolean;
  sma?: string;
  macd?: boolean;
  watch?: boolean;
  interval?: number;
  json?: boolean;
  pretty?: boolean;
  concurrency?: number;
  cacheDir?: string;
  config?: string;
  noConfig?: boolean;
  source?: string;
  help?: boolean;
  version?: boolean;
}
