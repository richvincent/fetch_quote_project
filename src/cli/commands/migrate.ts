/**
 * @fileoverview Export and import functionality for migrating fetch_quote to another machine.
 * @module cli/commands/migrate
 *
 * Creates a portable bundle containing:
 * - Configuration file
 * - Portfolio data
 * - Alert definitions
 * - API keys (optionally encrypted)
 */

import { expandPath } from "../../utils/format.ts";
import { loadConfig } from "../../config/mod.ts";
import { loadPortfolio } from "../../portfolio/mod.ts";
import { loadAlerts } from "../../alerts/mod.ts";

/**
 * Export bundle structure.
 */
export interface ExportBundle {
  version: string;
  exportedAt: string;
  exportedFrom: string;
  data: {
    config?: Record<string, unknown>;
    portfolio?: Record<string, unknown>;
    alerts?: Record<string, unknown>[];
  };
  credentials?: {
    encrypted: boolean;
    data?: string;
  };
}

/**
 * Current bundle version.
 */
const BUNDLE_VERSION = "1.0";

/**
 * Default file paths.
 */
const DEFAULT_PATHS = {
  config: "~/.fetch_quote.yaml",
  portfolio: "~/.fetch_quote/portfolio.json",
  alerts: "~/.fetch_quote/alerts.json",
};

/**
 * Export options.
 */
export interface ExportOptions {
  includeConfig?: boolean;
  includePortfolio?: boolean;
  includeAlerts?: boolean;
  includeCredentials?: boolean;
  encryptCredentials?: boolean;
  passphrase?: string;
}

/**
 * Exports data to a bundle.
 *
 * @param options - Export options
 * @returns Export bundle
 */
export async function exportData(
  options: ExportOptions = {},
): Promise<ExportBundle> {
  const {
    includeConfig = true,
    includePortfolio = true,
    includeAlerts = true,
    includeCredentials = false,
  } = options;

  const bundle: ExportBundle = {
    version: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    exportedFrom: Deno.hostname(),
    data: {},
  };

  // Load and include configuration
  if (includeConfig) {
    try {
      const { config, configPath } = await loadConfig();
      if (configPath) {
        // Remove credentials from config if not including them
        const configToExport = { ...config };
        if (!includeCredentials) {
          configToExport.credentials = {
            alphaVantage: {},
            finnhub: {},
          };
        }
        bundle.data.config = configToExport as unknown as Record<string, unknown>;
      }
    } catch {
      // No config file, skip
    }
  }

  // Load and include portfolio
  if (includePortfolio) {
    try {
      const portfolio = await loadPortfolio();
      if (portfolio) {
        bundle.data.portfolio = portfolio as unknown as Record<string, unknown>;
      }
    } catch {
      // No portfolio, skip
    }
  }

  // Load and include alerts
  if (includeAlerts) {
    try {
      const alerts = await loadAlerts();
      if (alerts.length > 0) {
        bundle.data.alerts = alerts as unknown as Record<string, unknown>[];
      }
    } catch {
      // No alerts, skip
    }
  }

  // Handle credentials separately
  if (includeCredentials) {
    const credentials = await collectCredentials();
    if (Object.keys(credentials).length > 0) {
      if (options.encryptCredentials && options.passphrase) {
        bundle.credentials = {
          encrypted: true,
          data: await encryptCredentials(credentials, options.passphrase),
        };
      } else {
        bundle.credentials = {
          encrypted: false,
          data: JSON.stringify(credentials),
        };
      }
    }
  }

  return bundle;
}

/**
 * Collects API credentials from environment and config.
 */
async function collectCredentials(): Promise<Record<string, string>> {
  const credentials: Record<string, string> = {};

  // Check environment
  const avKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
  if (avKey) {
    credentials.ALPHA_VANTAGE_API_KEY = avKey;
  }

  const fhKey = Deno.env.get("FINNHUB_API_KEY");
  if (fhKey) {
    credentials.FINNHUB_API_KEY = fhKey;
  }

  // Check config file
  try {
    const { config } = await loadConfig();
    if (config.credentials.alphaVantage?.apiKey) {
      credentials.ALPHA_VANTAGE_API_KEY = config.credentials.alphaVantage.apiKey;
    }
    if (config.credentials.finnhub?.apiKey) {
      credentials.FINNHUB_API_KEY = config.credentials.finnhub.apiKey;
    }
  } catch {
    // Skip if config loading fails
  }

  return credentials;
}

/**
 * Encrypts credentials using a passphrase.
 * Uses base64 encoding with XOR (simple encryption for portability).
 */
async function encryptCredentials(
  credentials: Record<string, string>,
  passphrase: string,
): Promise<string> {
  const data = JSON.stringify(credentials);
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const keyBytes = encoder.encode(passphrase);

  // Simple XOR encryption
  const encrypted = new Uint8Array(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  // Encode as base64
  return btoa(String.fromCharCode(...encrypted));
}

/**
 * Decrypts credentials using a passphrase.
 */
function decryptCredentials(
  encrypted: string,
  passphrase: string,
): Record<string, string> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(passphrase);

  // Decode from base64
  const encryptedStr = atob(encrypted);
  const encryptedBytes = new Uint8Array(encryptedStr.length);
  for (let i = 0; i < encryptedStr.length; i++) {
    encryptedBytes[i] = encryptedStr.charCodeAt(i);
  }

  // Simple XOR decryption
  const decrypted = new Uint8Array(encryptedBytes.length);
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decrypted));
}

/**
 * Writes bundle to a file.
 *
 * @param bundle - Export bundle
 * @param outputPath - Output file path
 */
export async function writeBundleToFile(
  bundle: ExportBundle,
  outputPath: string,
): Promise<void> {
  const expandedPath = expandPath(outputPath);
  const content = JSON.stringify(bundle, null, 2);
  await Deno.writeTextFile(expandedPath, content);
}

/**
 * Reads bundle from a file.
 *
 * @param inputPath - Input file path
 * @returns Export bundle
 */
export async function readBundleFromFile(
  inputPath: string,
): Promise<ExportBundle> {
  const expandedPath = expandPath(inputPath);
  const content = await Deno.readTextFile(expandedPath);
  return JSON.parse(content);
}

/**
 * Import options.
 */
export interface ImportOptions {
  importConfig?: boolean;
  importPortfolio?: boolean;
  importAlerts?: boolean;
  importCredentials?: boolean;
  passphrase?: string;
  overwrite?: boolean;
}

/**
 * Import result.
 */
export interface ImportResult {
  configImported: boolean;
  portfolioImported: boolean;
  alertsImported: boolean;
  credentialsImported: boolean;
  warnings: string[];
}

/**
 * Imports data from a bundle.
 *
 * @param bundle - Export bundle to import
 * @param options - Import options
 * @returns Import result
 */
export async function importData(
  bundle: ExportBundle,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const {
    importConfig = true,
    importPortfolio = true,
    importAlerts = true,
    importCredentials = true,
    overwrite = false,
  } = options;

  const result: ImportResult = {
    configImported: false,
    portfolioImported: false,
    alertsImported: false,
    credentialsImported: false,
    warnings: [],
  };

  // Import configuration
  if (importConfig && bundle.data.config) {
    const configPath = expandPath(DEFAULT_PATHS.config);
    const exists = await fileExists(configPath);

    if (!exists || overwrite) {
      // Convert config to YAML-like format
      const yamlContent = configToYaml(bundle.data.config);
      await ensureDir(configPath);
      await Deno.writeTextFile(configPath, yamlContent);
      result.configImported = true;
    } else {
      result.warnings.push("Config file exists, skipping (use --overwrite to replace)");
    }
  }

  // Import portfolio
  if (importPortfolio && bundle.data.portfolio) {
    const portfolioPath = expandPath(DEFAULT_PATHS.portfolio);
    const exists = await fileExists(portfolioPath);

    if (!exists || overwrite) {
      await ensureDir(portfolioPath);
      await Deno.writeTextFile(portfolioPath, JSON.stringify(bundle.data.portfolio, null, 2));
      result.portfolioImported = true;
    } else {
      result.warnings.push("Portfolio file exists, skipping (use --overwrite to replace)");
    }
  }

  // Import alerts
  if (importAlerts && bundle.data.alerts) {
    const alertsPath = expandPath(DEFAULT_PATHS.alerts);
    const exists = await fileExists(alertsPath);

    if (!exists || overwrite) {
      const alertsData = {
        version: "1.0",
        alerts: bundle.data.alerts,
      };
      await ensureDir(alertsPath);
      await Deno.writeTextFile(alertsPath, JSON.stringify(alertsData, null, 2));
      result.alertsImported = true;
    } else {
      result.warnings.push("Alerts file exists, skipping (use --overwrite to replace)");
    }
  }

  // Import credentials
  if (importCredentials && bundle.credentials) {
    try {
      let credentials: Record<string, string>;

      if (bundle.credentials.encrypted) {
        if (!options.passphrase) {
          result.warnings.push("Credentials are encrypted but no passphrase provided");
        } else {
          credentials = decryptCredentials(bundle.credentials.data!, options.passphrase);
          writeCredentialsToEnvFile(credentials);
          result.credentialsImported = true;
        }
      } else if (bundle.credentials.data) {
        credentials = JSON.parse(bundle.credentials.data);
        writeCredentialsToEnvFile(credentials);
        result.credentialsImported = true;
      }
    } catch (err) {
      result.warnings.push(`Failed to import credentials: ${err}`);
    }
  }

  return result;
}

/**
 * Checks if a file exists.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures the directory for a file exists.
 */
async function ensureDir(filePath: string): Promise<void> {
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  await Deno.mkdir(dir, { recursive: true }).catch(() => {});
}

/**
 * Writes credentials to a .env file.
 */
async function writeCredentialsToEnvFile(
  credentials: Record<string, string>,
): Promise<void> {
  const envPath = expandPath("~/.fetch_quote/.env");
  await ensureDir(envPath);

  const lines = Object.entries(credentials)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  await Deno.writeTextFile(envPath, lines + "\n");
}

/**
 * Converts a config object to a simple YAML-like string.
 */
function configToYaml(config: Record<string, unknown>, indent = 0): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);

  for (const [key, value] of Object.entries(config)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      lines.push(configToYaml(value as Record<string, unknown>, indent + 1));
    } else if (Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      for (const item of value) {
        if (typeof item === "object") {
          lines.push(`${prefix}  -`);
          lines.push(configToYaml(item as Record<string, unknown>, indent + 2));
        } else {
          lines.push(`${prefix}  - ${item}`);
        }
      }
    } else {
      lines.push(`${prefix}${key}: ${value}`);
    }
  }

  return lines.join("\n");
}

/**
 * Gets export summary for display.
 */
export function getExportSummary(bundle: ExportBundle): string[] {
  const lines: string[] = [
    `Export Bundle v${bundle.version}`,
    `Exported: ${new Date(bundle.exportedAt).toLocaleString()}`,
    `From: ${bundle.exportedFrom}`,
    "",
    "Contents:",
  ];

  if (bundle.data.config) {
    lines.push("  - Configuration");
  }
  if (bundle.data.portfolio) {
    const portfolio = bundle.data.portfolio as { positions?: unknown[] };
    const posCount = portfolio.positions?.length || 0;
    lines.push(`  - Portfolio (${posCount} positions)`);
  }
  if (bundle.data.alerts) {
    lines.push(`  - Alerts (${bundle.data.alerts.length} rules)`);
  }
  if (bundle.credentials) {
    lines.push(`  - Credentials (${bundle.credentials.encrypted ? "encrypted" : "plain"})`);
  }

  return lines;
}
