#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read
/**
 * @fileoverview Main entry point for fetch_quote CLI.
 *
 * This is the modular version of the fetch_quote tool.
 * During the transition, the original fetch_quote.ts remains functional.
 *
 * @license MIT
 * @author Richard Vincent
 * @version 0.3.0
 */

import { VERSION } from "./core/constants.ts";

// Placeholder main - will be populated as modules are extracted
async function main(): Promise<void> {
  console.log(`fetch_quote v${VERSION}`);
  console.log("Modular version - under development");
  console.log("\nFor now, use the original: ./fetch_quote.ts");
}

if (import.meta.main) {
  await main();
}
