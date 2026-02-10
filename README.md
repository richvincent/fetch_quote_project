# Fetch Quote

A powerful CLI tool for real-time stock quotes, technical analysis, portfolio
tracking, and price alerts.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Deno](https://img.shields.io/badge/deno-1.x-informational)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)

## Features

- **Real-time Stock Quotes** - Current price, volume, and daily change
- **Technical Indicators** - RSI, SMA, MACD with configurable parameters
- **Price Charts** - ASCII charts with automatic terminal detection
- **Buy/Sell Signals** - Based on 52-week high analysis
- **Watch Mode** - Continuous price monitoring
- **Portfolio Tracking** - Track positions and P&L
- **Price Alerts** - Notifications via console, NTFY, Slack, Discord
- **Multiple Data Sources** - Alpha Vantage and Finnhub support
- **JSON Output** - Machine-readable output for scripting
- **YAML Configuration** - Flexible configuration file support

## Quick Start

### Prerequisites

- [Deno](https://deno.land/) v1.40+
- [Alpha Vantage API key](https://www.alphavantage.co/support/#api-key) (free)

### Installation

```bash
git clone https://github.com/richvincent/fetch_quote_project.git
cd fetch_quote_project
export ALPHA_VANTAGE_API_KEY="your_api_key_here"
chmod +x fetch_quote.ts
```

### Basic Usage

```bash
# Single quote
./fetch_quote.ts -t AAPL

# Multiple tickers with chart
./fetch_quote.ts -t AAPL,MSFT,GOOGL --chart

# All indicators
./fetch_quote.ts -t AAPL --indicators

# Watch mode
./fetch_quote.ts -t AAPL --watch --interval 30

# JSON output
./fetch_quote.ts -t AAPL --json | jq '.quote.price'
```

### Sample Output

```
AAPL (Apple Inc.)
  Price: $185.50 (+1.25, +0.68%)
  Volume: 45,234,567 (+15% vs 30d avg)

  52-Week High: $199.62
  Buy Zone: $185.65 - $178.87
  Sell Threshold: $183.65

  Signal: HOLD

Technical Indicators:
  RSI(14): 58.3 (neutral)
  SMA(50): $182.45 (price above)
  SMA(200): $175.20 (price above)
  MACD: 1.85 / 1.42 / +0.43 (bullish)
```

## Documentation

Full documentation is available in the `docs/` directory:

- **[Getting Started](docs/getting-started/installation.md)** - Installation and
  setup
- **[Quick Start](docs/getting-started/quickstart.md)** - Essential commands
- **[Configuration](docs/getting-started/configuration.md)** - YAML config
  reference
- **[CLI Reference](docs/reference/cli-reference.md)** - Complete command
  reference

### Feature Guides

- **[Technical Analysis](docs/guides/technical-analysis.md)** - RSI, SMA, MACD
  usage
- **[Portfolio Tracking](docs/guides/portfolio-tracking.md)** - Managing
  positions
- **[Alerts](docs/guides/alerts.md)** - Setting up notifications
- **[Watch Mode](docs/guides/watch-mode.md)** - Continuous monitoring

### Architecture

- **[System Overview](docs/architecture/overview.md)** - Modular design

## Configuration

Create `~/.fetch_quote.yaml`:

```yaml
credentials:
  alphaVantage:
    apiKey: ${ALPHA_VANTAGE_API_KEY}
  finnhub:
    apiKey: ${FINNHUB_API_KEY}

provider:
  default: alpha_vantage
  fallback: finnhub

cache:
  enabled: true
  directory: ~/.cache/fetch_quote

trading:
  buyPct: 7
  sellPct: 8

indicators:
  sma:
    periods: [50, 200]
  rsi:
    period: 14

watchlist:
  - AAPL
  - MSFT
  - GOOGL
```

## Project Structure

```
fetch_quote_project/
├── src/
│   ├── core/           # Types and constants
│   ├── config/         # Configuration management
│   ├── providers/      # Data providers
│   ├── cache/          # Caching layer
│   ├── indicators/     # Technical indicators
│   ├── portfolio/      # Portfolio tracking
│   ├── alerts/         # Alert system
│   └── output/         # Output formatters
├── tests/              # Test suite (52 tests)
├── docs/               # Documentation
├── fetch_quote.ts      # Entry point
├── CHANGELOG.md        # Version history
└── CONTRIBUTING.md     # Contribution guide
```

## Development

```bash
# Run tests
deno task test

# Type check
deno check src/main.ts

# Format code
deno fmt
```

## API Rate Limits

| Provider      | Free Tier Limit |
| ------------- | --------------- |
| Alpha Vantage | 25 calls/day    |
| Finnhub       | 60 calls/minute |

Enable caching to reduce API calls:

```bash
./fetch_quote.ts -t AAPL --cache-dir ~/.cache/fetch_quote
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Acknowledgments

- Market data: [Alpha Vantage](https://www.alphavantage.co),
  [Finnhub](https://finnhub.io)
- Runtime: [Deno](https://deno.land/)
