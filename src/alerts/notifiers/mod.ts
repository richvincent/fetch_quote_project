/**
 * @fileoverview Alert notifiers module exports.
 * @module alerts/notifiers
 */

export { formatConsoleAlert, notifyConsole } from "./console.ts";
export {
  createNtfyNotifier,
  notifyNtfy,
  type NtfyConfig,
  testNtfyConnection,
} from "./ntfy.ts";
export {
  createDiscordPayload,
  createSlackPayload,
  createWebhookNotifier,
  notifyDiscord,
  notifySlack,
  notifyWebhook,
  type WebhookConfig,
} from "./webhook.ts";
export { isDesktopNotificationAvailable, notifyDesktop } from "./desktop.ts";

import type { AlertEvent, NotifierConfig } from "../../core/types.ts";
import { notifyConsole } from "./console.ts";
import { notifyNtfy } from "./ntfy.ts";
import { notifyWebhook } from "./webhook.ts";
import { notifyDesktop } from "./desktop.ts";

/**
 * Sends an alert event to all configured notifiers.
 *
 * @param event - Alert event to send
 * @param notifiers - Notifier configurations
 */
export async function sendNotifications(
  event: AlertEvent,
  notifiers: NotifierConfig[],
): Promise<void> {
  const promises: Promise<void>[] = [];

  for (const config of notifiers) {
    switch (config.type) {
      case "console":
        notifyConsole(event);
        break;

      case "ntfy":
        promises.push(
          notifyNtfy(event, {
            server: config.server,
            topic: config.topic,
            priority: config.priority as
              | "min"
              | "low"
              | "default"
              | "high"
              | "max"
              | undefined,
          }),
        );
        break;

      case "webhook":
        promises.push(
          notifyWebhook(event, {
            url: config.url,
            method: config.method,
          }),
        );
        break;

      case "desktop":
        promises.push(notifyDesktop(event));
        break;
    }
  }

  // Wait for all async notifications (but don't fail if some fail)
  const results = await Promise.allSettled(promises);

  // Log any failures
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Notification failed:", result.reason);
    }
  }
}
