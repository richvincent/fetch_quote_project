/**
 * @fileoverview Webhook notifier for alerts.
 * @module alerts/notifiers/webhook
 *
 * Supports Slack, Discord, and generic webhook endpoints.
 */

import type { AlertEvent, NotifierConfig } from "../../core/types.ts";

/**
 * Webhook configuration.
 */
export interface WebhookConfig {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
}

/**
 * Webhook payload for alert events.
 */
interface WebhookPayload {
  type: "alert";
  symbol: string;
  price: number;
  condition: string;
  message: string;
  triggeredAt: string;
}

/**
 * Sends an alert via webhook.
 *
 * @param event - Alert event to send
 * @param config - Webhook configuration
 */
export async function notifyWebhook(
  event: AlertEvent,
  config: WebhookConfig,
): Promise<void> {
  const payload: WebhookPayload = {
    type: "alert",
    symbol: event.alert.symbol,
    price: event.currentValue,
    condition: formatConditionType(event.alert.condition.type),
    message: event.message,
    triggeredAt: event.triggeredAt,
  };

  const method = config.method || "POST";
  const headers = {
    "Content-Type": "application/json",
    ...config.headers,
  };

  let url = config.url;
  let body: string | undefined;

  if (method === "GET") {
    // Add params to URL for GET requests
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      params.set(key, String(value));
    }
    url = `${url}?${params.toString()}`;
  } else {
    body = JSON.stringify(payload);
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Webhook notification failed: ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Formats condition type for webhook payload.
 */
function formatConditionType(type: string): string {
  return type.replace(/_/g, " ");
}

/**
 * Creates a Slack-compatible webhook payload.
 *
 * @param event - Alert event
 * @returns Slack webhook payload
 */
export function createSlackPayload(event: AlertEvent): object {
  const color = event.alert.condition.type.includes("above")
    ? "#36a64f"
    : "#ff0000";

  return {
    attachments: [
      {
        color,
        title: `Stock Alert: ${event.alert.symbol}`,
        text: event.message,
        fields: [
          {
            title: "Price",
            value: `$${event.currentValue.toFixed(2)}`,
            short: true,
          },
          {
            title: "Triggered",
            value: new Date(event.triggeredAt).toLocaleString(),
            short: true,
          },
        ],
        footer: "fetch_quote Alert System",
      },
    ],
  };
}

/**
 * Creates a Discord-compatible webhook payload.
 *
 * @param event - Alert event
 * @returns Discord webhook payload
 */
export function createDiscordPayload(event: AlertEvent): object {
  const color = event.alert.condition.type.includes("above")
    ? 0x36a64f
    : 0xff0000;

  return {
    embeds: [
      {
        title: `Stock Alert: ${event.alert.symbol}`,
        description: event.message,
        color,
        fields: [
          {
            name: "Price",
            value: `$${event.currentValue.toFixed(2)}`,
            inline: true,
          },
          {
            name: "Triggered",
            value: new Date(event.triggeredAt).toLocaleString(),
            inline: true,
          },
        ],
        footer: {
          text: "fetch_quote Alert System",
        },
      },
    ],
  };
}

/**
 * Sends alert to Slack webhook.
 *
 * @param event - Alert event
 * @param webhookUrl - Slack webhook URL
 */
export async function notifySlack(
  event: AlertEvent,
  webhookUrl: string,
): Promise<void> {
  const payload = createSlackPayload(event);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Slack notification failed: ${response.status}`);
  }
}

/**
 * Sends alert to Discord webhook.
 *
 * @param event - Alert event
 * @param webhookUrl - Discord webhook URL
 */
export async function notifyDiscord(
  event: AlertEvent,
  webhookUrl: string,
): Promise<void> {
  const payload = createDiscordPayload(event);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Discord notification failed: ${response.status}`);
  }
}

/**
 * Creates a webhook notifier from configuration.
 *
 * @param config - Notifier configuration
 * @returns Webhook notifier function or null if not webhook config
 */
export function createWebhookNotifier(
  config: NotifierConfig,
): ((event: AlertEvent) => Promise<void>) | null {
  if (config.type !== "webhook") {
    return null;
  }

  return (event) =>
    notifyWebhook(event, {
      url: config.url,
      method: config.method,
    });
}
