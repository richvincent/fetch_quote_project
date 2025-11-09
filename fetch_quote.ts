#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read=alpha_vantage_api_key.txt
// fetch_quote.ts

// std deps
import { parse } from "https://deno.land/std@0.224.0/flags/mod.ts";
import * as colors from "https://deno.land/std@0.224.0/fmt/colors.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { join as pathJoin } from "https://deno.land/std@0.224.0/path/mod.ts";

// ----------------------------- Constants -----------------------------
const CONFIG = {
  DEFAULT_BUY_PCT: 7,
  DEFAULT_SELL_PCT: 8,
  DEFAULT_CONCURRENCY: 2,
  DEFAULT_QUOTE_CACHE_TTL_SEC: 60,
  DEFAULT_DAILY_CACHE_TTL_SEC: 6 * 3600,
  DEFAULT_NEWS_CACHE_TTL_SEC: 600,
  NEWS_DAYS_BACK: 60,
  TOP_NEWS_DAYS_BACK: 3,
  NEWS_ITEM_LIMIT: 6,
  TOP_NEWS_LIMIT: 10,
  TRADING_DAYS_WINDOW: 270, // ~252 trading days/year, padded for safety
  VOLUME_AVG_DAYS: 30,
  MS_PER_DAY: 86400_000,
} as const;

// ----------------------------- CLI parsing -----------------------------
const args = parse(Deno.args, {
  alias: { t: "ticker", h: "help", c: "concurrency" },
  boolean: ["news", "top-news", "help"],
  string: ["ticker", "cache-dir"],
  default: { concurrency: CONFIG.DEFAULT_CONCURRENCY },
});

const buyPct = Number(args["buy-pct"] ?? args.buyPct ?? CONFIG.DEFAULT_BUY_PCT);
const sellPct = Number(args["sell-pct"] ?? args.sellPct ?? CONFIG.DEFAULT_SELL_PCT);
const concurrency = Math.max(1, Number(args.concurrency ?? CONFIG.DEFAULT_CONCURRENCY));
const cacheDir = typeof args["cache-dir"] === "string" ? args["cache-dir"] : undefined;

let tickers: string[] = [];
if (args.ticker) tickers = String(args.ticker).split(",").map((s) => s.trim());
tickers = tickers.concat(args._.map(String));
tickers = tickers.map((s) => s.toUpperCase()).filter(Boolean).filter(validateTicker);

const showNews = !!args.news;
const showTopNews = !!args["top-news"];
const showHelp = !!args.help;

if (showHelp || (!showTopNews && tickers.length === 0)) {
  printHelp();
  Deno.exit(0);
}

/**
 * Reads API key from file with error handling
 * @param filePath - Path to the API key file
 * @returns API key string or empty string if file cannot be read
 */
async function readApiKeyFromFile(filePath: string): Promise<string> {
  try {
    const key = await Deno.readTextFile(filePath);
    return key.trim();
  } catch {
    return "";
  }
}

// Try environment variable first, then fallback to file
let API_KEY = Deno.env.get("ALPHA_VANTAGE_API_KEY") || "";
if (!API_KEY) {
  API_KEY = await readApiKeyFromFile("alpha_vantage_api_key.txt");
}

if (!API_KEY) {
  console.error(colors.red("✗ Missing ALPHA_VANTAGE_API_KEY"));
  console.error("\nTo fix this, choose one option:");
  console.error(colors.gray("  Option 1 - Environment variable:"));
  console.error(colors.gray("    export ALPHA_VANTAGE_API_KEY=YOUR_KEY"));
  console.error(colors.gray("  Option 2 - Save to alpha_vantage_api_key.txt file"));
  console.error(colors.gray("\nGet a free API key at https://www.alphavantage.co"));
  Deno.exit(1);
}

// --------------------------- Backoff & cache ---------------------------
type BackoffOpts = {
  maxRetries?: number;
  baseDelayMs?: number;
  factor?: number;
  maxDelayMs?: number;
  jitterMs?: number;
};
const DEFAULT_BACKOFF: Required<BackoffOpts> = {
  maxRetries: 6,
  baseDelayMs: 800,
  factor: 2,
  maxDelayMs: 30_000,
  jitterMs: 400,
};

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Computes exponential backoff delay with jitter
 * @param attempt - Current retry attempt number (0-indexed)
 * @param o - Backoff configuration options
 * @returns Delay in milliseconds before next retry
 */
function computeDelay(attempt: number, o: Required<BackoffOpts>) {
  const base = Math.min(o.maxDelayMs, o.baseDelayMs * Math.pow(o.factor, attempt));
  const jitter = Math.floor(Math.random() * (o.jitterMs + 1));
  return base + jitter;
}

/**
 * Detects if response contains Alpha Vantage soft rate limit message
 * @param obj - Response object to check
 * @returns True if response indicates rate limiting
 */
function isAVSoftLimit(obj: unknown): obj is AVErrorResponse {
  if (!obj || typeof obj !== "object") return false;
  const errResp = obj as AVErrorResponse;
  const note = errResp.Note ?? errResp.Information;
  if (typeof note !== "string") return false;
  const s = note.toLowerCase();
  return s.includes("frequency") || s.includes("limit") || s.includes("please consider");
}

/**
 * Fetches JSON with exponential backoff retry logic
 * Handles HTTP errors, rate limits, and Alpha Vantage soft limits
 * @param url - URL to fetch
 * @param backoff - Retry configuration options
 * @param onRetry - Optional callback invoked before each retry
 * @returns Parsed JSON response
 */
async function fetchJsonWithBackoff<T = unknown>(
  url: string,
  backoff: BackoffOpts = {},
  onRetry?: (info: { attempt: number; delayMs: number; reason: string }) => void,
): Promise<T> {
  const o = { ...DEFAULT_BACKOFF, ...backoff };
  let lastErr: unknown = undefined;

  for (let attempt = 0; attempt <= o.maxRetries; attempt++) {
    try {
      const res = await fetch(url);

      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        const d = computeDelay(attempt, o);
        onRetry?.({ attempt, delayMs: d, reason: `HTTP ${res.status}` });
        await sleep(d);
        continue;
      }

      const text = await res.text();
      let data: T;
      try {
        data = text ? JSON.parse(text) : {} as T;
      } catch {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text || "<empty>"}`);
        return text as T;
      }

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
 * Computes SHA-1 hash of a string and returns hex encoding
 * @param s - String to hash
 * @returns Hex-encoded SHA-1 hash
 */
async function sha1Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-1", buf);
  const u8 = new Uint8Array(hash);
  return Array.from(u8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Fetches JSON with optional file-based caching (TTL-aware)
 * Falls back to non-cached fetch if permissions are missing
 * @param url - URL to fetch
 * @param opts - Cache directory and TTL configuration
 * @param backoff - Retry configuration options
 * @param onRetry - Optional callback invoked before each retry
 * @returns Parsed JSON response (from cache or network)
 */
async function cachedFetchJson<T = unknown>(
  url: string,
  opts: { cacheDir?: string; ttlSec?: number } = {},
  backoff?: BackoffOpts,
  onRetry?: (info: { attempt: number; delayMs: number; reason: string }) => void,
): Promise<T> {
  const { cacheDir, ttlSec = 3600 } = opts;
  if (!cacheDir) return fetchJsonWithBackoff<T>(url, backoff, onRetry);

  let canCache = true;
  try {
    await ensureDir(cacheDir);
  } catch (err) {
    if (err instanceof Deno.errors.PermissionDenied) {
      console.error(colors.yellow("⚠ Cache disabled: missing --allow-read/--allow-write permissions"));
      console.error(colors.gray("  Run with: deno run --allow-net --allow-env --allow-read --allow-write fetch_quote.ts"));
      canCache = false;
    } else throw err;
  }
  if (!canCache) return fetchJsonWithBackoff(url, backoff, onRetry);

  const file = pathJoin(cacheDir, `${await sha1Hex(url)}.json`);
  try {
    const stat = await Deno.stat(file);
    const ageSec = (Date.now() - (stat.mtime?.getTime() ?? 0)) / 1000;
    if (ageSec <= ttlSec) {
      const text = await Deno.readTextFile(file);
      return JSON.parse(text);
    }
  } catch {
    // cache miss
  }

  const data = await fetchJsonWithBackoff<T>(url, backoff, onRetry);
  try {
    await Deno.writeTextFile(file, JSON.stringify(data));
  } catch {
    // ignore cache write errors
  }
  return data;
}

/**
 * Maps over items with limited concurrency (similar to p-limit)
 * @param items - Array of items to process
 * @param limit - Maximum number of concurrent operations
 * @param fn - Async function to apply to each item
 * @returns Promise resolving to array of results in original order
 */
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0, active = 0;
  return await new Promise<R[]>((resolve, reject) => {
    const next = () => {
      if (i >= items.length && active === 0) return resolve(results);
      while (active < limit && i < items.length) {
        const idx = i++;
        active++;
        Promise.resolve(fn(items[idx], idx))
          .then((val) => results[idx] = val)
          .catch(reject)
          .finally(() => { active--; next(); });
      }
    };
    next();
  });
}

// --------------------------- Utilities & types ---------------------------
function validateTicker(s: string) {
  // allow letters, digits, dots, dashes, and optional "EXCH:SYM"
  return /^[A-Z0-9.\-:]+$/.test(s);
}
function fmtMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}`;
}
function fmtInt(n: number) {
  if (!Number.isFinite(n)) return "—";
  return Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}
function parseChangePercent(s?: string) {
  if (!s) return NaN;
  const m = s.trim().match(/^(-?\d+(?:\.\d+)?)%$/);
  if (!m) return NaN;
  return Number(m[1]) / 100;
}

// Alpha Vantage API response types
interface AVErrorResponse {
  Note?: string;
  Information?: string;
  "Error Message"?: string;
}

type GlobalQuote = {
  ["01. symbol"]?: string;
  ["05. price"]?: string;
  ["06. volume"]?: string;
  ["07. latest trading day"]?: string;
  ["08. previous close"]?: string;
  ["09. change"]?: string;
  ["10. change percent"]?: string;
};

interface GlobalQuoteResp extends AVErrorResponse {
  "Global Quote"?: GlobalQuote;
}

type DailyRow = {
  ["1. open"]: string;
  ["2. high"]: string;
  ["3. low"]: string;
  ["4. close"]: string;
  ["5. adjusted close"]: string;
  ["6. volume"]: string;
  ["8. split coefficient"]?: string;
};

interface DailyResp extends AVErrorResponse {
  ["Time Series (Daily)"]?: Record<string, DailyRow>;
}

interface NewsItem {
  title?: string;
  url?: string;
  time_published?: string;
  tickers?: string[];
}

interface NewsResp extends AVErrorResponse {
  feed?: NewsItem[];
}

// --------------------------- Alpha Vantage URLs ---------------------------
const AV_BASE = "https://www.alphavantage.co/query";
function av(params: Record<string, string>) {
  const u = new URL(AV_BASE);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("apikey", API_KEY);
  return u.toString();
}

// --------------------------- Data fetchers ---------------------------
/**
 * Fetches real-time quote data for a symbol
 * @param symbol - Stock ticker symbol
 * @returns Global quote data with price, volume, and change info
 */
async function fetchGlobalQuote(symbol: string): Promise<GlobalQuote> {
  const url = av({ function: "GLOBAL_QUOTE", symbol });
  const data = await cachedFetchJson<GlobalQuoteResp>(url, { cacheDir, ttlSec: CONFIG.DEFAULT_QUOTE_CACHE_TTL_SEC }, {}, logRetry);
  return data?.["Global Quote"] ?? {};
}

/**
 * Fetches full daily adjusted time series for a symbol
 * @param symbol - Stock ticker symbol
 * @returns Daily time series with split/dividend adjustments
 */
async function fetchDailyAdjusted(symbol: string): Promise<DailyResp> {
  const url = av({ function: "TIME_SERIES_DAILY_ADJUSTED", symbol, outputsize: "full" });
  return await cachedFetchJson<DailyResp>(url, { cacheDir, ttlSec: CONFIG.DEFAULT_DAILY_CACHE_TTL_SEC }, {}, logRetry);
}

/**
 * Fetches recent news articles for a specific ticker
 * @param symbol - Stock ticker symbol
 * @param limit - Maximum number of articles to fetch
 * @param daysBack - Number of days to look back
 * @returns News sentiment response with article feed
 */
async function fetchTickerNews(symbol: string, limit = CONFIG.NEWS_ITEM_LIMIT, daysBack = CONFIG.NEWS_DAYS_BACK): Promise<NewsResp> {
  const dt = new Date(Date.now() - daysBack * CONFIG.MS_PER_DAY);
  const iso = dt.toISOString().slice(0, 19) + "Z";
  const url = av({
    function: "NEWS_SENTIMENT",
    tickers: symbol,
    limit: String(limit),
    sort: "LATEST",
    time_from: iso,
  });
  return await cachedFetchJson<NewsResp>(url, { cacheDir, ttlSec: CONFIG.DEFAULT_NEWS_CACHE_TTL_SEC }, {}, logRetry);
}

/**
 * Fetches general market news headlines
 * @param limit - Maximum number of articles to fetch
 * @param daysBack - Number of days to look back
 * @returns News sentiment response with market headline feed
 */
async function fetchTopNews(limit = CONFIG.TOP_NEWS_LIMIT, daysBack = CONFIG.TOP_NEWS_DAYS_BACK): Promise<NewsResp> {
  const dt = new Date(Date.now() - daysBack * CONFIG.MS_PER_DAY);
  const iso = dt.toISOString().slice(0, 19) + "Z";
  const url = av({
    function: "NEWS_SENTIMENT",
    topics: "financial_markets,earnings",
    limit: String(limit),
    sort: "LATEST",
    time_from: iso,
  });
  return await cachedFetchJson<NewsResp>(url, { cacheDir, ttlSec: CONFIG.DEFAULT_NEWS_CACHE_TTL_SEC }, {}, logRetry);
}

function logRetry({ attempt, delayMs, reason }: { attempt: number; delayMs: number; reason: string }) {
  console.error(colors.gray(`[retry #${attempt}] ${reason}; waiting ${delayMs}ms`));
}

// --------------------------- Core calcs ---------------------------
/**
 * Computes 52-week high (adjusted for splits) and 30-day average volume
 * @param daily - Alpha Vantage daily adjusted time series response
 * @returns Object containing high52 (adjusted 52-week high) and avgVol30 (30-day average volume)
 */
function computeMetrics(daily: DailyResp) {
  const rows = daily?.["Time Series (Daily)"] ?? {};
  const dates = Object.keys(rows).sort((a, b) => (a < b ? 1 : -1)); // desc
  const window = dates.slice(0, CONFIG.TRADING_DAYS_WINDOW);

  let high52 = -Infinity;
  let volSum30 = 0;
  let volCount = 0;

  for (let i = 0; i < window.length; i++) {
    const r = rows[window[i]];
    const hi = Number(r["2. high"]);
    const close = Number(r["4. close"]);
    const adjClose = Number(r["5. adjusted close"]);
    const multiplier = (Number.isFinite(adjClose) && Number.isFinite(close) && close !== 0) ? adjClose / close : 1;
    const adjHigh = hi * multiplier;
    if (Number.isFinite(adjHigh)) high52 = Math.max(high52, adjHigh);

    if (i < CONFIG.VOLUME_AVG_DAYS) {
      const v = Number(r["6. volume"]);
      if (Number.isFinite(v)) {
        volSum30 += v;
        volCount++;
      }
    }
  }

  const avgVol30 = volCount ? volSum30 / volCount : NaN;
  const high52Val = Number.isFinite(high52) ? high52 : NaN;
  return { high52: high52Val, avgVol30 };
}

// --------------------------- Printing ---------------------------
function printHelp() {
  console.log(`fetch_quote.ts — quick market lookups via Alpha Vantage

Usage:
  ./fetch_quote.ts [options] [TICKERS...]

Options:
  -t, --ticker <LIST>     Comma-separated tickers (e.g. AAPL,MSFT)
  --buy-pct <N>           Buy zone % below 52w high (default ${CONFIG.DEFAULT_BUY_PCT})
  --sell-pct <N>          Sell threshold % below 52w high (default ${CONFIG.DEFAULT_SELL_PCT})
  --news                  Include ticker news
  --top-news              Show general market headlines only
  -c, --concurrency <N>   Process N tickers in parallel (default ${CONFIG.DEFAULT_CONCURRENCY})
  --cache-dir <PATH>      Enable JSON cache at PATH (requires --allow-read --allow-write)
  -h, --help              Show help

Examples:
  ./fetch_quote.ts -t AAPL,MSFT
  ./fetch_quote.ts -t CRM --news
  ./fetch_quote.ts --top-news
  ./fetch_quote.ts -t NVDA,GOOGL,TSLA --concurrency 2

Environment:
  ALPHA_VANTAGE_API_KEY   Your API key
`);
}

function header(sym: string) {
  console.log(colors.bold(`\n=== ${sym} ===`));
}

function printQuoteLine(q: GlobalQuote) {
  const price = Number(q["05. price"]);
  const change = Number(q["09. change"]);
  const cp = parseChangePercent(q["10. change percent"]);
  const date = q["07. latest trading day"] || "";

  const pStr = fmtMoney(price);
  const chStr = `${change >= 0 ? "+" : ""}${fmtMoney(change)}`;
  const cpStr = Number.isFinite(cp) ? ` (${(cp * 100 >= 0 ? "+" : "")}${(cp * 100).toFixed(2)}%)` : "";

  const colored =
    (change > 0 || cp > 0) ? colors.green(`${pStr} ${chStr}${cpStr}`) :
      (change < 0 || cp < 0) ? colors.red(`${pStr} ${chStr}${cpStr}`) :
        `${pStr} ${chStr}${cpStr}`;

  console.log(`Price: ${colored} ${colors.gray(date ? `on ${date}` : "")}`);
}

function printZones(high52: number, buyPct: number, sellPct: number) {
  const buyLow = high52 * (1 - buyPct / 100);
  const sellThresh = high52 * (1 - sellPct / 100);
  console.log(`52w High (adj): ${fmtMoney(high52)}`);
  console.log(`Buy Zone: ${fmtMoney(buyLow)} .. ${fmtMoney(high52)} (${(buyPct).toFixed(1)}%)`);
  console.log(`Sell if < ${fmtMoney(sellThresh)} (${(sellPct).toFixed(1)}%)`);
}

function printSignal(price: number, high52: number, buyPct: number, sellPct: number) {
  if (!Number.isFinite(price) || !Number.isFinite(high52) || high52 <= 0) return;
  const buyLow = high52 * (1 - buyPct / 100);
  const sellThresh = high52 * (1 - sellPct / 100);

  if (price <= sellThresh) {
    console.log(colors.bold(colors.red("SELL")));
  } else if (price >= buyLow && price <= high52) {
    console.log(colors.bold(colors.green("BUY")));
  }
  // Else: no label (keeps it simple)
}

function printVolume(todayVol: number, avgVol30: number) {
  if (!Number.isFinite(todayVol) || !Number.isFinite(avgVol30) || avgVol30 === 0) {
    console.log(`Vol: ${fmtInt(todayVol)} vs 30d avg ${fmtInt(avgVol30)}`);
    return;
  }
  const diff = (todayVol - avgVol30) / avgVol30;
  const diffStr = (diff >= 0 ? "+" : "") + (diff * 100).toFixed(1) + "%";
  const colored = diff >= 0 ? colors.green(diffStr) : colors.red(diffStr);
  console.log(`Vol: ${fmtInt(todayVol)} vs 30d avg ${fmtInt(avgVol30)} (${colored})`);
}

function printTickerNews(n: NewsResp) {
  const feed = n.feed ?? [];
  if (feed.length === 0) {
    console.log(colors.gray("No recent headlines."));
    return;
  }
  for (const item of feed.slice(0, CONFIG.NEWS_ITEM_LIMIT)) {
    const when = parseNewsTime(item.time_published);
    console.log(`- ${item.title || "Untitled"} ${colors.gray(when)} ${colors.gray(item.url || "")}`);
  }
}

function parseNewsTime(s?: string): string {
  if (!s) return "";
  // AV format example: "20230914T210000"
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!m) return s;
  const [_, Y, M, D, h, m2, s2] = m;
  const d = new Date(`${Y}-${M}-${D}T${h}:${m2}:${s2}Z`);
  return d.toISOString().replace(".000", "");
}

// --------------------------- Pipeline ---------------------------
async function processTicker(sym: string) {
  header(sym);

  // Fetch all data in parallel for better performance
  const [q, daily, news] = await Promise.all([
    fetchGlobalQuote(sym),
    fetchDailyAdjusted(sym),
    showNews ? fetchTickerNews(sym) : Promise.resolve({ feed: [] }),
  ]);

  // Quote
  printQuoteLine(q);
  const todayVol = Number(q["06. volume"]);
  const priceNow = Number(q["05. price"]);

  // Daily (for 52w & avg volume)
  const { high52, avgVol30 } = computeMetrics(daily);
  printZones(high52, buyPct, sellPct);

  // Simple signal
  printSignal(priceNow, high52, buyPct, sellPct);

  // Volume check
  printVolume(todayVol, avgVol30);

  // News
  if (showNews) {
    console.log(colors.bold("News:"));
    printTickerNews(news);
  }
}

async function main() {
  if (showTopNews) {
    console.log(colors.bold("Top market headlines:"));
    const news = await fetchTopNews();
    printTickerNews(news);
    if (tickers.length === 0) return;
    console.log("");
  }

  await mapLimit(tickers, concurrency, async (t) => {
    try {
      await processTicker(t);
    } catch (err) {
      if (err instanceof Error) {
        console.error(colors.red(`✗ Failed to process ${t}: ${err.message}`));
        if (err.message.includes("429") || err.message.includes("limit")) {
          console.error(colors.yellow("  Tip: Consider using --cache-dir to reduce API calls"));
        }
      } else {
        console.error(colors.red(`✗ Failed to process ${t}: Unknown error`));
      }
    }
  });
}

if (import.meta.main) {
  await main();
}
