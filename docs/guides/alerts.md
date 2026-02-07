# Alerts Guide

fetch_quote includes a powerful alert system to notify you when stocks reach certain conditions.

## Quick Start

### Create a Price Alert

```bash
# Alert when AAPL goes above $200
./fetch_quote.ts alert add AAPL above 200

# Alert when AAPL goes below $150
./fetch_quote.ts alert add AAPL below 150
```

### List Alerts

```bash
./fetch_quote.ts alert list
```

### Monitor Alerts

```bash
./fetch_quote.ts alert watch
```

## Alert Types

### Price Alerts

```bash
./fetch_quote.ts alert add AAPL above 200
./fetch_quote.ts alert add AAPL below 150
```

### Percentage Change Alerts

```bash
# Alert on 5% daily change
./fetch_quote.ts alert add AAPL change 5 --period day

# Alert on 10% weekly change
./fetch_quote.ts alert add AAPL change 10 --period week
```

### RSI Alerts

```bash
# Alert when RSI goes below 30 (oversold)
./fetch_quote.ts alert add AAPL rsi below 30

# Alert when RSI goes above 70 (overbought)
./fetch_quote.ts alert add AAPL rsi above 70
```

### Volume Spike Alerts

```bash
# Alert when volume is 2x the 30-day average
./fetch_quote.ts alert add AAPL volume 2
```

## Notification Methods

### Console (Default)

Alerts are displayed in the terminal with a bell sound.

### NTFY (Push Notifications)

[NTFY](https://ntfy.sh) is an open-source push notification service.

**Configuration:**
```yaml
alerts:
  notifiers:
    ntfy:
      server: https://ntfy.sh  # or self-hosted
      topic: my-stock-alerts
      priority: high
```

**Receive notifications:**
- Subscribe to your topic in the NTFY app
- Get push notifications on phone/desktop

### Webhook (Slack, Discord, etc.)

**Slack:**
```yaml
alerts:
  notifiers:
    webhook:
      url: https://hooks.slack.com/services/XXX/YYY/ZZZ
```

**Discord:**
```yaml
alerts:
  notifiers:
    webhook:
      url: https://discord.com/api/webhooks/XXX/YYY
```

### Desktop Notifications

```yaml
alerts:
  notifiers:
    desktop: true
```

Works on:
- macOS (using osascript)
- Linux (using notify-send)

## Managing Alerts

### Enable/Disable

```bash
./fetch_quote.ts alert enable alert_123
./fetch_quote.ts alert disable alert_123
```

### Delete

```bash
./fetch_quote.ts alert delete alert_123
```

### Delete All

```bash
./fetch_quote.ts alert clear
```

## Alert Configuration

### Default Settings

```yaml
alerts:
  enabled: true
  file: ~/.fetch_quote/alerts.json
  checkInterval: 300    # Check every 5 minutes
  defaultCooldown: 60   # Don't repeat for 60 minutes
  notifiers:
    console: true
```

### Cooldown

Alerts have a cooldown period to prevent spam. After triggering, an alert won't trigger again for the cooldown duration.

```bash
# Set 30-minute cooldown
./fetch_quote.ts alert add AAPL above 200 --cooldown 30
```

## Running Alert Monitor

### Foreground

```bash
./fetch_quote.ts alert watch
```

### Background (with nohup)

```bash
nohup ./fetch_quote.ts alert watch > alerts.log 2>&1 &
```

### With systemd (Linux)

Create `/etc/systemd/user/fetch-quote-alerts.service`:

```ini
[Unit]
Description=fetch_quote Alert Monitor
After=network.target

[Service]
Type=simple
ExecStart=/path/to/fetch_quote.ts alert watch
Restart=always
RestartSec=30

[Install]
WantedBy=default.target
```

Enable and start:
```bash
systemctl --user enable fetch-quote-alerts
systemctl --user start fetch-quote-alerts
```

## Alert Storage

Alerts are stored in `~/.fetch_quote/alerts.json`:

```json
{
  "version": "1.0",
  "alerts": [
    {
      "id": "alert_1704876600_abc123",
      "symbol": "AAPL",
      "condition": {
        "type": "price_above",
        "value": 200
      },
      "notifiers": [
        { "type": "console" },
        { "type": "ntfy", "server": "https://ntfy.sh", "topic": "stocks" }
      ],
      "enabled": true,
      "cooldownMinutes": 60,
      "createdAt": "2024-01-10T10:30:00Z",
      "lastTriggered": null
    }
  ]
}
```

## Examples

### Comprehensive Alert Setup

```bash
# Buy signal alerts
./fetch_quote.ts alert add AAPL below 170 --cooldown 120
./fetch_quote.ts alert add AAPL rsi below 30 --cooldown 60

# Sell signal alerts
./fetch_quote.ts alert add AAPL above 200 --cooldown 120
./fetch_quote.ts alert add AAPL rsi above 70 --cooldown 60

# Volatility alert
./fetch_quote.ts alert add AAPL change 5 --period day
```

### Start monitoring

```bash
./fetch_quote.ts alert watch --interval 60
```
