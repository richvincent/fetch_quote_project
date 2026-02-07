/**
 * @fileoverview Desktop notification notifier.
 * @module alerts/notifiers/desktop
 *
 * Uses native OS notification systems via osascript (macOS) or notify-send (Linux).
 */

import type { AlertEvent } from "../../core/types.ts";

/**
 * Sends an alert as a desktop notification.
 *
 * @param event - Alert event to display
 */
export async function notifyDesktop(event: AlertEvent): Promise<void> {
  const title = `Stock Alert: ${event.alert.symbol}`;
  const message = `$${event.currentValue.toFixed(2)} - ${event.message}`;

  const os = Deno.build.os;

  if (os === "darwin") {
    await notifyMacOS(title, message);
  } else if (os === "linux") {
    await notifyLinux(title, message);
  } else {
    // Fallback to console
    console.log(`[Desktop Notification] ${title}: ${message}`);
  }
}

/**
 * Sends notification on macOS using osascript.
 */
async function notifyMacOS(title: string, message: string): Promise<void> {
  const script = `display notification "${escapeAppleScript(message)}" with title "${escapeAppleScript(title)}" sound name "Glass"`;

  const cmd = new Deno.Command("osascript", {
    args: ["-e", script],
    stdout: "null",
    stderr: "null",
  });

  const process = cmd.spawn();
  await process.status;
}

/**
 * Sends notification on Linux using notify-send.
 */
async function notifyLinux(title: string, message: string): Promise<void> {
  const cmd = new Deno.Command("notify-send", {
    args: [
      "-u", "normal",
      "-i", "stock",
      title,
      message,
    ],
    stdout: "null",
    stderr: "null",
  });

  try {
    const process = cmd.spawn();
    await process.status;
  } catch {
    // notify-send not available, silently fail
    console.log(`[Desktop] ${title}: ${message}`);
  }
}

/**
 * Escapes special characters for AppleScript strings.
 */
function escapeAppleScript(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

/**
 * Checks if desktop notifications are available.
 *
 * @returns true if desktop notifications are supported
 */
export async function isDesktopNotificationAvailable(): Promise<boolean> {
  const os = Deno.build.os;

  if (os === "darwin") {
    // osascript is always available on macOS
    return true;
  }

  if (os === "linux") {
    // Check if notify-send is available
    try {
      const cmd = new Deno.Command("which", {
        args: ["notify-send"],
        stdout: "null",
        stderr: "null",
      });
      const { success } = await cmd.output();
      return success;
    } catch {
      return false;
    }
  }

  return false;
}
