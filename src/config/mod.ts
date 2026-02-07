/**
 * @fileoverview Configuration module exports.
 * @module config
 */

export * from "./types.ts";
export { DEFAULT_CONFIG, generateSampleConfig } from "./defaults.ts";
export {
  loadConfig,
  initConfig,
  formatConfig,
  validateConfig,
  type LoadConfigResult,
} from "./loader.ts";
