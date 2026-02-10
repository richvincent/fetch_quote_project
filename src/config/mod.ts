/**
 * @fileoverview Configuration module exports.
 * @module config
 */

export * from "./types.ts";
export { DEFAULT_CONFIG, generateSampleConfig } from "./defaults.ts";
export {
  formatConfig,
  initConfig,
  loadConfig,
  type LoadConfigResult,
  validateConfig,
} from "./loader.ts";
