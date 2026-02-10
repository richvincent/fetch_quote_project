/**
 * @fileoverview Alerts module exports.
 * @module alerts
 */

export {
  addAlert,
  createAlert,
  getAlert,
  getAlertsForSymbol,
  loadAlerts,
  removeAlert,
  saveAlerts,
  setAlertEnabled,
  updateAlert,
} from "./storage.ts";

export {
  type AlertContext,
  AlertMonitor,
  type AlertMonitorConfig,
  checkAlerts,
  createAlertEvent,
  evaluateCondition,
  formatCondition,
  isInCooldown,
} from "./monitor.ts";

export {
  isDesktopNotificationAvailable,
  notifyConsole,
  notifyDesktop,
  notifyDiscord,
  notifyNtfy,
  notifySlack,
  notifyWebhook,
  sendNotifications,
} from "./notifiers/mod.ts";

// Re-export types
export type {
  Alert,
  AlertCondition,
  AlertEvent,
  NotifierConfig,
} from "../core/types.ts";
