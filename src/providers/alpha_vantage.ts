/**
 * @fileoverview Alpha Vantage data provider implementation.
 * @module providers/alpha_vantage
 */

import type { Quote, DailyBar, NewsItem } from "../core/types.ts";
import { API_URLS, DEFAULTS, MS_PER_DAY } from "../core/constants.ts";
import type { Cache } from "../cache/types.ts";
import { cachedFetchJson, type RetryInfo } from "../utils/http.ts";
import { parseAVTimestamp } from "../utils/format.ts";
import type {
  DataProvider,
  ProviderFeature,
  ProviderConfig,
  AVGlobalQuoteResp,
  AVDailyResp,
  AVNewsResp,
} from "./types.ts";

/**
 * Alpha Vantage data provider.
 * Provides real-time quotes, historical data, and news via the Alpha Vantage API.
 */
export class AlphaVantageProvider implements DataProvider {
  readonly id = "alpha_vantage";
  readonly name = "Alpha Vantage";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cache: Cache | null;
  private readonly onRetry?: (info: RetryInfo) => void;

  constructor(
    config: ProviderConfig & { apiKey: string },
    cache?: Cache | null,
    onRetry?: (info: RetryInfo) => void,
  ) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? API_URLS.ALPHA_VANTAGE;
    this.cache = cache ?? null;
    this.onRetry = onRetry;
  }

  /**
   * Builds an Alpha Vantage API URL with parameters.
   */
  private buildUrl(params: Record<string, string>): string {
    const u = new URL(this.baseUrl);
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, v);
    }
    u.searchParams.set("apikey", this.apiKey);
    return u.toString();
  }

  /**
   * Fetches data with caching support.
   */
  private async fetch<T>(url: string, ttlMs: number): Promise<T> {
    return await cachedFetchJson<T>(url, this.cache, ttlMs, undefined, this.onRetry);
  }

  async fetchQuote(symbol: string): Promise<Quote> {
    const url = this.buildUrl({ function: "GLOBAL_QUOTE", symbol });
    const data = await this.fetch<AVGlobalQuoteResp>(
      url,
      DEFAULTS.CACHE_TTL_QUOTE * 1000,
    );

    const q = data?.["Global Quote"];
    if (!q || !q["05. price"]) {
      throw new Error(`No quote data for ${symbol}`);
    }

    const price = Number(q["05. price"]);
    const change = Number(q["09. change"]) || 0;
    const previousClose = Number(q["08. previous close"]) || price - change;
    const changePercent = previousClose !== 0 ? change / previousClose : 0;

    return {
      symbol: q["01. symbol"] || symbol,
      price,
      change,
      changePercent,
      volume: Number(q["06. volume"]) || 0,
      previousClose,
      latestTradingDay: q["07. latest trading day"] || "",
      timestamp: new Date(),
      source: this.id,
    };
  }

  async fetchDaily(symbol: string, days = 365): Promise<DailyBar[]> {
    const url = this.buildUrl({
      function: "TIME_SERIES_DAILY_ADJUSTED",
      symbol,
      outputsize: "full",
    });

    const data = await this.fetch<AVDailyResp>(
      url,
      DEFAULTS.CACHE_TTL_DAILY * 1000,
    );

    const rows = data?.["Time Series (Daily)"];
    if (!rows) {
      throw new Error(`No daily data for ${symbol}`);
    }

    // Sort dates descending and limit to requested days
    const dates = Object.keys(rows).sort((a, b) => b.localeCompare(a));
    const limitedDates = dates.slice(0, days);

    return limitedDates.map((date) => {
      const r = rows[date];
      return {
        date,
        open: Number(r["1. open"]),
        high: Number(r["2. high"]),
        low: Number(r["3. low"]),
        close: Number(r["4. close"]),
        adjustedClose: Number(r["5. adjusted close"]),
        volume: Number(r["6. volume"]),
        splitCoefficient: r["8. split coefficient"]
          ? Number(r["8. split coefficient"])
          : undefined,
      };
    });
  }

  async fetchNews(symbol: string, limit = DEFAULTS.NEWS_ITEM_LIMIT): Promise<NewsItem[]> {
    const dt = new Date(Date.now() - DEFAULTS.NEWS_DAYS_BACK * MS_PER_DAY);
    const timeFrom = dt.toISOString().slice(0, 19) + "Z";

    const url = this.buildUrl({
      function: "NEWS_SENTIMENT",
      tickers: symbol,
      limit: String(limit),
      sort: "LATEST",
      time_from: timeFrom,
    });

    const data = await this.fetch<AVNewsResp>(
      url,
      DEFAULTS.CACHE_TTL_NEWS * 1000,
    );

    const feed = data?.feed ?? [];
    return feed.slice(0, limit).map((item) => ({
      title: item.title || "Untitled",
      url: item.url || "",
      publishedAt: parseAVTimestamp(item.time_published) || new Date(),
      source: "Alpha Vantage",
      tickers: item.tickers || [],
      sentiment: item.overall_sentiment_score,
    }));
  }

  async fetchTopNews(limit = DEFAULTS.TOP_NEWS_LIMIT): Promise<NewsItem[]> {
    const dt = new Date(Date.now() - DEFAULTS.TOP_NEWS_DAYS_BACK * MS_PER_DAY);
    const timeFrom = dt.toISOString().slice(0, 19) + "Z";

    const url = this.buildUrl({
      function: "NEWS_SENTIMENT",
      topics: "financial_markets,earnings",
      limit: String(limit),
      sort: "LATEST",
      time_from: timeFrom,
    });

    const data = await this.fetch<AVNewsResp>(
      url,
      DEFAULTS.CACHE_TTL_NEWS * 1000,
    );

    const feed = data?.feed ?? [];
    return feed.slice(0, limit).map((item) => ({
      title: item.title || "Untitled",
      url: item.url || "",
      publishedAt: parseAVTimestamp(item.time_published) || new Date(),
      source: "Alpha Vantage",
      tickers: item.tickers || [],
      sentiment: item.overall_sentiment_score,
    }));
  }

  supports(feature: ProviderFeature): boolean {
    const supported: ProviderFeature[] = ["realtime", "daily", "news"];
    return supported.includes(feature);
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
}

/**
 * Loads Alpha Vantage API key from environment or file.
 * @returns API key or null if not found
 */
export async function loadAlphaVantageApiKey(): Promise<string | null> {
  // Try environment variable first
  const envKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
  if (envKey) return envKey;

  // Try file
  try {
    const key = await Deno.readTextFile("alpha_vantage_api_key.txt");
    return key.trim() || null;
  } catch {
    return null;
  }
}
