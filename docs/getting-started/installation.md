# Installation

## Prerequisites

- [Deno](https://deno.land/) v1.40 or later
- An API key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key) (free tier available)
- Optional: [Finnhub](https://finnhub.io/) API key for additional data source

## Installing Deno

### macOS
```bash
brew install deno
```

### Linux
```bash
curl -fsSL https://deno.land/install.sh | sh
```

### Windows
```powershell
irm https://deno.land/install.ps1 | iex
```

## Getting the Code

```bash
git clone https://github.com/yourusername/fetch_quote.git
cd fetch_quote
```

## API Key Setup

### Option 1: Environment Variable (Recommended)

```bash
# Add to ~/.bashrc or ~/.zshrc
export ALPHA_VANTAGE_API_KEY="your-api-key-here"
export FINNHUB_API_KEY="your-finnhub-key"  # Optional
```

### Option 2: Configuration File

Create `~/.fetch_quote.yaml`:

```yaml
credentials:
  alphaVantage:
    apiKey: your-api-key-here
  finnhub:
    apiKey: your-finnhub-key
```

### Option 3: Key File

```bash
echo "your-api-key" > ~/.config/fetch_quote/alpha_vantage.key
chmod 600 ~/.config/fetch_quote/alpha_vantage.key
```

## Verify Installation

```bash
./fetch_quote.ts -t AAPL
```

Expected output:
```
AAPL (Apple Inc.)
  Price: $185.50 (+1.25, +0.68%)
  Volume: 45,234,567 (+15% vs 30d avg)

  52-Week High: $199.62
  Buy Zone: $185.65 - $178.87
  Sell Threshold: $183.65

  Signal: HOLD
```

## Troubleshooting

### "API key not found"
Ensure your API key is set correctly in environment or config file.

### "Rate limit exceeded"
Alpha Vantage free tier allows 25 requests/day. Consider using Finnhub as fallback.

### Permission denied
Make the script executable:
```bash
chmod +x fetch_quote.ts
```

## Next Steps

- [Quick Start Guide](quickstart.md) - Learn basic commands
- [Configuration](configuration.md) - Customize settings
