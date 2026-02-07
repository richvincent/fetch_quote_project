/**
 * @fileoverview Alert storage and persistence.
 * @module alerts/storage
 */

import type { Alert, AlertCondition, NotifierConfig } from "../core/types.ts";
import { expandPath } from "../utils/format.ts";
import { DEFAULTS } from "../core/constants.ts";

/**
 * Default alerts file location.
 */
const DEFAULT_ALERTS_PATH = "~/.fetch_quote/alerts.json";

/**
 * Alerts storage structure.
 */
interface AlertsData {
  version: string;
  alerts: Alert[];
}

/**
 * Current storage version.
 */
const ALERTS_VERSION = "1.0";

/**
 * Loads alerts from disk.
 *
 * @param path - Path to alerts file (optional, uses default)
 * @returns Array of alerts
 */
export async function loadAlerts(path?: string): Promise<Alert[]> {
  const filePath = expandPath(path || DEFAULT_ALERTS_PATH);

  try {
    const content = await Deno.readTextFile(filePath);
    const data = JSON.parse(content) as AlertsData;
    return data.alerts || [];
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return [];
    }
    throw err;
  }
}

/**
 * Saves alerts to disk.
 *
 * @param alerts - Alerts to save
 * @param path - Path to save to (optional, uses default)
 */
export async function saveAlerts(
  alerts: Alert[],
  path?: string,
): Promise<void> {
  const filePath = expandPath(path || DEFAULT_ALERTS_PATH);

  // Ensure directory exists
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  await Deno.mkdir(dir, { recursive: true }).catch(() => {});

  const data: AlertsData = {
    version: ALERTS_VERSION,
    alerts,
  };

  const content = JSON.stringify(data, null, 2);
  await Deno.writeTextFile(filePath, content);
}

/**
 * Generates a unique alert ID.
 */
function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Creates a new alert.
 *
 * @param symbol - Stock symbol
 * @param condition - Alert condition
 * @param notifiers - Notifier configurations
 * @param cooldownMinutes - Minutes between repeated triggers
 * @returns New alert object
 */
export function createAlert(
  symbol: string,
  condition: AlertCondition,
  notifiers: NotifierConfig[] = [{ type: "console" }],
  cooldownMinutes: number = DEFAULTS.ALERT_COOLDOWN_MINUTES,
): Alert {
  return {
    id: generateAlertId(),
    symbol: symbol.toUpperCase(),
    condition,
    notifiers,
    createdAt: new Date().toISOString(),
    enabled: true,
    cooldownMinutes,
  };
}

/**
 * Adds an alert and saves to disk.
 *
 * @param alert - Alert to add
 * @param path - Path to alerts file
 */
export async function addAlert(
  alert: Alert,
  path?: string,
): Promise<void> {
  const alerts = await loadAlerts(path);
  alerts.push(alert);
  await saveAlerts(alerts, path);
}

/**
 * Removes an alert by ID.
 *
 * @param alertId - Alert ID to remove
 * @param path - Path to alerts file
 * @returns true if removed, false if not found
 */
export async function removeAlert(
  alertId: string,
  path?: string,
): Promise<boolean> {
  const alerts = await loadAlerts(path);
  const index = alerts.findIndex((a) => a.id === alertId);

  if (index < 0) {
    return false;
  }

  alerts.splice(index, 1);
  await saveAlerts(alerts, path);
  return true;
}

/**
 * Updates an alert.
 *
 * @param alertId - Alert ID to update
 * @param updates - Partial alert updates
 * @param path - Path to alerts file
 * @returns Updated alert or null if not found
 */
export async function updateAlert(
  alertId: string,
  updates: Partial<Omit<Alert, "id" | "createdAt">>,
  path?: string,
): Promise<Alert | null> {
  const alerts = await loadAlerts(path);
  const index = alerts.findIndex((a) => a.id === alertId);

  if (index < 0) {
    return null;
  }

  alerts[index] = { ...alerts[index], ...updates };
  await saveAlerts(alerts, path);
  return alerts[index];
}

/**
 * Gets an alert by ID.
 *
 * @param alertId - Alert ID
 * @param path - Path to alerts file
 * @returns Alert or null if not found
 */
export async function getAlert(
  alertId: string,
  path?: string,
): Promise<Alert | null> {
  const alerts = await loadAlerts(path);
  return alerts.find((a) => a.id === alertId) || null;
}

/**
 * Gets all alerts for a symbol.
 *
 * @param symbol - Stock symbol
 * @param path - Path to alerts file
 * @returns Array of alerts for the symbol
 */
export async function getAlertsForSymbol(
  symbol: string,
  path?: string,
): Promise<Alert[]> {
  const alerts = await loadAlerts(path);
  return alerts.filter((a) => a.symbol === symbol.toUpperCase());
}

/**
 * Enables or disables an alert.
 *
 * @param alertId - Alert ID
 * @param enabled - Whether to enable
 * @param path - Path to alerts file
 */
export async function setAlertEnabled(
  alertId: string,
  enabled: boolean,
  path?: string,
): Promise<void> {
  await updateAlert(alertId, { enabled }, path);
}
