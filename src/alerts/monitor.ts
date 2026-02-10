/**
 * @fileoverview Alert monitoring and condition evaluation.
 * @module alerts/monitor
 */

import type {
  Alert,
  AlertCondition,
  AlertEvent,
  DailyBar,
  Quote,
} from "../core/types.ts";
import type { RSIResult } from "../core/types.ts";
import { calculateRSI } from "../indicators/rsi.ts";
import { loadAlerts, updateAlert } from "./storage.ts";

/**
 * Context for evaluating alert conditions.
 */
export interface AlertContext {
  quote: Quote;
  bars?: DailyBar[];
  rsi?: RSIResult;
  avgVolume?: number;
}

/**
 * Evaluates if an alert condition is met.
 *
 * @param condition - Alert condition to evaluate
 * @param context - Current market context
 * @returns true if condition is met
 */
export function evaluateCondition(
  condition: AlertCondition,
  context: AlertContext,
): boolean {
  switch (condition.type) {
    case "price_above":
      return context.quote.price >= condition.value;

    case "price_below":
      return context.quote.price <= condition.value;

    case "change_percent": {
      const changePercent = condition.period === "day"
        ? context.quote.changePercent * 100
        : calculateWeeklyChange(context.bars);
      return Math.abs(changePercent) >= Math.abs(condition.value);
    }

    case "rsi_above": {
      const rsi = context.rsi ||
        (context.bars ? calculateRSI(context.bars, condition.period) : null);
      return rsi !== null && rsi.value >= condition.value;
    }

    case "rsi_below": {
      const rsi = context.rsi ||
        (context.bars ? calculateRSI(context.bars, condition.period) : null);
      return rsi !== null && rsi.value <= condition.value;
    }

    case "volume_spike": {
      if (!context.avgVolume || context.avgVolume === 0) {
        return false;
      }
      return context.quote.volume >= context.avgVolume * condition.multiplier;
    }
  }
}

/**
 * Calculates weekly price change percentage.
 */
function calculateWeeklyChange(bars?: DailyBar[]): number {
  if (!bars || bars.length < 5) {
    return 0;
  }

  const latest = bars[bars.length - 1];
  const weekAgo = bars[Math.max(0, bars.length - 5)];

  if (weekAgo.close === 0) {
    return 0;
  }

  return ((latest.close - weekAgo.close) / weekAgo.close) * 100;
}

/**
 * Formats an alert condition for display.
 *
 * @param condition - Alert condition
 * @returns Human-readable condition string
 */
export function formatCondition(condition: AlertCondition): string {
  switch (condition.type) {
    case "price_above":
      return `price >= $${condition.value}`;
    case "price_below":
      return `price <= $${condition.value}`;
    case "change_percent":
      return `${condition.period} change >= ${condition.value}%`;
    case "rsi_above":
      return `RSI(${condition.period}) >= ${condition.value}`;
    case "rsi_below":
      return `RSI(${condition.period}) <= ${condition.value}`;
    case "volume_spike":
      return `volume >= ${condition.multiplier}x avg`;
  }
}

/**
 * Creates an alert event message.
 *
 * @param alert - The triggered alert
 * @param context - Market context
 * @returns Alert event with message
 */
export function createAlertEvent(
  alert: Alert,
  context: AlertContext,
): AlertEvent {
  const conditionStr = formatCondition(alert.condition);
  const message = `Alert: ${alert.symbol} - ${conditionStr} (current: $${
    context.quote.price.toFixed(2)
  })`;

  return {
    alert,
    triggeredAt: new Date().toISOString(),
    currentValue: context.quote.price,
    message,
  };
}

/**
 * Checks if an alert is in cooldown.
 *
 * @param alert - Alert to check
 * @returns true if alert is in cooldown
 */
export function isInCooldown(alert: Alert): boolean {
  if (!alert.lastTriggered) {
    return false;
  }

  const lastTriggered = new Date(alert.lastTriggered);
  const cooldownMs = alert.cooldownMinutes * 60 * 1000;
  const now = Date.now();

  return now - lastTriggered.getTime() < cooldownMs;
}

/**
 * Checks all alerts against current market data.
 *
 * @param contexts - Map of symbol to market context
 * @param alertsPath - Path to alerts file
 * @returns Array of triggered alert events
 */
export async function checkAlerts(
  contexts: Map<string, AlertContext>,
  alertsPath?: string,
): Promise<AlertEvent[]> {
  const alerts = await loadAlerts(alertsPath);
  const events: AlertEvent[] = [];

  for (const alert of alerts) {
    // Skip disabled alerts
    if (!alert.enabled) {
      continue;
    }

    // Skip alerts in cooldown
    if (isInCooldown(alert)) {
      continue;
    }

    // Get context for this symbol
    const context = contexts.get(alert.symbol);
    if (!context) {
      continue;
    }

    // Evaluate condition
    if (evaluateCondition(alert.condition, context)) {
      const event = createAlertEvent(alert, context);
      events.push(event);

      // Update last triggered time
      await updateAlert(
        alert.id,
        { lastTriggered: event.triggeredAt },
        alertsPath,
      );
    }
  }

  return events;
}

/**
 * Alert monitor configuration.
 */
export interface AlertMonitorConfig {
  checkIntervalSec: number;
  alertsPath?: string;
  onAlert: (event: AlertEvent) => void | Promise<void>;
  fetchContext: (symbol: string) => Promise<AlertContext>;
}

/**
 * Alert monitor that continuously checks alerts.
 */
export class AlertMonitor {
  private isRunning = false;
  private timeoutId: number | null = null;
  private config: AlertMonitorConfig;

  constructor(config: AlertMonitorConfig) {
    this.config = config;
  }

  /**
   * Starts the alert monitor.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    await this.runCheck();

    while (this.isRunning) {
      await this.delay(this.config.checkIntervalSec * 1000);
      if (this.isRunning) {
        await this.runCheck();
      }
    }
  }

  /**
   * Stops the alert monitor.
   */
  stop(): void {
    this.isRunning = false;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Runs a single alert check cycle.
   */
  private async runCheck(): Promise<void> {
    try {
      const alerts = await loadAlerts(this.config.alertsPath);
      const symbols = [
        ...new Set(alerts.filter((a) => a.enabled).map((a) => a.symbol)),
      ];

      // Fetch contexts for all symbols
      const contexts = new Map<string, AlertContext>();
      for (const symbol of symbols) {
        try {
          const context = await this.config.fetchContext(symbol);
          contexts.set(symbol, context);
        } catch {
          // Skip symbols that fail to fetch
        }
      }

      // Check alerts
      const events = await checkAlerts(contexts, this.config.alertsPath);

      // Notify for each event
      for (const event of events) {
        await this.config.onAlert(event);
      }
    } catch (error) {
      console.error("Alert check failed:", error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.timeoutId = setTimeout(resolve, ms) as unknown as number;
    });
  }
}
