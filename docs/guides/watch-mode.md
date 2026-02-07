# Watch Mode Guide

Watch mode provides continuous monitoring of stock prices with automatic updates.

## Basic Usage

```bash
./fetch_quote.ts -t AAPL --watch
```

This will:
- Display the quote
- Refresh every 60 seconds (default)
- Clear the screen between updates
- Show update count and timestamp

## Options

### Custom Interval

Update every 30 seconds:

```bash
./fetch_quote.ts -t AAPL --watch --interval 30
```

### Multiple Tickers

```bash
./fetch_quote.ts -t AAPL,MSFT,GOOGL --watch
```

### With Chart and Indicators

```bash
./fetch_quote.ts -t AAPL --watch --chart --indicators
```

### JSON Output (Streaming)

For integration with other tools:

```bash
./fetch_quote.ts -t AAPL --watch --json
```

Outputs JSONL (one JSON object per line per update):

```json
{"type":"ticker","timestamp":"2024-01-15T10:30:00Z","data":{...}}
{"type":"ticker","timestamp":"2024-01-15T10:31:00Z","data":{...}}
```

## Configuration

In `~/.fetch_quote.yaml`:

```yaml
watch:
  interval: 60        # Default interval in seconds
  clearScreen: true   # Clear screen between updates
  sound: false        # Play sound on significant changes
```

### Sound Alerts

Enable sound for price changes > 1%:

```yaml
watch:
  sound: true
```

Or via CLI:

```bash
./fetch_quote.ts -t AAPL --watch --sound
```

## Display

### Standard Output

```
Watch Mode | Update #15 | Last: 10:30:00 AM | Interval: 60s | Ctrl+C to exit

AAPL (Apple Inc.)                                    ↑ +$0.75 (+0.41%)
  Price: $185.50 (+1.25, +0.68%)
  Volume: 45,234,567 (+15% vs 30d avg)

  52-Week High: $199.62
  Buy Zone: $185.65 - $178.87

  Signal: HOLD
```

### Change Indicators

- `↑` - Price increased since last update
- `↓` - Price decreased since last update
- `→` - Price unchanged

## Stopping Watch Mode

Press `Ctrl+C` to stop watching.

The program handles the interrupt gracefully and exits cleanly.

## Use Cases

### Day Trading Monitor

```bash
./fetch_quote.ts -t SPY,QQQ,IWM --watch --interval 15 --indicators
```

### Portfolio Watch

```bash
./fetch_quote.ts portfolio show --watch
```

### Pre-Market Check

```bash
# Watch for significant overnight changes
./fetch_quote.ts -t AAPL,MSFT,GOOGL --watch --json | grep -E '"changePercent":[^,]*[2-9]'
```

## Combining with Alerts

Watch mode and alerts can run together:

Terminal 1 - Visual monitoring:
```bash
./fetch_quote.ts -t AAPL --watch --chart
```

Terminal 2 - Alert monitoring:
```bash
./fetch_quote.ts alert watch
```

## Best Practices

1. **Respect rate limits** - Don't set interval too low
   - Alpha Vantage: 25 calls/day on free tier
   - Finnhub: 60 calls/minute

2. **Use caching** - Enable cache to reduce API calls:
   ```yaml
   cache:
     enabled: true
     directory: ~/.cache/fetch_quote
   ```

3. **Consider multiple data sources** - Use fallback for reliability:
   ```yaml
   provider:
     default: alpha_vantage
     fallback: finnhub
   ```

4. **Run in tmux/screen** - For persistent monitoring:
   ```bash
   tmux new-session -s stocks
   ./fetch_quote.ts -t AAPL,MSFT --watch
   # Ctrl+B, D to detach
   # tmux attach -t stocks to reattach
   ```
