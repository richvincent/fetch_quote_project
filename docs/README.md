# fetch_quote Documentation

Welcome to the fetch_quote documentation. This CLI tool provides real-time stock quotes, technical analysis, portfolio tracking, and price alerts.

## Quick Links

- [Installation](getting-started/installation.md) - Get started in minutes
- [Quick Start](getting-started/quickstart.md) - Your first commands
- [Configuration](getting-started/configuration.md) - Customize behavior
- [CLI Reference](reference/cli-reference.md) - Complete command reference

## Features

### Core Features
- **Real-time Quotes** - Fetch current stock prices with change data
- **Multiple Data Sources** - Alpha Vantage and Finnhub support
- **JSON Output** - Machine-readable output for scripting
- **Watch Mode** - Continuous price monitoring

### Analysis Features
- **Technical Indicators** - RSI, SMA, MACD calculations
- **Price Charts** - ASCII chart visualization
- **Buy/Sell Signals** - Based on 52-week high analysis

### Portfolio Features
- **Portfolio Tracking** - Track positions and P&L
- **Price Alerts** - Get notified on price changes
- **Export/Import** - Migrate data between machines

## Documentation Structure

```
docs/
├── getting-started/
│   ├── installation.md     # Installing fetch_quote
│   ├── quickstart.md       # First commands
│   └── configuration.md    # Config file setup
├── guides/
│   ├── technical-analysis.md
│   ├── portfolio-tracking.md
│   ├── alerts.md
│   └── watch-mode.md
├── reference/
│   └── cli-reference.md    # Complete CLI docs
└── architecture/
    └── overview.md         # System design
```

## Getting Help

- **CLI Help**: Run `./fetch_quote.ts --help`
- **Issues**: [GitHub Issues](https://github.com/yourusername/fetch_quote/issues)

## License

MIT License - See [LICENSE](../LICENSE) for details.
