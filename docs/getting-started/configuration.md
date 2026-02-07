# Configuration

fetch_quote supports configuration through YAML files, environment variables, and CLI arguments.

## Configuration Priority

Settings are applied in this order (highest priority first):
1. CLI arguments
2. Environment variables
3. Configuration file
4. Default values

## Configuration File

### Location

fetch_quote looks for configuration files in this order:
1. `~/.fetch_quote.yaml`
2. `~/.fetch_quote.yml`
3. `~/.config/fetch_quote/config.yaml`
4. `~/.config/fetch_quote/config.yml`

### Creating a Config File

Generate a sample configuration:

```bash
./fetch_quote.ts config init
```

Or manually create `~/.fetch_quote.yaml`:

```yaml
# API credentials
credentials:
  alphaVantage:
    apiKey: your-api-key-here
    # Or use environment variable:
    # apiKey: ${ALPHA_VANTAGE_API_KEY}
  finnhub:
    apiKey: ${FINNHUB_API_KEY}

# Data provider settings
provider:
  default: alpha_vantage
  fallback: finnhub

# Cache settings
cache:
  enabled: true
  directory: ~/.cache/fetch_quote
  ttl:
    quote: 60        # seconds
    daily: 21600     # 6 hours
    news: 600        # 10 minutes

# Display settings
display:
  colorOutput: true
  chartHeight: 15
  chartDays: 180

# Trading parameters
trading:
  buyPct: 7
  sellPct: 8

# Technical indicators
indicators:
  sma:
    periods: [50, 200]
  rsi:
    period: 14
    overbought: 70
    oversold: 30
  macd:
    fast: 12
    slow: 26
    signal: 9

# Portfolio settings
portfolio:
  enabled: false
  file: ~/.fetch_quote/portfolio.json

# Alert settings
alerts:
  enabled: false
  file: ~/.fetch_quote/alerts.json
  checkInterval: 300    # 5 minutes
  defaultCooldown: 60   # minutes
  notifiers:
    console: true
    # ntfy:
    #   server: https://ntfy.sh
    #   topic: fetch-quote-alerts
    #   priority: high

# Watch mode settings
watch:
  interval: 60
  clearScreen: true
  sound: false

# Performance settings
performance:
  concurrency: 2

# Default watchlist
watchlist:
  - AAPL
  - MSFT
  - GOOGL
```

## Environment Variables

### API Keys

```bash
export ALPHA_VANTAGE_API_KEY="your-key"
export FINNHUB_API_KEY="your-key"
```

### Environment Variable Expansion

Use `${VAR}` syntax in config files:

```yaml
credentials:
  alphaVantage:
    apiKey: ${ALPHA_VANTAGE_API_KEY}
```

## CLI Overrides

### Trading Parameters

```bash
./fetch_quote.ts -t AAPL --buy-pct 10 --sell-pct 5
```

### Data Source

```bash
./fetch_quote.ts -t AAPL --source finnhub
```

### Cache Directory

```bash
./fetch_quote.ts -t AAPL --cache-dir /tmp/quote-cache
```

### Custom Config File

```bash
./fetch_quote.ts -t AAPL --config ~/custom-config.yaml
```

### Disable Config File

```bash
./fetch_quote.ts -t AAPL --no-config
```

## Viewing Current Configuration

```bash
./fetch_quote.ts config show
```

## Section Reference

### credentials

API credentials for data providers.

| Field | Type | Description |
|-------|------|-------------|
| `alphaVantage.apiKey` | string | Alpha Vantage API key |
| `alphaVantage.keyFile` | string | Path to file containing API key |
| `finnhub.apiKey` | string | Finnhub API key |

### provider

Data provider selection.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `default` | string | `alpha_vantage` | Primary provider |
| `fallback` | string | `finnhub` | Fallback provider |

### cache

Caching settings for API responses.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable response caching |
| `directory` | string | - | Cache directory path |
| `ttl.quote` | number | `60` | Quote cache TTL (seconds) |
| `ttl.daily` | number | `21600` | Daily data TTL (6 hours) |
| `ttl.news` | number | `600` | News TTL (10 minutes) |

### trading

Buy/sell analysis parameters.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `buyPct` | number | `7` | % below 52-week high for buy zone |
| `sellPct` | number | `8` | % below 52-week high for sell signal |

### indicators

Technical indicator parameters.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `sma.periods` | number[] | `[50, 200]` | SMA periods |
| `rsi.period` | number | `14` | RSI period |
| `rsi.overbought` | number | `70` | RSI overbought threshold |
| `rsi.oversold` | number | `30` | RSI oversold threshold |
| `macd.fast` | number | `12` | MACD fast EMA period |
| `macd.slow` | number | `26` | MACD slow EMA period |
| `macd.signal` | number | `9` | MACD signal line period |

### watch

Watch mode settings.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `interval` | number | `60` | Update interval (seconds) |
| `clearScreen` | boolean | `true` | Clear screen between updates |
| `sound` | boolean | `false` | Play sound on significant changes |
