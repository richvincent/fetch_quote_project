# CLI Reference

Complete reference for all fetch_quote commands and options.

## Synopsis

```
./fetch_quote.ts [options] [command]
./fetch_quote.ts -t <tickers> [quote-options]
```

## Global Options

| Option | Description |
|--------|-------------|
| `--help, -h` | Show help |
| `--version, -v` | Show version |
| `--config <path>` | Use custom config file |
| `--no-config` | Ignore config file |
| `--json` | Output in JSON format |
| `--pretty` | Pretty-print JSON output |

## Quote Command (Default)

Fetch stock quotes and analysis.

### Usage

```bash
./fetch_quote.ts -t AAPL [options]
./fetch_quote.ts -t AAPL,MSFT,GOOGL [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-t, --ticker <symbols>` | Stock symbol(s), comma-separated | Required |
| `--buy-pct <number>` | Buy zone percentage below 52-week high | 7 |
| `--sell-pct <number>` | Sell threshold percentage | 8 |
| `--source <provider>` | Data source: `alpha_vantage`, `finnhub` | Config default |
| `--concurrency <number>` | Parallel requests for multiple tickers | 2 |
| `--cache-dir <path>` | Cache directory | None |

### Display Options

| Option | Description |
|--------|-------------|
| `--chart` | Show ASCII price chart |
| `--indicators` | Show all technical indicators |
| `--rsi` | Show RSI indicator |
| `--sma <periods>` | Show SMA (e.g., `50,200`) |
| `--macd` | Show MACD indicator |
| `--news` | Show recent news |
| `--top-news` | Show market news (not ticker-specific) |

### Watch Options

| Option | Description | Default |
|--------|-------------|---------|
| `--watch` | Enable continuous monitoring | Off |
| `--interval <seconds>` | Update interval | 60 |
| `--sound` | Play sound on significant changes | Off |

### Examples

```bash
# Basic quote
./fetch_quote.ts -t AAPL

# Multiple tickers with chart
./fetch_quote.ts -t AAPL,MSFT,GOOGL --chart

# All indicators
./fetch_quote.ts -t AAPL --indicators

# Watch mode with 30-second interval
./fetch_quote.ts -t AAPL --watch --interval 30

# JSON output for scripting
./fetch_quote.ts -t AAPL --json --pretty
```

## Config Command

Manage configuration.

### Subcommands

| Command | Description |
|---------|-------------|
| `config init [path]` | Create config file |
| `config show` | Display current configuration |

### Examples

```bash
# Create default config
./fetch_quote.ts config init

# Create at custom path
./fetch_quote.ts config init ~/my-config.yaml

# Show merged configuration
./fetch_quote.ts config show
```

## Portfolio Command

Manage stock portfolio.

### Subcommands

| Command | Description |
|---------|-------------|
| `portfolio show` | Display portfolio summary |
| `portfolio add <symbol> <shares> <price>` | Add position |
| `portfolio sell <symbol> <shares> <price>` | Sell shares |
| `portfolio remove <symbol>` | Remove entire position |
| `portfolio history [symbol]` | Show transaction history |
| `portfolio export` | Export portfolio data |

### Options

| Option | Description |
|--------|-------------|
| `--format <type>` | Export format: `json`, `csv` |
| `--output <path>` | Output file path |

### Examples

```bash
# Show portfolio
./fetch_quote.ts portfolio show

# Add 100 shares at $150.25
./fetch_quote.ts portfolio add AAPL 100 150.25

# Sell 50 shares at $175.00
./fetch_quote.ts portfolio sell AAPL 50 175.00

# Export to CSV
./fetch_quote.ts portfolio export --format csv --output portfolio.csv
```

## Alert Command

Manage price alerts.

### Subcommands

| Command | Description |
|---------|-------------|
| `alert add <symbol> <type> <value>` | Create alert |
| `alert list` | List all alerts |
| `alert delete <id>` | Delete an alert |
| `alert enable <id>` | Enable an alert |
| `alert disable <id>` | Disable an alert |
| `alert watch` | Start monitoring |
| `alert clear` | Delete all alerts |

### Alert Types

| Type | Syntax | Example |
|------|--------|---------|
| Price above | `above <price>` | `alert add AAPL above 200` |
| Price below | `below <price>` | `alert add AAPL below 150` |
| RSI above | `rsi above <value>` | `alert add AAPL rsi above 70` |
| RSI below | `rsi below <value>` | `alert add AAPL rsi below 30` |
| Percent change | `change <percent>` | `alert add AAPL change 5` |
| Volume spike | `volume <multiplier>` | `alert add AAPL volume 2` |

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--cooldown <minutes>` | Cooldown between triggers | 60 |
| `--interval <seconds>` | Watch check interval | 300 |

### Examples

```bash
# Price alerts
./fetch_quote.ts alert add AAPL above 200
./fetch_quote.ts alert add AAPL below 150

# RSI alerts
./fetch_quote.ts alert add AAPL rsi below 30

# List alerts
./fetch_quote.ts alert list

# Start monitoring
./fetch_quote.ts alert watch --interval 60
```

## Migrate Command

Export and import data for migration.

### Subcommands

| Command | Description |
|---------|-------------|
| `migrate export` | Export data bundle |
| `migrate import <file>` | Import data bundle |

### Export Options

| Option | Description |
|--------|-------------|
| `--output <path>` | Output file path |
| `--include-credentials` | Include API keys |
| `--encrypt` | Encrypt credentials |
| `--passphrase <text>` | Encryption passphrase |

### Import Options

| Option | Description |
|--------|-------------|
| `--overwrite` | Overwrite existing files |
| `--passphrase <text>` | Decryption passphrase |

### Examples

```bash
# Export everything
./fetch_quote.ts migrate export --output backup.json

# Export with encrypted credentials
./fetch_quote.ts migrate export --output backup.json \
  --include-credentials --encrypt --passphrase "secret"

# Import on new machine
./fetch_quote.ts migrate import backup.json

# Import and overwrite existing
./fetch_quote.ts migrate import backup.json --overwrite
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage API key |
| `FINNHUB_API_KEY` | Finnhub API key |

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | API error |
| 4 | Configuration error |
