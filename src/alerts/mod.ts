/**
 * @fileoverview Alerts module exports.
 * @module alerts
 */

export {
  loadAlerts,
  saveAlerts,
  createAlert,
  addAlert,
  removeAlert,
  updateAlert,
  getAlert,
  getAlertsForSymbol,
  setAlertEnabled,
} from "./storage.ts";

export {
  evaluateCondition,
  formatCondition,
  createAlertEvent,
  isInCooldown,
  checkAlerts,
  AlertMonitor,
  type AlertContext,
  type AlertMonitorConfig,
} from "./monitor.ts";

export {
  sendNotifications,
  notifyConsole,
  notifyNtfy,
  notifyWebhook,
  notifyDesktop,
  notifySlack,
  notifyDiscord,
  isDesktopNotificationAvailable,
} from "./notifiers/mod.ts";

// Re-export types
export type {
  Alert,
  AlertCondition,
  AlertEvent,
  NotifierConfig,
} from "../core/types.ts";
