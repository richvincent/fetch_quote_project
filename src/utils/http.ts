/**
 * @fileoverview HTTP utilities with retry and backoff logic.
 * @module utils/http
 */

import { BACKOFF_DEFAULTS } from "../core/constants.ts";

/**
 * Backoff configuration options.
 */
export interface BackoffOpts {
  maxRetries?: number;
  baseDelayMs?: number;
  factor?: number;
  maxDelayMs?: number;
  jitterMs?: number;
}

/**
 * Retry callback information.
 */
export interface RetryInfo {
  attempt: number;
  delayMs: number;
  reason: string;
}

/**
 * Alpha Vantage error response shape.
 */
interface AVErrorResponse {
  Note?: string;
  Information?: string;
  "Error Message"?: string;
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Computes exponential backoff delay with jitter.
 * @param attempt - Current retry attempt (0-indexed)
 * @param o - Backoff options
 * @returns Delay in milliseconds
 */
export function computeDelay(attempt: number, o: Required<BackoffOpts>): number {
  const base = Math.min(o.maxDelayMs, o.baseDelayMs * Math.pow(o.factor, attempt));
  const jitter = Math.floor(Math.random() * (o.jitterMs + 1));
  return base + jitter;
}

/**
 * Detects Alpha Vantage soft rate limit response.
 * @param obj - Response object to check
 * @returns True if response indicates rate limiting
 */
export function isAVSoftLimit(obj: unknown): obj is AVErrorResponse {
  if (!obj || typeof obj !== "object") return false;
  const errResp = obj as AVErrorResponse;
  const note = errResp.Note ?? errResp.Information;
  if (typeof note !== "string") return false;
  const s = note.toLowerCase();
  return s.includes("frequency") || s.includes("limit") || s.includes("please consider");
}

/**
 * Fetches JSON with exponential backoff retry logic.
 * Handles HTTP errors, rate limits, and Alpha Vantage soft limits.
 *
 * @param url - URL to fetch
 * @param backoff - Retry configuration options
 * @param onRetry - Optional callback invoked before each retry
 * @returns Parsed JSON response
 * @throws Error after all retries exhausted
 */
export async function fetchJsonWithBackoff<T = unknown>(
  url: string,
  backoff: BackoffOpts = {},
  onRetry?: (info: RetryInfo) => void,
): Promise<T> {
  const o = { ...BACKOFF_DEFAULTS, ...backoff };
  let lastErr: unknown = undefined;

  for (let attempt = 0; attempt <= o.maxRetries; attempt++) {
    try {
      const res = await fetch(url);

      // Handle rate limits and server errors
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        const d = computeDelay(attempt, o);
        onRetry?.({ attempt, delayMs: d, reason: `HTTP ${res.status}` });
        await sleep(d);
        continue;
      }

      const text = await res.text();
      let data: T;
      try {
        data = text ? JSON.parse(text) : ({} as unknown as T);
      } catch {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text || "<empty>"}`);
        return text as unknown as T;
      }

      // Handle Alpha Vantage soft limits
      if (isAVSoftLimit(data)) {
        const d = Math.max(10_000, computeDelay(attempt, o));
        onRetry?.({ attempt, delayMs: d, reason: "Alpha Vantage soft limit" });
        await sleep(d);
        continue;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text || "<empty>"}`);
      return data;
    } catch (err) {
      lastErr = err;
      const d = computeDelay(attempt, o);
      onRetry?.({ attempt, delayMs: d, reason: (err as Error).message || "network error" });
      await sleep(d);
    }
  }
  throw lastErr ?? new Error("fetchJsonWithBackoff: failed after retries");
}

/**
 * Fetches JSON with caching support.
 *
 * @param url - URL to fetch
 * @param cache - Cache instance (or null to disable)
 * @param ttlMs - Cache TTL in milliseconds
 * @param backoff - Retry configuration
 * @param onRetry - Retry callback
 * @returns Parsed JSON response
 */
export async function cachedFetchJson<T = unknown>(
  url: string,
  cache: { get: (k: string) => Promise<{ data: T } | null>; set: (k: string, d: T, t: number) => Promise<void> } | null,
  ttlMs: number,
  backoff?: BackoffOpts,
  onRetry?: (info: RetryInfo) => void,
): Promise<T> {
  // Try cache first
  if (cache) {
    const cached = await cache.get(url);
    if (cached) return cached.data;
  }

  // Fetch from network
  const data = await fetchJsonWithBackoff<T>(url, backoff, onRetry);

  // Store in cache
  if (cache) {
    await cache.set(url, data, ttlMs);
  }

  return data;
}

/**
 * Concurrency-limited map function.
 * Processes items with a maximum number of concurrent operations.
 *
 * @param items - Array of items to process
 * @param limit - Maximum concurrent operations
 * @param fn - Async function to apply to each item
 * @returns Array of results in original order
 */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (x: T, i: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  let active = 0;

  return await new Promise<R[]>((resolve, reject) => {
    const next = () => {
      if (i >= items.length && active === 0) return resolve(results);
      while (active < limit && i < items.length) {
        const idx = i++;
        active++;
        Promise.resolve(fn(items[idx], idx))
          .then((val) => (results[idx] = val))
          .catch(reject)
          .finally(() => {
            active--;
            next();
          });
      }
    };
    next();
  });
}
