/**
 * @fileoverview Portfolio storage and persistence.
 * @module portfolio/storage
 */

import type {
  Portfolio,
  PortfolioTransaction,
  Position,
} from "../core/types.ts";
import { expandPath } from "../utils/format.ts";

/**
 * Default portfolio file location.
 */
const DEFAULT_PORTFOLIO_PATH = "~/.fetch_quote/portfolio.json";

/**
 * Current portfolio schema version.
 */
const PORTFOLIO_VERSION = "1.0";

/**
 * Creates an empty portfolio.
 */
export function createEmptyPortfolio(): Portfolio {
  const now = new Date().toISOString();
  return {
    version: PORTFOLIO_VERSION,
    positions: [],
    transactions: [],
    createdAt: now,
    lastUpdated: now,
  };
}

/**
 * Loads a portfolio from disk.
 *
 * @param path - Path to portfolio file (optional, uses default)
 * @returns Portfolio or null if not found
 */
export async function loadPortfolio(path?: string): Promise<Portfolio | null> {
  const filePath = expandPath(path || DEFAULT_PORTFOLIO_PATH);

  try {
    const content = await Deno.readTextFile(filePath);
    const data = JSON.parse(content) as Portfolio;

    // Validate version
    if (!data.version) {
      data.version = PORTFOLIO_VERSION;
    }

    return data;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return null;
    }
    throw err;
  }
}

/**
 * Saves a portfolio to disk.
 *
 * @param portfolio - Portfolio to save
 * @param path - Path to save to (optional, uses default)
 */
export async function savePortfolio(
  portfolio: Portfolio,
  path?: string,
): Promise<void> {
  const filePath = expandPath(path || DEFAULT_PORTFOLIO_PATH);

  // Ensure directory exists
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  await Deno.mkdir(dir, { recursive: true }).catch(() => {});

  // Update last modified
  portfolio.lastUpdated = new Date().toISOString();

  const content = JSON.stringify(portfolio, null, 2);
  await Deno.writeTextFile(filePath, content);
}

/**
 * Generates a unique transaction ID.
 */
function generateTransactionId(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Adds shares to a position (or creates a new one).
 *
 * @param portfolio - Portfolio to modify
 * @param symbol - Stock symbol
 * @param shares - Number of shares to add
 * @param pricePerShare - Price per share
 * @param notes - Optional notes
 * @returns Updated portfolio
 */
export function addPosition(
  portfolio: Portfolio,
  symbol: string,
  shares: number,
  pricePerShare: number,
  notes?: string,
): Portfolio {
  const now = new Date().toISOString();
  const normalizedSymbol = symbol.toUpperCase();

  // Add transaction
  const transaction: PortfolioTransaction = {
    id: generateTransactionId(),
    symbol: normalizedSymbol,
    type: "buy",
    shares,
    pricePerShare,
    date: now,
    notes,
  };

  const newTransactions = [...portfolio.transactions, transaction];

  // Update or create position
  const existingIndex = portfolio.positions.findIndex(
    (p) => p.symbol === normalizedSymbol,
  );

  let newPositions: Position[];

  if (existingIndex >= 0) {
    // Update existing position
    const existing = portfolio.positions[existingIndex];
    const totalCost = existing.costBasis + shares * pricePerShare;
    const totalShares = existing.shares + shares;

    const updatedPosition: Position = {
      ...existing,
      shares: totalShares,
      costBasis: totalCost,
      avgCostPerShare: totalCost / totalShares,
      lastUpdated: now,
    };

    newPositions = [...portfolio.positions];
    newPositions[existingIndex] = updatedPosition;
  } else {
    // Create new position
    const newPosition: Position = {
      symbol: normalizedSymbol,
      shares,
      costBasis: shares * pricePerShare,
      avgCostPerShare: pricePerShare,
      addedAt: now,
      lastUpdated: now,
    };

    newPositions = [...portfolio.positions, newPosition];
  }

  return {
    ...portfolio,
    positions: newPositions,
    transactions: newTransactions,
    lastUpdated: now,
  };
}

/**
 * Removes shares from a position.
 *
 * @param portfolio - Portfolio to modify
 * @param symbol - Stock symbol
 * @param shares - Number of shares to remove
 * @param pricePerShare - Price per share (for transaction record)
 * @param notes - Optional notes
 * @returns Updated portfolio
 */
export function removePosition(
  portfolio: Portfolio,
  symbol: string,
  shares: number,
  pricePerShare: number,
  notes?: string,
): Portfolio {
  const now = new Date().toISOString();
  const normalizedSymbol = symbol.toUpperCase();

  const existingIndex = portfolio.positions.findIndex(
    (p) => p.symbol === normalizedSymbol,
  );

  if (existingIndex < 0) {
    throw new Error(`Position not found: ${normalizedSymbol}`);
  }

  const existing = portfolio.positions[existingIndex];

  if (shares > existing.shares) {
    throw new Error(
      `Cannot sell ${shares} shares of ${normalizedSymbol}, only ${existing.shares} owned`,
    );
  }

  // Add transaction
  const transaction: PortfolioTransaction = {
    id: generateTransactionId(),
    symbol: normalizedSymbol,
    type: "sell",
    shares,
    pricePerShare,
    date: now,
    notes,
  };

  const newTransactions = [...portfolio.transactions, transaction];

  // Update position
  let newPositions: Position[];
  const remainingShares = existing.shares - shares;

  if (remainingShares === 0) {
    // Remove position entirely
    newPositions = portfolio.positions.filter(
      (p) => p.symbol !== normalizedSymbol,
    );
  } else {
    // Update position
    const proportionSold = shares / existing.shares;
    const costBasisSold = existing.costBasis * proportionSold;

    const updatedPosition: Position = {
      ...existing,
      shares: remainingShares,
      costBasis: existing.costBasis - costBasisSold,
      lastUpdated: now,
    };

    newPositions = [...portfolio.positions];
    newPositions[existingIndex] = updatedPosition;
  }

  return {
    ...portfolio,
    positions: newPositions,
    transactions: newTransactions,
    lastUpdated: now,
  };
}

/**
 * Gets a position by symbol.
 *
 * @param portfolio - Portfolio to search
 * @param symbol - Stock symbol
 * @returns Position or null if not found
 */
export function getPosition(
  portfolio: Portfolio,
  symbol: string,
): Position | null {
  return (
    portfolio.positions.find(
      (p) => p.symbol === symbol.toUpperCase(),
    ) || null
  );
}

/**
 * Gets transactions for a symbol.
 *
 * @param portfolio - Portfolio to search
 * @param symbol - Stock symbol (optional, returns all if not provided)
 * @returns Array of transactions
 */
export function getTransactions(
  portfolio: Portfolio,
  symbol?: string,
): PortfolioTransaction[] {
  if (!symbol) {
    return [...portfolio.transactions];
  }

  const normalizedSymbol = symbol.toUpperCase();
  return portfolio.transactions.filter(
    (t) => t.symbol === normalizedSymbol,
  );
}

/**
 * Lists all symbols in the portfolio.
 */
export function listSymbols(portfolio: Portfolio): string[] {
  return portfolio.positions.map((p) => p.symbol);
}
