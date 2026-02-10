/**
 * @fileoverview NTFY push notification notifier.
 * @module alerts/notifiers/ntfy
 *
 * NTFY is a simple HTTP-based pub-sub notification service.
 * @see https://ntfy.sh
 */

import type { AlertEvent, NotifierConfig } from "../../core/types.ts";

/**
 * NTFY notifier configuration.
 */
export interface NtfyConfig {
  server: string;
  topic: string;
  priority?: "min" | "low" | "default" | "high" | "max";
  tags?: string[];
}

/**
 * Sends an alert via NTFY.
 *
 * @param event - Alert event to send
 * @param config - NTFY configuration
 */
export async function notifyNtfy(
  event: AlertEvent,
  config: NtfyConfig,
): Promise<void> {
  const url = `${config.server}/${config.topic}`;

  const headers: Record<string, string> = {
    "Content-Type": "text/plain",
    "Title": `Stock Alert: ${event.alert.symbol}`,
  };

  if (config.priority) {
    headers["Priority"] = config.priority;
  }

  // Add tags
  const tags = config.tags || [];
  tags.push("chart_with_upwards_trend");

  // Add price direction emoji
  if (event.alert.condition.type === "price_above") {
    tags.push("green_circle");
  } else if (event.alert.condition.type === "price_below") {
    tags.push("red_circle");
  }

  headers["Tags"] = tags.join(",");

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: event.message,
  });

  if (!response.ok) {
    throw new Error(
      `NTFY notification failed: ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Creates an NTFY notifier from configuration.
 *
 * @param config - Notifier configuration
 * @returns NTFY notifier function or null if not NTFY config
 */
export function createNtfyNotifier(
  config: NotifierConfig,
): ((event: AlertEvent) => Promise<void>) | null {
  if (config.type !== "ntfy") {
    return null;
  }

  return (event) =>
    notifyNtfy(event, {
      server: config.server,
      topic: config.topic,
      priority: config.priority as NtfyConfig["priority"],
    });
}

/**
 * Tests NTFY connection by sending a test notification.
 *
 * @param config - NTFY configuration
 * @returns true if successful
 */
export async function testNtfyConnection(config: NtfyConfig): Promise<boolean> {
  try {
    const url = `${config.server}/${config.topic}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "Title": "fetch_quote Test",
        "Priority": "min",
        "Tags": "test_tube",
      },
      body: "Test notification from fetch_quote alert system",
    });

    return response.ok;
  } catch {
    return false;
  }
}
