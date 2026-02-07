# Portfolio Tracking Guide

fetch_quote includes a portfolio tracking feature to monitor your stock positions and calculate gains/losses.

## Setting Up Portfolio

### Add a Position

```bash
./fetch_quote.ts portfolio add AAPL 100 150.25
```

Parameters:
- `AAPL` - Stock symbol
- `100` - Number of shares
- `150.25` - Purchase price per share

### View Portfolio

```bash
./fetch_quote.ts portfolio show
```

Output:
```
Portfolio Summary                          2024-01-15 09:30:00

Symbol   Shares   Avg Cost    Current    Gain/Loss
------   ------   --------    -------    ---------
AAPL     100      $150.25     $185.50    +$3,525.00 (+23.47%)
MSFT     50       $340.00     $370.25    +$1,512.50 (+8.90%)
GOOGL    25       $135.00     $142.75    +$193.75 (+5.74%)

Total Value:      $45,618.75
Total Cost:       $40,387.50
Total Gain/Loss:  +$5,231.25 (+12.95%)
Day Change:       +$325.50 (+0.72%)
```

## Managing Positions

### Add More Shares

Adding shares to an existing position recalculates the average cost:

```bash
./fetch_quote.ts portfolio add AAPL 50 175.00
```

### Sell Shares

```bash
./fetch_quote.ts portfolio sell AAPL 25 190.00
```

### Remove a Position

To remove all shares:

```bash
./fetch_quote.ts portfolio remove AAPL
```

## Transaction History

View all buy/sell transactions:

```bash
./fetch_quote.ts portfolio history
```

Filter by symbol:

```bash
./fetch_quote.ts portfolio history AAPL
```

## Export Portfolio

### JSON Format

```bash
./fetch_quote.ts portfolio show --json
```

### CSV Export

```bash
./fetch_quote.ts portfolio export --format csv --output portfolio.csv
```

## Portfolio Configuration

Configure portfolio settings in `~/.fetch_quote.yaml`:

```yaml
portfolio:
  enabled: true
  file: ~/.fetch_quote/portfolio.json
```

## Storage

Portfolio data is stored in JSON format at `~/.fetch_quote/portfolio.json`:

```json
{
  "version": "1.0",
  "positions": [
    {
      "symbol": "AAPL",
      "shares": 100,
      "costBasis": 15025.00,
      "avgCostPerShare": 150.25,
      "addedAt": "2024-01-10T10:30:00Z",
      "lastUpdated": "2024-01-10T10:30:00Z"
    }
  ],
  "transactions": [
    {
      "id": "txn_1704876600_abc123",
      "symbol": "AAPL",
      "type": "buy",
      "shares": 100,
      "pricePerShare": 150.25,
      "date": "2024-01-10T10:30:00Z"
    }
  ],
  "createdAt": "2024-01-10T10:30:00Z",
  "lastUpdated": "2024-01-10T10:30:00Z"
}
```

## Calculations

### Cost Basis

For multiple purchases, cost basis is calculated as the total amount invested:

```
Cost Basis = Σ (shares × price per share)
```

### Average Cost Per Share

```
Average Cost = Cost Basis / Total Shares
```

### Unrealized Gain/Loss

```
Gain/Loss = (Current Price × Shares) - Cost Basis
Gain/Loss % = Gain/Loss / Cost Basis × 100
```

### Day Change

```
Day Change = (Current Price - Previous Close) × Shares
```

## Migrating Portfolio

### Export for Backup

```bash
./fetch_quote.ts migrate export --output backup.json
```

### Import on New Machine

```bash
./fetch_quote.ts migrate import backup.json
```

## Best Practices

1. **Record all transactions** - Keep accurate records of buy/sell prices
2. **Regular backups** - Export portfolio periodically
3. **Verify data** - Cross-check with broker statements
4. **Track multiple accounts** - Use separate config files for different accounts
