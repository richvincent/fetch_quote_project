/**
 * @fileoverview Console notifier for alerts.
 * @module alerts/notifiers/console
 */

import type { AlertEvent } from "../../core/types.ts";

/**
 * ANSI color codes.
 */
const COLORS = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

/**
 * Sends an alert to the console.
 *
 * @param event - Alert event to display
 */
export function notifyConsole(event: AlertEvent): void {
  const timestamp = new Date(event.triggeredAt).toLocaleTimeString();
  const symbol = event.alert.symbol;
  const price = event.currentValue.toFixed(2);

  console.log(
    `${COLORS.bold}${COLORS.yellow}⚠ ALERT${COLORS.reset} ` +
    `[${timestamp}] ` +
    `${COLORS.cyan}${symbol}${COLORS.reset} ` +
    `$${price} - ${event.message}`,
  );

  // Play bell
  console.log("\x07");
}

/**
 * Formats an alert event for console display (without sending).
 *
 * @param event - Alert event
 * @returns Formatted string
 */
export function formatConsoleAlert(event: AlertEvent): string {
  const timestamp = new Date(event.triggeredAt).toLocaleTimeString();
  return `[${timestamp}] ${event.alert.symbol} - ${event.message}`;
}
