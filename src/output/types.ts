/**
 * @fileoverview Output formatter interface and types.
 * @module output/types
 */

import type {
  Quote,
  DailyBar,
  NewsItem,
  Metrics,
  Signal,
  TradingZones,
  IndicatorOutput,
  PortfolioSummary,
  Alert,
} from "../core/types.ts";

/**
 * Output format modes.
 */
export type OutputMode = "console" | "json" | "csv";

/**
 * Output options for formatting.
 */
export interface OutputOptions {
  mode: OutputMode;
  pretty?: boolean;
  color?: boolean;
  showNews?: boolean;
  showChart?: boolean;
  showIndicators?: boolean;
}

/**
 * Complete ticker analysis result for output.
 */
export interface TickerResult {
  symbol: string;
  timestamp: string;
  quote: Quote;
  metrics: Metrics;
  zones: TradingZones;
  signal: Signal;
  volumeVsAvg: number;
  indicators?: IndicatorOutput;
  news?: NewsItem[];
  priceHistory?: Array<{ date: string; price: number }>;
  error?: string;
}

/**
 * Batch output for multiple tickers.
 */
export interface BatchResult {
  generatedAt: string;
  tickers: TickerResult[];
  errors: Array<{ symbol: string; error: string }>;
}

/**
 * Abstract output formatter interface.
 */
export interface OutputFormatter {
  /**
   * Outputs a single ticker result.
   */
  formatTicker(result: TickerResult): void;

  /**
   * Outputs batch results for multiple tickers.
   */
  formatBatch(results: BatchResult): void;

  /**
   * Outputs news headlines.
   */
  formatNews(news: NewsItem[], title?: string): void;

  /**
   * Outputs portfolio summary.
   */
  formatPortfolio(summary: PortfolioSummary): void;

  /**
   * Outputs an alert event.
   */
  formatAlert(alert: Alert, message: string): void;

  /**
   * Outputs an error message.
   */
  formatError(symbol: string, error: Error): void;

  /**
   * Called before processing starts.
   */
  begin(): void;

  /**
   * Called after all processing is complete.
   */
  end(): void;
}
