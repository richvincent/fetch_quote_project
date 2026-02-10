/**
 * @fileoverview Console output formatter with colors.
 * @module output/console
 */

import * as colors from "@std/fmt/colors";
import type { Alert, NewsItem, PortfolioSummary } from "../core/types.ts";
import { fmtInt, fmtMoney, fmtPercent } from "../utils/format.ts";
import type { BatchResult, OutputFormatter, TickerResult } from "./types.ts";

/**
 * Console output formatter with color support.
 */
export class ConsoleOutputFormatter implements OutputFormatter {
  private readonly useColor: boolean;

  constructor(options: { color?: boolean } = {}) {
    this.useColor = options.color ?? true;
  }

  /**
   * Applies color based on positive/negative value.
   */
  private colorValue(text: string, value: number): string {
    if (!this.useColor) return text;
    if (value > 0) return colors.green(text);
    if (value < 0) return colors.red(text);
    return text;
  }

  formatTicker(result: TickerResult): void {
    const { quote, metrics, zones, signal, volumeVsAvg } = result;

    // Header
    console.log(colors.bold(`\n=== ${result.symbol} ===`));

    // Price line
    const priceStr = fmtMoney(quote.price);
    const changeStr = `${quote.change >= 0 ? "+" : ""}${
      fmtMoney(quote.change)
    }`;
    const pctStr = fmtPercent(quote.changePercent);
    const priceDisplay = `${priceStr} ${changeStr} (${pctStr})`;
    const coloredPrice = this.colorValue(priceDisplay, quote.change);
    const dateStr = quote.latestTradingDay
      ? colors.gray(` on ${quote.latestTradingDay}`)
      : "";
    console.log(`Price: ${coloredPrice}${dateStr}`);

    // 52-week high and zones
    console.log(`52w High (adj): ${fmtMoney(metrics.high52Week)}`);
    console.log(
      `Buy Zone: ${fmtMoney(zones.buyZoneLow)} .. ${
        fmtMoney(zones.buyZoneHigh)
      } (${((1 - zones.buyZoneLow / metrics.high52Week) * 100).toFixed(1)}%)`,
    );
    console.log(
      `Sell if < ${fmtMoney(zones.sellThreshold)} (${
        ((1 - zones.sellThreshold / metrics.high52Week) * 100).toFixed(1)
      }%)`,
    );

    // Signal
    if (signal === "BUY") {
      console.log(colors.bold(colors.green("BUY")));
    } else if (signal === "SELL") {
      console.log(colors.bold(colors.red("SELL")));
    }

    // Volume
    const volDiffStr = fmtPercent(volumeVsAvg);
    const coloredVolDiff = this.colorValue(volDiffStr, volumeVsAvg);
    console.log(
      `Vol: ${fmtInt(quote.volume)} vs 30d avg ${
        fmtInt(metrics.avgVolume30Day)
      } (${coloredVolDiff})`,
    );

    // Indicators
    if (result.indicators) {
      console.log(colors.bold("\nTechnical Indicators:"));
      if (result.indicators.rsi) {
        const rsi = result.indicators.rsi;
        const rsiColor = rsi.interpretation === "overbought"
          ? colors.red
          : rsi.interpretation === "oversold"
          ? colors.green
          : colors.gray;
        console.log(
          `  RSI(${rsi.period}): ${
            rsiColor(rsi.value.toFixed(1))
          } (${rsi.interpretation})`,
        );
      }
      if (result.indicators.sma) {
        for (const sma of result.indicators.sma) {
          const relation = sma.priceRelation === "above"
            ? colors.green("above")
            : colors.red("below");
          console.log(
            `  SMA(${sma.period}): ${fmtMoney(sma.value)} (price ${relation})`,
          );
        }
      }
      if (result.indicators.macd) {
        const macd = result.indicators.macd;
        const trendColor = macd.trend === "bullish"
          ? colors.green
          : macd.trend === "bearish"
          ? colors.red
          : colors.gray;
        console.log(
          `  MACD: ${macd.macdLine.toFixed(2)} / ${
            macd.signalLine.toFixed(2)
          } / ${macd.histogram >= 0 ? "+" : ""}${macd.histogram.toFixed(2)} (${
            trendColor(macd.trend)
          })`,
        );
      }
    }

    // News
    if (result.news && result.news.length > 0) {
      console.log(colors.bold("\nNews:"));
      this.formatNews(result.news);
    }
  }

  formatBatch(results: BatchResult): void {
    for (const result of results.tickers) {
      this.formatTicker(result);
    }

    if (results.errors.length > 0) {
      console.log(colors.bold("\nErrors:"));
      for (const err of results.errors) {
        console.log(colors.red(`  ${err.symbol}: ${err.error}`));
      }
    }
  }

  formatNews(news: NewsItem[], title?: string): void {
    if (title) {
      console.log(colors.bold(title));
    }

    if (news.length === 0) {
      console.log(colors.gray("No recent headlines."));
      return;
    }

    for (const item of news) {
      const when = item.publishedAt.toISOString().replace(".000", "");
      console.log(
        `- ${item.title} ${colors.gray(when)} ${colors.gray(item.url)}`,
      );
    }
  }

  formatPortfolio(summary: PortfolioSummary): void {
    console.log(
      colors.bold(`\nPortfolio Summary (as of ${new Date().toISOString()})`),
    );
    console.log("━".repeat(65));

    // Header
    console.log(
      colors.gray(
        "Symbol   Shares   Avg Cost    Current    Value        Gain/Loss",
      ),
    );
    console.log("─".repeat(65));

    // Positions
    for (const pos of summary.positions) {
      const gainStr = `${pos.gainLoss >= 0 ? "+" : ""}${
        fmtMoney(pos.gainLoss)
      } (${fmtPercent(pos.gainLossPercent)})`;
      const coloredGain = this.colorValue(gainStr, pos.gainLoss);

      console.log(
        `${pos.symbol.padEnd(9)}${String(pos.shares).padStart(6)}   ` +
          `${fmtMoney(pos.avgCostPerShare).padStart(8)}    ` +
          `${fmtMoney(pos.currentPrice).padStart(7)}    ` +
          `${fmtMoney(pos.currentValue).padStart(10)}   ${coloredGain}`,
      );
    }

    // Total
    console.log("─".repeat(65));
    const totalGainStr = `${summary.totalGainLoss >= 0 ? "+" : ""}${
      fmtMoney(summary.totalGainLoss)
    } (${fmtPercent(summary.totalGainLossPercent)})`;
    const coloredTotal = this.colorValue(totalGainStr, summary.totalGainLoss);
    console.log(
      `${"Total".padEnd(28)}${
        fmtMoney(summary.totalValue).padStart(10)
      }   ${coloredTotal}`,
    );

    // Day change
    const dayStr = `${summary.dayChange >= 0 ? "+" : ""}${
      fmtMoney(summary.dayChange)
    } (${fmtPercent(summary.dayChangePercent)})`;
    const coloredDay = this.colorValue(dayStr, summary.dayChange);
    console.log(`Day Change: ${coloredDay}`);
  }

  formatAlert(alert: Alert, message: string): void {
    const icon = alert.condition.type.includes("above") ? "📈" : "📉";
    console.log(
      colors.bold(colors.yellow(`${icon} ALERT: ${alert.symbol}`)),
    );
    console.log(`  ${message}`);
    console.log(colors.gray(`  Triggered at ${new Date().toISOString()}`));
  }

  formatError(symbol: string, error: Error): void {
    console.error(
      colors.red(`✗ Failed to process ${symbol}: ${error.message}`),
    );
    if (error.message.includes("429") || error.message.includes("limit")) {
      console.error(
        colors.yellow("  Tip: Consider using --cache-dir to reduce API calls"),
      );
    }
  }

  begin(): void {
    // No-op
  }

  end(): void {
    // No-op
  }
}
