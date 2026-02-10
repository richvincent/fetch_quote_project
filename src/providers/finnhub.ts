/**
 * @fileoverview Finnhub data provider implementation.
 * @module providers/finnhub
 */

import type { DailyBar, NewsItem, Quote } from "../core/types.ts";
import { API_URLS, DEFAULTS } from "../core/constants.ts";
import type { Cache } from "../cache/types.ts";
import { cachedFetchJson, type RetryInfo } from "../utils/http.ts";
import type {
  DataProvider,
  FinnhubCandle,
  FinnhubNews,
  FinnhubQuote,
  ProviderConfig,
  ProviderFeature,
} from "./types.ts";

/**
 * Finnhub data provider.
 * Provides real-time quotes and historical data via the Finnhub API.
 * Free tier: 60 API calls/minute.
 */
export class FinnhubProvider implements DataProvider {
  readonly id = "finnhub";
  readonly name = "Finnhub";

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
    this.baseUrl = config.baseUrl ?? API_URLS.FINNHUB;
    this.cache = cache ?? null;
    this.onRetry = onRetry;
  }

  /**
   * Builds a Finnhub API URL with parameters.
   */
  private buildUrl(
    endpoint: string,
    params: Record<string, string> = {},
  ): string {
    const u = new URL(`${this.baseUrl}${endpoint}`);
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, v);
    }
    u.searchParams.set("token", this.apiKey);
    return u.toString();
  }

  /**
   * Fetches data with caching support.
   */
  private async fetch<T>(url: string, ttlMs: number): Promise<T> {
    return await cachedFetchJson<T>(
      url,
      this.cache,
      ttlMs,
      undefined,
      this.onRetry,
    );
  }

  async fetchQuote(symbol: string): Promise<Quote> {
    const url = this.buildUrl("/quote", { symbol });
    const data = await this.fetch<FinnhubQuote>(
      url,
      DEFAULTS.CACHE_TTL_QUOTE * 1000,
    );

    if (!data || data.c === 0) {
      throw new Error(`No quote data for ${symbol}`);
    }

    return {
      symbol,
      price: data.c,
      change: data.d,
      changePercent: data.dp / 100, // Finnhub returns percentage, we use decimal
      volume: 0, // Finnhub quote doesn't include volume
      previousClose: data.pc,
      latestTradingDay: new Date(data.t * 1000).toISOString().split("T")[0],
      timestamp: new Date(data.t * 1000),
      source: this.id,
    };
  }

  async fetchDaily(symbol: string, days = 365): Promise<DailyBar[]> {
    const now = Math.floor(Date.now() / 1000);
    const from = now - days * 86400;

    const url = this.buildUrl("/stock/candle", {
      symbol,
      resolution: "D",
      from: String(from),
      to: String(now),
    });

    const data = await this.fetch<FinnhubCandle>(
      url,
      DEFAULTS.CACHE_TTL_DAILY * 1000,
    );

    if (!data || data.s !== "ok" || !data.t) {
      throw new Error(`No daily data for ${symbol}`);
    }

    const bars: DailyBar[] = [];
    for (let i = data.t.length - 1; i >= 0; i--) {
      const date = new Date(data.t[i] * 1000).toISOString().split("T")[0];
      bars.push({
        date,
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        adjustedClose: data.c[i], // Finnhub doesn't provide adjusted close
        volume: data.v[i],
      });
    }

    return bars;
  }

  async fetchNews(
    symbol: string,
    limit = DEFAULTS.NEWS_ITEM_LIMIT,
  ): Promise<NewsItem[]> {
    const now = new Date();
    const from = new Date(
      now.getTime() - DEFAULTS.NEWS_DAYS_BACK * 86400 * 1000,
    );

    const url = this.buildUrl("/company-news", {
      symbol,
      from: from.toISOString().split("T")[0],
      to: now.toISOString().split("T")[0],
    });

    const data = await this.fetch<FinnhubNews[]>(
      url,
      DEFAULTS.CACHE_TTL_NEWS * 1000,
    );

    if (!Array.isArray(data)) {
      return [];
    }

    return data.slice(0, limit).map((item) => ({
      title: item.headline,
      url: item.url,
      publishedAt: new Date(item.datetime * 1000),
      source: item.source,
      tickers: item.related ? item.related.split(",") : [],
    }));
  }

  async fetchTopNews(limit = DEFAULTS.TOP_NEWS_LIMIT): Promise<NewsItem[]> {
    const url = this.buildUrl("/news", { category: "general" });

    const data = await this.fetch<FinnhubNews[]>(
      url,
      DEFAULTS.CACHE_TTL_NEWS * 1000,
    );

    if (!Array.isArray(data)) {
      return [];
    }

    return data.slice(0, limit).map((item) => ({
      title: item.headline,
      url: item.url,
      publishedAt: new Date(item.datetime * 1000),
      source: item.source,
      tickers: item.related ? item.related.split(",") : [],
    }));
  }

  supports(feature: ProviderFeature): boolean {
    const supported: ProviderFeature[] = ["realtime", "daily", "news"];
    return supported.includes(feature);
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

/**
 * Loads Finnhub API key from environment.
 * @returns API key or null if not found
 */
export function loadFinnhubApiKey(): string | null {
  return Deno.env.get("FINNHUB_API_KEY") || null;
}
