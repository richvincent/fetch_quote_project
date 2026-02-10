# Quick Start Guide

This guide covers the essential commands to get started with fetch_quote.

## Basic Usage

### Fetch a Single Quote

```bash
./fetch_quote.ts -t AAPL
```

Output:

```
AAPL (Apple Inc.)
  Price: $185.50 (+1.25, +0.68%)
  Volume: 45,234,567 (+15% vs 30d avg)

  52-Week High: $199.62
  Buy Zone: $185.65 - $178.87
  Sell Threshold: $183.65

  Signal: HOLD
```

### Multiple Tickers

```bash
./fetch_quote.ts -t AAPL,MSFT,GOOGL
```

## Adding Features

### Show Price Chart

```bash
./fetch_quote.ts -t AAPL --chart
```

### Show Technical Indicators

```bash
./fetch_quote.ts -t AAPL --indicators
```

Output includes:

- RSI (Relative Strength Index)
- SMA (Simple Moving Average) - 50 and 200 day
- MACD (Moving Average Convergence Divergence)

### Get News

```bash
./fetch_quote.ts -t AAPL --news
```

### Combined View

```bash
./fetch_quote.ts -t AAPL --chart --indicators --news
```

## Output Formats

### JSON Output

For scripting and automation:

```bash
./fetch_quote.ts -t AAPL --json
```

### Pretty JSON

```bash
./fetch_quote.ts -t AAPL --json --pretty
```

### Pipe to jq

```bash
./fetch_quote.ts -t AAPL --json | jq '.quote.price'
```

## Watch Mode

Continuously monitor prices:

```bash
./fetch_quote.ts -t AAPL --watch
```

With custom interval (in seconds):

```bash
./fetch_quote.ts -t AAPL --watch --interval 30
```

## Customizing Analysis

### Adjust Buy/Sell Thresholds

```bash
# Buy zone at 10% below 52-week high
./fetch_quote.ts -t AAPL --buy-pct 10

# Sell threshold at 5% below 52-week high
./fetch_quote.ts -t AAPL --sell-pct 5
```

## Common Workflows

### Morning Market Check

```bash
./fetch_quote.ts -t AAPL,MSFT,GOOGL,AMZN --indicators
```

### Portfolio Quick View

```bash
./fetch_quote.ts portfolio show
```

### Set Price Alert

```bash
./fetch_quote.ts alert add AAPL above 200
```

## Next Steps

- [Configuration](configuration.md) - Customize default settings
- [Technical Analysis Guide](../guides/technical-analysis.md) - Deep dive into
  indicators
- [Portfolio Tracking](../guides/portfolio-tracking.md) - Track your investments
