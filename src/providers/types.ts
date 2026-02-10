/**
 * @fileoverview Data provider interface and types.
 * @module providers/types
 */

import type { DailyBar, NewsItem, Quote } from "../core/types.ts";

/**
 * Features a data provider may support.
 */
export type ProviderFeature =
  | "realtime"
  | "daily"
  | "intraday"
  | "news"
  | "fundamentals"
  | "crypto";

/**
 * Provider configuration for a specific data source.
 */
export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  enabled?: boolean;
  priority?: number;
}

/**
 * Abstract data provider interface.
 * All data sources (Alpha Vantage, Finnhub, etc.) implement this interface.
 */
export interface DataProvider {
  /** Provider identifier (e.g., "alpha_vantage", "finnhub") */
  readonly id: string;

  /** Human-readable provider name */
  readonly name: string;

  /**
   * Fetches real-time quote data for a symbol.
   * @param symbol - Stock ticker symbol
   * @returns Quote data
   */
  fetchQuote(symbol: string): Promise<Quote>;

  /**
   * Fetches daily historical data for a symbol.
   * @param symbol - Stock ticker symbol
   * @param days - Number of days of history (default: 365)
   * @returns Array of daily bars sorted by date descending
   */
  fetchDaily(symbol: string, days?: number): Promise<DailyBar[]>;

  /**
   * Fetches news articles for a symbol.
   * @param symbol - Stock ticker symbol
   * @param limit - Maximum number of articles
   * @returns Array of news items
   */
  fetchNews?(symbol: string, limit?: number): Promise<NewsItem[]>;

  /**
   * Fetches general market news headlines.
   * @param limit - Maximum number of articles
   * @returns Array of news items
   */
  fetchTopNews?(limit?: number): Promise<NewsItem[]>;

  /**
   * Checks if the provider supports a specific feature.
   * @param feature - Feature to check
   * @returns True if feature is supported
   */
  supports(feature: ProviderFeature): boolean;

  /**
   * Checks if the provider is available (has valid credentials, etc.).
   * @returns True if provider can be used
   */
  isAvailable(): boolean;
}

/**
 * Alpha Vantage API response types.
 */
export interface AVGlobalQuote {
  ["01. symbol"]?: string;
  ["05. price"]?: string;
  ["06. volume"]?: string;
  ["07. latest trading day"]?: string;
  ["08. previous close"]?: string;
  ["09. change"]?: string;
  ["10. change percent"]?: string;
}

export interface AVGlobalQuoteResp {
  "Global Quote"?: AVGlobalQuote;
  Note?: string;
  Information?: string;
  "Error Message"?: string;
}

export interface AVDailyRow {
  ["1. open"]: string;
  ["2. high"]: string;
  ["3. low"]: string;
  ["4. close"]: string;
  ["5. adjusted close"]: string;
  ["6. volume"]: string;
  ["8. split coefficient"]?: string;
}

export interface AVDailyResp {
  ["Time Series (Daily)"]?: Record<string, AVDailyRow>;
  Note?: string;
  Information?: string;
  "Error Message"?: string;
}

export interface AVNewsItem {
  title?: string;
  url?: string;
  time_published?: string;
  tickers?: string[];
  overall_sentiment_score?: number;
}

export interface AVNewsResp {
  feed?: AVNewsItem[];
  Note?: string;
  Information?: string;
  "Error Message"?: string;
}

/**
 * Finnhub API response types.
 */
export interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

export interface FinnhubCandle {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  s: string; // Status
  t: number[]; // Timestamps
  v: number[]; // Volume
}

export interface FinnhubNews {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}
