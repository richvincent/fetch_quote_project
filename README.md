# Fetch Quote

A fast, command-line tool for retrieving real-time stock market data, technical analysis, and financial news using the Alpha Vantage API.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Deno](https://img.shields.io/badge/deno-1.x-informational)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)

## Features

- 📈 **Real-time Stock Quotes** - Current price, volume, and daily change
- 📊 **Technical Analysis** - 52-week high (split-adjusted), 30-day average volume
- 🎯 **Buy/Sell Signals** - Configurable thresholds based on 52-week high
- 📰 **Financial News** - Ticker-specific and general market headlines
- ⚡ **High Performance** - Parallel API fetching and optional caching
- 🔄 **Smart Retry Logic** - Exponential backoff with rate limit detection
- 🎨 **Color-coded Output** - Easy-to-read terminal display
- 🔧 **Configurable** - Customizable buy/sell zones and concurrency

## Installation

### Prerequisites

- [Deno](https://deno.land/) runtime (v1.x or higher)
- Alpha Vantage API key ([get one free here](https://www.alphavantage.co/support/#api-key))

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/richvincent/fetch_quote_project.git
   cd fetch_quote_project
   ```

2. **Set up your API key** (choose one option):

   **Option 1:** Environment variable (recommended)
   ```bash
   export ALPHA_VANTAGE_API_KEY="your_api_key_here"
   ```

   **Option 2:** Save to file
   ```bash
   echo "your_api_key_here" > alpha_vantage_api_key.txt
   ```

3. **Make the script executable:**
   ```bash
   chmod +x fetch_quote.ts
   ```

4. **Run it:**
   ```bash
   ./fetch_quote.ts -t AAPL
   ```

## Usage

### Basic Syntax

```bash
./fetch_quote.ts [options] [TICKERS...]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-t, --ticker <LIST>` | Comma-separated ticker symbols (e.g., AAPL,MSFT,GOOGL) | - |
| `--buy-pct <N>` | Buy zone percentage below 52-week high | 7 |
| `--sell-pct <N>` | Sell threshold percentage below 52-week high | 8 |
| `--news` | Include ticker-specific news headlines | false |
| `--top-news` | Show general market headlines only | false |
| `-c, --concurrency <N>` | Process N tickers in parallel | 2 |
| `--cache-dir <PATH>` | Enable JSON caching at specified path | disabled |
| `-h, --help` | Display help message | - |

## Examples

### Single Ticker Quote
```bash
./fetch_quote.ts -t AAPL
```

**Output:**
```
=== AAPL ===
Price: $178.25 +$2.15 (+1.22%) on 2025-01-08
52w High (adj): $199.62
Buy Zone: $185.65 .. $199.62 (7.0%)
Sell if < $183.65 (8.0%)
BUY
Vol: 58,234,567 vs 30d avg 52,345,678 (+11.3%)
```

### Multiple Tickers with News
```bash
./fetch_quote.ts -t AAPL,MSFT,GOOGL --news --concurrency 3
```

### Custom Buy/Sell Thresholds
```bash
./fetch_quote.ts -t NVDA --buy-pct 10 --sell-pct 12
```

### Market Headlines Only
```bash
./fetch_quote.ts --top-news
```

### With Caching (Requires --allow-read/--allow-write)
```bash
deno run --allow-net --allow-env --allow-read --allow-write fetch_quote.ts \
  -t TSLA --cache-dir ./market_cache
```

## How It Works

### Buy/Sell Signal Logic

The tool calculates trading signals based on the stock's position relative to its 52-week high:

- **BUY**: Price is within the buy zone (between `52w high × (1 - buy-pct%)` and `52w high`)
- **SELL**: Price falls below the sell threshold (`52w high × (1 - sell-pct%)`)
- **No signal**: Price is outside both zones (neutral)

**Example with defaults (buy-pct=7%, sell-pct=8%):**
- 52-week high: $100
- Buy zone: $93.00 - $100.00
- Sell threshold: Below $92.00

### Technical Calculations

- **52-week High**: Automatically adjusted for stock splits using Alpha Vantage's adjusted close data
- **30-day Average Volume**: Computed from the most recent 30 trading days
- **Volume Comparison**: Shows percentage difference from 30-day average (color-coded)

### Performance Optimizations

1. **Parallel Fetching**: Quote, daily data, and news are fetched concurrently (2-3x faster)
2. **Concurrency Control**: Process multiple tickers in parallel with configurable limit
3. **Smart Caching**: Optional file-based cache with TTL to reduce API calls
4. **Retry Logic**: Exponential backoff with jitter handles rate limits gracefully

## Caching

Enable caching to reduce API calls and improve performance:

```bash
# Create cache directory
mkdir -p ./cache

# Run with cache enabled
deno run --allow-net --allow-env --allow-read --allow-write fetch_quote.ts \
  -t AAPL --cache-dir ./cache
```

**Cache TTLs:**
- Quote data: 60 seconds
- Daily historical data: 6 hours
- News: 10 minutes

## API Rate Limits

Alpha Vantage free tier limits:
- 25 API calls per day (standard free key)
- 5 API calls per minute

**Tips to stay within limits:**
- Use `--cache-dir` to cache responses
- Reduce `--concurrency` to avoid hitting per-minute limits
- The tool automatically retries with exponential backoff on rate limit errors

## Architecture

### Type Safety

The project uses TypeScript with strict type checking:
- `GlobalQuoteResp` - Real-time quote data
- `DailyResp` - Historical daily time series
- `NewsResp` - News sentiment feed
- `AVErrorResponse` - API error handling

### Error Handling

- Exponential backoff with jitter for failed requests
- Alpha Vantage soft-limit detection
- Graceful degradation when cache permissions missing
- Helpful error messages with actionable tips

## Development

### Type Checking

```bash
deno check fetch_quote.ts
```

### Code Structure

```
fetch_quote_project/
├── fetch_quote.ts          # Main application (production-ready)
├── archive/
│   └── fetch_pltr.ts      # Legacy version (reference only)
├── LICENSE                 # MIT License
├── README.md              # This file
└── .gitignore             # Excludes API keys and sensitive files
```

### Configuration

All defaults are defined in the `CONFIG` constant:

```typescript
const CONFIG = {
  DEFAULT_BUY_PCT: 7,
  DEFAULT_SELL_PCT: 8,
  DEFAULT_CONCURRENCY: 2,
  // ... more settings
} as const;
```

## Troubleshooting

### "Missing ALPHA_VANTAGE_API_KEY"

Set your API key using one of these methods:
```bash
# Option 1: Environment variable
export ALPHA_VANTAGE_API_KEY="your_key"

# Option 2: File
echo "your_key" > alpha_vantage_api_key.txt
```

### "Cache disabled: missing permissions"

Run with read/write permissions:
```bash
deno run --allow-net --allow-env --allow-read --allow-write fetch_quote.ts [options]
```

### Rate Limit Errors (429)

- Enable caching: `--cache-dir ./cache`
- Reduce concurrency: `--concurrency 1`
- Wait between requests (the tool retries automatically)

## Permissions

The script requires these Deno permissions:

| Permission | Required? | Purpose |
|------------|-----------|---------|
| `--allow-net` | **Yes** | Fetch data from Alpha Vantage API |
| `--allow-env` | **Yes** | Read ALPHA_VANTAGE_API_KEY environment variable |
| `--allow-read` | Optional | Read API key file and cache |
| `--allow-write` | Optional | Write cache files |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright © 2025 Richard Vincent

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Ideas for Future Features

- [ ] Support for cryptocurrency quotes
- [ ] Export data to CSV/JSON
- [ ] Technical indicators (RSI, MACD, Bollinger Bands)
- [ ] Portfolio tracking
- [ ] Price alerts
- [ ] Chart generation

## Acknowledgments

- Market data provided by [Alpha Vantage](https://www.alphavantage.co)
- Built with [Deno](https://deno.land/) runtime

## Links

- **Repository**: https://github.com/richvincent/fetch_quote_project
- **Alpha Vantage API**: https://www.alphavantage.co/documentation/
- **Deno Documentation**: https://deno.land/manual

---

**⭐ If you find this tool useful, please consider starring the repository!**
