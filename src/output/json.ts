/**
 * @fileoverview JSON output formatter for machine-readable output.
 * @module output/json
 */

import type { Alert, NewsItem, PortfolioSummary } from "../core/types.ts";
import type { BatchResult, OutputFormatter, TickerResult } from "./types.ts";

/**
 * JSON output formatter.
 * Outputs structured JSON to stdout for scripting and automation.
 */
export class JsonOutputFormatter implements OutputFormatter {
  private readonly pretty: boolean;
  private results: TickerResult[] = [];
  private errors: Array<{ symbol: string; error: string }> = [];
  private isBatchMode = false;

  constructor(options: { pretty?: boolean } = {}) {
    this.pretty = options.pretty ?? false;
  }

  /**
   * Converts a TickerResult to a clean JSON structure.
   */
  private toJsonOutput(result: TickerResult): Record<string, unknown> {
    const output: Record<string, unknown> = {
      symbol: result.symbol,
      timestamp: result.timestamp,
      quote: {
        price: result.quote.price,
        change: result.quote.change,
        changePercent: result.quote.changePercent,
        volume: result.quote.volume,
        previousClose: result.quote.previousClose,
        latestTradingDay: result.quote.latestTradingDay,
      },
      analysis: {
        high52Week: result.metrics.high52Week,
        avgVolume30Day: result.metrics.avgVolume30Day,
        volumeVsAvg: result.volumeVsAvg,
        buyZone: {
          low: result.zones.buyZoneLow,
          high: result.zones.buyZoneHigh,
        },
        sellThreshold: result.zones.sellThreshold,
        signal: result.signal,
      },
    };

    if (result.indicators) {
      output.indicators = result.indicators;
    }

    if (result.news && result.news.length > 0) {
      output.news = result.news.map((n) => ({
        title: n.title,
        url: n.url,
        publishedAt: n.publishedAt.toISOString(),
        source: n.source,
      }));
    }

    if (result.priceHistory && result.priceHistory.length > 0) {
      output.chart = result.priceHistory;
    }

    if (result.error) {
      output.error = result.error;
    }

    return output;
  }

  /**
   * Outputs JSON to stdout.
   */
  private output(data: unknown): void {
    const json = this.pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
    console.log(json);
  }

  formatTicker(result: TickerResult): void {
    if (this.isBatchMode) {
      this.results.push(result);
    } else {
      this.output(this.toJsonOutput(result));
    }
  }

  formatBatch(results: BatchResult): void {
    const output = {
      generatedAt: results.generatedAt,
      tickers: results.tickers.map((r) => this.toJsonOutput(r)),
      errors: results.errors,
    };
    this.output(output);
  }

  formatNews(news: NewsItem[], title?: string): void {
    const output = {
      title: title || "News",
      generatedAt: new Date().toISOString(),
      articles: news.map((n) => ({
        title: n.title,
        url: n.url,
        publishedAt: n.publishedAt.toISOString(),
        source: n.source,
        tickers: n.tickers,
      })),
    };
    this.output(output);
  }

  formatPortfolio(summary: PortfolioSummary): void {
    const output = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalValue: summary.totalValue,
        totalCost: summary.totalCost,
        totalGainLoss: summary.totalGainLoss,
        totalGainLossPercent: summary.totalGainLossPercent,
        dayChange: summary.dayChange,
        dayChangePercent: summary.dayChangePercent,
      },
      positions: summary.positions.map((p) => ({
        symbol: p.symbol,
        shares: p.shares,
        avgCostPerShare: p.avgCostPerShare,
        costBasis: p.costBasis,
        currentPrice: p.currentPrice,
        currentValue: p.currentValue,
        gainLoss: p.gainLoss,
        gainLossPercent: p.gainLossPercent,
        dayChange: p.dayChange,
        dayChangePercent: p.dayChangePercent,
      })),
    };
    this.output(output);
  }

  formatAlert(alert: Alert, message: string): void {
    const output = {
      type: "alert",
      triggeredAt: new Date().toISOString(),
      alert: {
        id: alert.id,
        symbol: alert.symbol,
        condition: alert.condition,
      },
      message,
    };
    this.output(output);
  }

  formatError(symbol: string, error: Error): void {
    if (this.isBatchMode) {
      this.errors.push({ symbol, error: error.message });
    } else {
      this.output({
        symbol,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  begin(): void {
    this.results = [];
    this.errors = [];
    this.isBatchMode = false;
  }

  end(): void {
    // If we accumulated results in batch mode, output them now
    if (
      this.isBatchMode && (this.results.length > 0 || this.errors.length > 0)
    ) {
      this.formatBatch({
        generatedAt: new Date().toISOString(),
        tickers: this.results,
        errors: this.errors,
      });
    }
  }

  /**
   * Enables batch mode for collecting multiple ticker results.
   */
  setBatchMode(enabled: boolean): void {
    this.isBatchMode = enabled;
  }
}

/**
 * JSONL (newline-delimited JSON) formatter for streaming output.
 * Useful for watch mode and piping to other tools.
 */
export class JsonLinesOutputFormatter extends JsonOutputFormatter {
  override formatTicker(result: TickerResult): void {
    // Always output immediately in JSONL mode
    const output = {
      type: "ticker",
      timestamp: new Date().toISOString(),
      data: this["toJsonOutput"](result),
    };
    console.log(JSON.stringify(output));
  }

  override formatNews(news: NewsItem[], _title?: string): void {
    for (const item of news) {
      const output = {
        type: "news",
        timestamp: new Date().toISOString(),
        data: {
          title: item.title,
          url: item.url,
          publishedAt: item.publishedAt.toISOString(),
          source: item.source,
        },
      };
      console.log(JSON.stringify(output));
    }
  }

  override formatError(symbol: string, error: Error): void {
    const output = {
      type: "error",
      timestamp: new Date().toISOString(),
      symbol,
      error: error.message,
    };
    console.log(JSON.stringify(output));
  }

  override begin(): void {
    // No-op for streaming
  }

  override end(): void {
    // No-op for streaming
  }
}
