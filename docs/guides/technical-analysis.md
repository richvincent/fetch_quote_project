# Technical Analysis Guide

fetch_quote provides several technical indicators to help analyze stock trends.

## Available Indicators

### RSI (Relative Strength Index)

The RSI measures the speed and magnitude of recent price changes to evaluate
overbought or oversold conditions.

**Usage:**

```bash
./fetch_quote.ts -t AAPL --rsi
# Or with all indicators:
./fetch_quote.ts -t AAPL --indicators
```

**Interpretation:**

| RSI Value | Signal                      |
| --------- | --------------------------- |
| < 30      | Oversold (potential buy)    |
| 30-70     | Neutral                     |
| > 70      | Overbought (potential sell) |

**Configuration:**

```yaml
indicators:
  rsi:
    period: 14 # Default period
    overbought: 70 # Overbought threshold
    oversold: 30 # Oversold threshold
```

### SMA (Simple Moving Average)

Moving averages smooth out price data to identify trend direction.

**Usage:**

```bash
./fetch_quote.ts -t AAPL --sma 50,200
```

**Key Signals:**

- **Golden Cross**: 50-day SMA crosses above 200-day SMA (bullish)
- **Death Cross**: 50-day SMA crosses below 200-day SMA (bearish)
- **Price Above SMA**: Generally bullish
- **Price Below SMA**: Generally bearish

**Configuration:**

```yaml
indicators:
  sma:
    periods: [50, 200]
```

### MACD (Moving Average Convergence Divergence)

MACD shows the relationship between two moving averages and helps identify
momentum changes.

**Usage:**

```bash
./fetch_quote.ts -t AAPL --macd
```

**Components:**

- **MACD Line**: 12-day EMA minus 26-day EMA
- **Signal Line**: 9-day EMA of MACD Line
- **Histogram**: Difference between MACD and Signal lines

**Interpretation:**

| Condition                 | Signal           |
| ------------------------- | ---------------- |
| MACD crosses above Signal | Bullish          |
| MACD crosses below Signal | Bearish          |
| Positive histogram        | Bullish momentum |
| Negative histogram        | Bearish momentum |

**Configuration:**

```yaml
indicators:
  macd:
    fast: 12
    slow: 26
    signal: 9
```

## Buy Zone Analysis

fetch_quote calculates buy and sell zones based on the 52-week high:

```
52-Week High: $200.00
Buy Zone: $186.00 - $180.00 (7% below high)
Sell Threshold: $184.00 (8% below high)
```

**Customize thresholds:**

```bash
./fetch_quote.ts -t AAPL --buy-pct 10 --sell-pct 5
```

## Combining Indicators

Use multiple indicators for confluence:

```bash
./fetch_quote.ts -t AAPL --indicators --chart
```

**Strong Buy Signal** (multiple bullish indicators):

- RSI < 30 (oversold)
- Price in buy zone
- Golden cross on SMA
- MACD histogram turning positive

**Strong Sell Signal** (multiple bearish indicators):

- RSI > 70 (overbought)
- Price below sell threshold
- Death cross on SMA
- MACD histogram turning negative

## JSON Output for Analysis

Export indicator data for external analysis:

```bash
./fetch_quote.ts -t AAPL --indicators --json | jq '.indicators'
```

Output:

```json
{
  "rsi": {
    "value": 58.3,
    "period": 14,
    "interpretation": "neutral"
  },
  "sma": [
    { "period": 50, "value": 182.45, "priceRelation": "above" },
    { "period": 200, "value": 175.20, "priceRelation": "above" }
  ],
  "macd": {
    "macdLine": 1.85,
    "signalLine": 1.42,
    "histogram": 0.43,
    "trend": "bullish"
  }
}
```

## Alerts Based on Indicators

Set alerts for indicator thresholds:

```bash
# Alert when RSI goes below 30
./fetch_quote.ts alert add AAPL rsi below 30

# Alert when RSI goes above 70
./fetch_quote.ts alert add AAPL rsi above 70
```

## Best Practices

1. **Never rely on a single indicator** - Use multiple for confirmation
2. **Consider market context** - Indicators work differently in trending vs.
   ranging markets
3. **Watch for divergences** - When price makes new highs but RSI doesn't, it
   may signal weakness
4. **Use appropriate timeframes** - Longer periods for trend, shorter for timing
