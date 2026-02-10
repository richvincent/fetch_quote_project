/**
 * @fileoverview Portfolio module exports.
 * @module portfolio
 */

export {
  addPosition,
  createEmptyPortfolio,
  getPosition,
  getTransactions,
  listSymbols,
  loadPortfolio,
  removePosition,
  savePortfolio,
} from "./storage.ts";

export {
  calculateAllocation,
  calculatePortfolioSummary,
  calculatePositionValue,
  calculateRealizedGains,
  calculateUnrealizedGains,
  findTopPerformers,
} from "./calculator.ts";

// Re-export types from core
export type {
  Portfolio,
  PortfolioSummary,
  PortfolioTransaction,
  Position,
  PositionWithQuote,
} from "../core/types.ts";
