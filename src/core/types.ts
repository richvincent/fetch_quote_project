/**
 * @fileoverview Core domain types for fetch_quote.
 * These types represent the normalized data model used across all providers.
 * @module core/types
 */

// ============================================================================
// Quote Types
// ============================================================================

/**
 * Real-time quote data for a stock symbol.
 */
export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  previousClose: number;
  latestTradingDay: string;
  timestamp: Date;
  source: string;
}

/**
 * Daily OHLCV bar data with split adjustments.
 */
export interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number;
  volume: number;
  splitCoefficient?: number;
}

/**
 * News article with sentiment data.
 */
export interface NewsItem {
  title: string;
  url: string;
  publishedAt: Date;
  source: string;
  tickers: string[];
  sentiment?: number;
}

// ============================================================================
// Analysis Types
// ============================================================================

/**
 * Computed metrics from daily historical data.
 */
export interface Metrics {
  high52Week: number;
  avgVolume30Day: number;
}

/**
 * Trading signal based on price position relative to 52-week high.
 */
export type Signal = "BUY" | "SELL" | "HOLD" | null;

/**
 * Buy/sell zone boundaries.
 */
export interface TradingZones {
  buyZoneLow: number;
  buyZoneHigh: number;
  sellThreshold: number;
}

// ============================================================================
// Indicator Types
// ============================================================================

/**
 * RSI (Relative Strength Index) calculation result.
 */
export interface RSIResult {
  period: number;
  value: number;
  interpretation: "oversold" | "neutral" | "overbought";
}

/**
 * SMA (Simple Moving Average) calculation result.
 */
export interface SMAResult {
  period: number;
  value: number;
  priceRelation: "above" | "below" | "at";
  crossover?: "golden" | "death" | null;
}

/**
 * MACD calculation result.
 */
export interface MACDResult {
  macdLine: number;
  signalLine: number;
  histogram: number;
  trend: "bullish" | "bearish" | "neutral";
}

/**
 * Combined indicator output.
 */
export interface IndicatorOutput {
  rsi?: RSIResult;
  sma?: SMAResult[];
  macd?: MACDResult;
  computedAt: string;
}

// ============================================================================
// Output Types
// ============================================================================

/**
 * Complete quote output including all analysis data.
 */
export interface QuoteOutput {
  symbol: string;
  timestamp: string;
  quote: {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    previousClose: number;
    latestTradingDay: string;
  };
  analysis: {
    high52Week: number;
    avgVolume30Day: number;
    volumeVsAvg: number;
    buyZone: { low: number; high: number };
    sellThreshold: number;
    signal: Signal;
  };
  indicators?: IndicatorOutput;
  news?: NewsItem[];
  chart?: { date: string; price: number }[];
  error?: string;
}

/**
 * Batch output for multiple tickers.
 */
export interface BatchOutput {
  generatedAt: string;
  tickers: QuoteOutput[];
  errors: { symbol: string; error: string }[];
}

// ============================================================================
// Portfolio Types
// ============================================================================

/**
 * A single stock position in a portfolio.
 */
export interface Position {
  symbol: string;
  shares: number;
  costBasis: number;
  avgCostPerShare: number;
  addedAt: string;
  lastUpdated: string;
}

/**
 * A portfolio transaction record.
 */
export interface PortfolioTransaction {
  id: string;
  symbol: string;
  type: "buy" | "sell";
  shares: number;
  pricePerShare: number;
  date: string;
  notes?: string;
}

/**
 * Complete portfolio with positions and transaction history.
 */
export interface Portfolio {
  version: string;
  positions: Position[];
  transactions: PortfolioTransaction[];
  createdAt: string;
  lastUpdated: string;
}

/**
 * Position with live quote data and P&L.
 */
export interface PositionWithQuote extends Position {
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

/**
 * Complete portfolio summary with live data.
 */
export interface PortfolioSummary {
  positions: PositionWithQuote[];
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

// ============================================================================
// Alert Types
// ============================================================================

/**
 * Alert condition types.
 */
export type AlertCondition =
  | { type: "price_above"; value: number }
  | { type: "price_below"; value: number }
  | { type: "change_percent"; value: number; period: "day" | "week" }
  | { type: "rsi_above"; value: number; period: number }
  | { type: "rsi_below"; value: number; period: number }
  | { type: "volume_spike"; multiplier: number };

/**
 * Notifier configuration for alerts.
 */
export type NotifierConfig =
  | { type: "console" }
  | { type: "ntfy"; server: string; topic: string; priority?: string }
  | { type: "webhook"; url: string; method?: "GET" | "POST" }
  | { type: "desktop" };

/**
 * An alert rule definition.
 */
export interface Alert {
  id: string;
  symbol: string;
  condition: AlertCondition;
  notifiers: NotifierConfig[];
  createdAt: string;
  lastTriggered?: string;
  enabled: boolean;
  cooldownMinutes: number;
}

/**
 * Alert trigger event.
 */
export interface AlertEvent {
  alert: Alert;
  triggeredAt: string;
  currentValue: number;
  message: string;
}
