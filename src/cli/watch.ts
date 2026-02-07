/**
 * @fileoverview Watch mode for continuous quote updates.
 * @module cli/watch
 */

import type { Quote, DailyBar } from "../core/types.ts";

/**
 * Watch mode options.
 */
export interface WatchOptions {
  /** Update interval in seconds */
  interval: number;
  /** Whether to clear screen between updates */
  clearScreen: boolean;
  /** Whether to play sound on significant changes */
  sound: boolean;
  /** Callback for each update */
  onUpdate: (results: WatchResult[]) => void | Promise<void>;
  /** Callback for errors */
  onError?: (symbol: string, error: Error) => void;
  /** Signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Result of a watch update.
 */
export interface WatchResult {
  symbol: string;
  quote: Quote;
  bars?: DailyBar[];
  previousQuote?: Quote;
  priceChange?: number;
  priceChangePercent?: number;
}

/**
 * Watch mode state.
 */
interface WatchState {
  isRunning: boolean;
  previousQuotes: Map<string, Quote>;
  updateCount: number;
  lastUpdate: Date | null;
  errors: Map<string, Error>;
}

/**
 * Watch mode controller.
 */
export class WatchMode {
  private state: WatchState = {
    isRunning: false,
    previousQuotes: new Map(),
    updateCount: 0,
    lastUpdate: null,
    errors: new Map(),
  };

  private timeoutId: number | null = null;

  /**
   * Starts watching the given symbols.
   *
   * @param symbols - Stock symbols to watch
   * @param fetchQuote - Function to fetch quotes
   * @param options - Watch options
   */
  async start(
    symbols: string[],
    fetchQuote: (symbol: string) => Promise<{ quote: Quote; bars?: DailyBar[] }>,
    options: WatchOptions,
  ): Promise<void> {
    if (this.state.isRunning) {
      throw new Error("Watch mode is already running");
    }

    this.state.isRunning = true;
    this.state.errors.clear();

    // Set up abort signal handler
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        this.stop();
      });
    }

    // Initial fetch
    await this.runUpdate(symbols, fetchQuote, options);

    // Continue with interval if still running
    while (this.state.isRunning && !options.signal?.aborted) {
      await this.delay(options.interval * 1000, options.signal);

      if (this.state.isRunning && !options.signal?.aborted) {
        await this.runUpdate(symbols, fetchQuote, options);
      }
    }
  }

  /**
   * Stops watch mode.
   */
  stop(): void {
    this.state.isRunning = false;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Gets the current watch state.
   */
  getState(): Readonly<WatchState> {
    return { ...this.state };
  }

  /**
   * Runs a single update cycle.
   */
  private async runUpdate(
    symbols: string[],
    fetchQuote: (symbol: string) => Promise<{ quote: Quote; bars?: DailyBar[] }>,
    options: WatchOptions,
  ): Promise<void> {
    if (options.clearScreen) {
      console.clear();
    }

    const results: WatchResult[] = [];

    for (const symbol of symbols) {
      try {
        const { quote, bars } = await fetchQuote(symbol);
        const previousQuote = this.state.previousQuotes.get(symbol);

        const result: WatchResult = {
          symbol,
          quote,
          bars,
          previousQuote,
        };

        // Calculate change from previous update
        if (previousQuote) {
          result.priceChange = quote.price - previousQuote.price;
          result.priceChangePercent = previousQuote.price > 0
            ? ((quote.price - previousQuote.price) / previousQuote.price) * 100
            : 0;
        }

        results.push(result);
        this.state.previousQuotes.set(symbol, quote);
        this.state.errors.delete(symbol);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.state.errors.set(symbol, err);
        options.onError?.(symbol, err);
      }
    }

    this.state.updateCount++;
    this.state.lastUpdate = new Date();

    await options.onUpdate(results);

    // Play sound if enabled and significant change
    if (options.sound) {
      for (const result of results) {
        if (result.priceChangePercent && Math.abs(result.priceChangePercent) >= 1) {
          this.playBeep();
          break;
        }
      }
    }
  }

  /**
   * Delays for the specified time.
   */
  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (signal?.aborted) {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        resolve();
      }, ms);

      this.timeoutId = timeoutId;

      signal?.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        resolve();
      });
    });
  }

  /**
   * Plays a system beep (if available).
   */
  private playBeep(): void {
    // Use bell character for terminal beep
    console.log("\x07");
  }
}

/**
 * Formats a watch update header.
 *
 * @param updateCount - Number of updates
 * @param lastUpdate - Last update time
 * @param interval - Update interval in seconds
 * @returns Formatted header string
 */
export function formatWatchHeader(
  updateCount: number,
  lastUpdate: Date | null,
  interval: number,
): string {
  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString()
    : "N/A";

  return `Watch Mode | Update #${updateCount} | Last: ${timeStr} | Interval: ${interval}s | Ctrl+C to exit`;
}

/**
 * Formats the change between updates.
 *
 * @param change - Price change
 * @param changePercent - Change percentage
 * @returns Formatted change string with arrow
 */
export function formatWatchChange(
  change: number | undefined,
  changePercent: number | undefined,
): string {
  if (change === undefined || changePercent === undefined) {
    return "";
  }

  const arrow = change > 0 ? "↑" : change < 0 ? "↓" : "→";
  const sign = change >= 0 ? "+" : "";

  return `${arrow} ${sign}$${Math.abs(change).toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
}

/**
 * Creates a watch mode instance with default signal handling.
 *
 * @returns Object with watch instance and abort controller
 */
export function createWatchMode(): { watch: WatchMode; controller: AbortController } {
  const controller = new AbortController();
  const watch = new WatchMode();

  // Handle Deno signals for graceful shutdown
  try {
    Deno.addSignalListener("SIGINT", () => {
      controller.abort();
    });

    Deno.addSignalListener("SIGTERM", () => {
      controller.abort();
    });
  } catch {
    // Signal listeners not available (e.g., Windows)
  }

  return { watch, controller };
}
