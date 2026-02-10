/**
 * @fileoverview Portfolio value calculations and P&L.
 * @module portfolio/calculator
 */

import type {
  Portfolio,
  PortfolioSummary,
  Position,
  PositionWithQuote,
  Quote,
} from "../core/types.ts";

/**
 * Calculates current value and P&L for a single position.
 *
 * @param position - Position to calculate
 * @param quote - Current quote data
 * @returns Position with calculated values
 */
export function calculatePositionValue(
  position: Position,
  quote: Quote,
): PositionWithQuote {
  const currentValue = position.shares * quote.price;
  const gainLoss = currentValue - position.costBasis;
  const gainLossPercent = position.costBasis > 0
    ? (gainLoss / position.costBasis) * 100
    : 0;

  // Day change is based on previous close
  const previousValue = position.shares * quote.previousClose;
  const dayChange = currentValue - previousValue;
  const dayChangePercent = previousValue > 0
    ? (dayChange / previousValue) * 100
    : 0;

  return {
    ...position,
    currentPrice: quote.price,
    currentValue,
    gainLoss,
    gainLossPercent,
    dayChange,
    dayChangePercent,
  };
}

/**
 * Calculates complete portfolio summary with all position values.
 *
 * @param portfolio - Portfolio to calculate
 * @param quotes - Map of symbol to quote data
 * @returns Portfolio summary with all calculations
 */
export function calculatePortfolioSummary(
  portfolio: Portfolio,
  quotes: Map<string, Quote>,
): PortfolioSummary {
  const positions: PositionWithQuote[] = [];
  let totalValue = 0;
  let totalCost = 0;
  let previousTotalValue = 0;

  for (const position of portfolio.positions) {
    const quote = quotes.get(position.symbol);

    if (quote) {
      const positionWithQuote = calculatePositionValue(position, quote);
      positions.push(positionWithQuote);

      totalValue += positionWithQuote.currentValue;
      totalCost += position.costBasis;
      previousTotalValue += position.shares * quote.previousClose;
    } else {
      // No quote available, use position data only
      positions.push({
        ...position,
        currentPrice: 0,
        currentValue: 0,
        gainLoss: -position.costBasis,
        gainLossPercent: -100,
        dayChange: 0,
        dayChangePercent: 0,
      });
      totalCost += position.costBasis;
    }
  }

  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0
    ? (totalGainLoss / totalCost) * 100
    : 0;

  const dayChange = totalValue - previousTotalValue;
  const dayChangePercent = previousTotalValue > 0
    ? (dayChange / previousTotalValue) * 100
    : 0;

  return {
    positions,
    totalValue,
    totalCost,
    totalGainLoss,
    totalGainLossPercent,
    dayChange,
    dayChangePercent,
  };
}

/**
 * Calculates portfolio allocation percentages.
 *
 * @param positions - Positions with quote data
 * @returns Map of symbol to allocation percentage
 */
export function calculateAllocation(
  positions: PositionWithQuote[],
): Map<string, number> {
  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const allocation = new Map<string, number>();

  for (const position of positions) {
    const percent = totalValue > 0
      ? (position.currentValue / totalValue) * 100
      : 0;
    allocation.set(position.symbol, percent);
  }

  return allocation;
}

/**
 * Finds the best and worst performing positions.
 *
 * @param positions - Positions with quote data
 * @returns Object with best and worst positions
 */
export function findTopPerformers(
  positions: PositionWithQuote[],
): { best: PositionWithQuote | null; worst: PositionWithQuote | null } {
  if (positions.length === 0) {
    return { best: null, worst: null };
  }

  const sorted = [...positions].sort(
    (a, b) => b.gainLossPercent - a.gainLossPercent,
  );

  return {
    best: sorted[0],
    worst: sorted[sorted.length - 1],
  };
}

/**
 * Calculates realized gains from closed positions (sold shares).
 *
 * @param portfolio - Portfolio with transaction history
 * @param getHistoricalPrice - Function to get historical price (optional)
 * @returns Total realized gains/losses
 */
export function calculateRealizedGains(
  portfolio: Portfolio,
): number {
  let realizedGains = 0;

  // Group transactions by symbol
  const transactionsBySymbol = new Map<string, typeof portfolio.transactions>();

  for (const txn of portfolio.transactions) {
    const existing = transactionsBySymbol.get(txn.symbol) || [];
    existing.push(txn);
    transactionsBySymbol.set(txn.symbol, existing);
  }

  // Calculate realized gains for each symbol using FIFO
  for (const [_symbol, txns] of transactionsBySymbol) {
    const buyLots: Array<{ shares: number; price: number }> = [];

    for (const txn of txns) {
      if (txn.type === "buy") {
        buyLots.push({ shares: txn.shares, price: txn.pricePerShare });
      } else {
        // Sell - match against oldest buys (FIFO)
        let sharesToSell = txn.shares;

        while (sharesToSell > 0 && buyLots.length > 0) {
          const oldestLot = buyLots[0];

          const sharesToMatch = Math.min(sharesToSell, oldestLot.shares);
          const costBasis = sharesToMatch * oldestLot.price;
          const proceeds = sharesToMatch * txn.pricePerShare;

          realizedGains += proceeds - costBasis;
          sharesToSell -= sharesToMatch;
          oldestLot.shares -= sharesToMatch;

          if (oldestLot.shares === 0) {
            buyLots.shift();
          }
        }
      }
    }
  }

  return realizedGains;
}

/**
 * Calculates unrealized gains from current positions.
 *
 * @param summary - Portfolio summary with current values
 * @returns Total unrealized gains/losses
 */
export function calculateUnrealizedGains(
  summary: PortfolioSummary,
): number {
  return summary.totalGainLoss;
}
