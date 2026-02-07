/**
 * @fileoverview Portfolio module exports.
 * @module portfolio
 */

export {
  createEmptyPortfolio,
  loadPortfolio,
  savePortfolio,
  addPosition,
  removePosition,
  getPosition,
  getTransactions,
  listSymbols,
} from "./storage.ts";

export {
  calculatePositionValue,
  calculatePortfolioSummary,
  calculateAllocation,
  findTopPerformers,
  calculateRealizedGains,
  calculateUnrealizedGains,
} from "./calculator.ts";

// Re-export types from core
export type {
  Portfolio,
  Position,
  PortfolioTransaction,
  PositionWithQuote,
  PortfolioSummary,
} from "../core/types.ts";
