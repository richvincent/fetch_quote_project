/**
 * @fileoverview Configuration loader with YAML support.
 * @module config/loader
 */

import { parse as parseYaml } from "@std/yaml";
import { expandPath } from "../utils/format.ts";
import type { AppConfig, CLIArgs, PartialConfig } from "./types.ts";
import { DEFAULT_CONFIG, generateSampleConfig } from "./defaults.ts";

/**
 * Default configuration file paths (in priority order).
 */
const CONFIG_PATHS = [
  "~/.fetch_quote.yaml",
  "~/.fetch_quote.yml",
  "~/.config/fetch_quote/config.yaml",
  "~/.config/fetch_quote/config.yml",
];

/**
 * Deep merges two objects, with override values taking precedence.
 */
function deepMerge(
  base: AppConfig,
  override: PartialConfig,
): AppConfig {
  const result = { ...base } as Record<string, unknown>;

  for (const key of Object.keys(override) as Array<keyof PartialConfig>) {
    const baseValue = base[key];
    const overrideValue = override[key];

    if (
      overrideValue !== undefined &&
      typeof baseValue === "object" &&
      baseValue !== null &&
      !Array.isArray(baseValue) &&
      typeof overrideValue === "object" &&
      overrideValue !== null &&
      !Array.isArray(overrideValue)
    ) {
      // Recursively merge nested objects
      result[key] = {
        ...baseValue as Record<string, unknown>,
        ...overrideValue as Record<string, unknown>,
      };
    } else if (overrideValue !== undefined) {
      result[key] = overrideValue;
    }
  }

  return result as unknown as AppConfig;
}

/**
 * Expands environment variables in a string.
 * Supports ${VAR} and $VAR syntax.
 */
function expandEnvVars(value: string): string {
  return value.replace(
    /\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/gi,
    (_, braced, unbraced) => {
      const varName = braced || unbraced;
      return Deno.env.get(varName) || "";
    },
  );
}

/**
 * Recursively expands environment variables in an object.
 */
function expandEnvVarsInObject(obj: unknown): unknown {
  if (typeof obj === "string") {
    return expandEnvVars(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(expandEnvVarsInObject);
  }
  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = expandEnvVarsInObject(value);
    }
    return result;
  }
  return obj;
}

/**
 * Reads and parses a YAML configuration file.
 */
async function readConfigFile(path: string): Promise<PartialConfig | null> {
  const expandedPath = expandPath(path);
  try {
    const content = await Deno.readTextFile(expandedPath);
    const parsed = parseYaml(content) as PartialConfig;
    return expandEnvVarsInObject(parsed) as PartialConfig;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return null;
    }
    throw err;
  }
}

/**
 * Finds and loads the first existing config file.
 */
async function findConfigFile(): Promise<
  { path: string; config: PartialConfig } | null
> {
  for (const path of CONFIG_PATHS) {
    const config = await readConfigFile(path);
    if (config !== null) {
      return { path, config };
    }
  }
  return null;
}

/**
 * Loads configuration from environment variables.
 */
function loadEnvConfig(): PartialConfig {
  const config: PartialConfig = {
    credentials: {},
  };

  const avKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
  if (avKey) {
    config.credentials!.alphaVantage = { apiKey: avKey };
  }

  const fhKey = Deno.env.get("FINNHUB_API_KEY");
  if (fhKey) {
    config.credentials!.finnhub = { apiKey: fhKey };
  }

  return config;
}

/**
 * Converts CLI arguments to partial config.
 */
function cliArgsToConfig(args: CLIArgs): PartialConfig {
  const config: PartialConfig = {};

  if (args.buyPct !== undefined || args.sellPct !== undefined) {
    config.trading = {};
    if (args.buyPct !== undefined) config.trading.buyPct = args.buyPct;
    if (args.sellPct !== undefined) config.trading.sellPct = args.sellPct;
  }

  if (args.concurrency !== undefined) {
    config.performance = { concurrency: args.concurrency };
  }

  if (args.cacheDir !== undefined) {
    config.cache = {
      enabled: true,
      directory: args.cacheDir,
    };
  }

  if (args.interval !== undefined) {
    config.watch = { interval: args.interval } as PartialConfig["watch"];
  }

  if (args.source !== undefined) {
    const source = args.source as "alpha_vantage" | "finnhub";
    config.provider = { default: source };
  }

  return config;
}

/**
 * Configuration loader result.
 */
export interface LoadConfigResult {
  config: AppConfig;
  configPath: string | null;
  warnings: string[];
}

/**
 * Loads configuration from all sources and merges them.
 * Priority: CLI args > env vars > config file > defaults
 */
export async function loadConfig(
  args: CLIArgs = {},
): Promise<LoadConfigResult> {
  const warnings: string[] = [];
  let configPath: string | null = null;

  // Start with defaults
  let config: AppConfig = { ...DEFAULT_CONFIG };

  // Load from config file (unless --no-config)
  if (!args.noConfig) {
    let fileConfig: PartialConfig | null = null;

    if (args.config) {
      // Explicit config file path
      fileConfig = await readConfigFile(args.config);
      if (fileConfig) {
        configPath = args.config;
      } else {
        warnings.push(`Config file not found: ${args.config}`);
      }
    } else {
      // Search default paths
      const found = await findConfigFile();
      if (found) {
        fileConfig = found.config;
        configPath = found.path;
      }
    }

    if (fileConfig) {
      config = deepMerge(config, fileConfig);
    }
  }

  // Load from environment variables
  const envConfig = loadEnvConfig();
  config = deepMerge(config, envConfig);

  // Load from CLI arguments (highest priority)
  const cliConfig = cliArgsToConfig(args);
  config = deepMerge(config, cliConfig);

  return { config, configPath, warnings };
}

/**
 * Initializes a configuration file at the default location.
 */
export async function initConfig(path?: string): Promise<string> {
  const configPath = expandPath(path || CONFIG_PATHS[0]);
  const content = generateSampleConfig();

  // Ensure directory exists
  const dir = configPath.substring(0, configPath.lastIndexOf("/"));
  await Deno.mkdir(dir, { recursive: true }).catch(() => {});

  await Deno.writeTextFile(configPath, content);
  return configPath;
}

/**
 * Shows the current merged configuration.
 */
export function formatConfig(config: AppConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Validates configuration and returns warnings.
 */
export function validateConfig(config: AppConfig): string[] {
  const warnings: string[] = [];

  // Check API keys
  if (!config.credentials.alphaVantage?.apiKey) {
    warnings.push("No Alpha Vantage API key configured");
  }

  // Check trading parameters
  if (config.trading.sellPct <= config.trading.buyPct) {
    warnings.push("sell-pct should be greater than buy-pct");
  }

  // Check watch interval
  if (config.watch.interval < 15) {
    warnings.push("Watch interval should be at least 15 seconds");
  }

  return warnings;
}
