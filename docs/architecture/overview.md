# Architecture Overview

fetch_quote is built with a modular architecture designed for extensibility,
testability, and maintainability.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐│
│  │ Parser  │  │Commands │  │  Watch  │  │     Output      ││
│  │         │  │         │  │  Mode   │  │ (Console/JSON)  ││
│  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘│
└───────┼────────────┼────────────┼────────────────┼──────────┘
        │            │            │                │
┌───────┴────────────┴────────────┴────────────────┴──────────┐
│                       Core Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Config    │  │    Types    │  │     Constants       │  │
│  │   Loader    │  │             │  │                     │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘  │
└─────────┼───────────────────────────────────────────────────┘
          │
┌─────────┴───────────────────────────────────────────────────┐
│                     Feature Modules                          │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │ Providers  │  │ Indicators │  │      Portfolio         │ │
│  │            │  │            │  │                        │ │
│  │ - Alpha V. │  │ - RSI      │  │ - Storage              │ │
│  │ - Finnhub  │  │ - SMA      │  │ - Calculator           │ │
│  │ - Registry │  │ - MACD     │  │                        │ │
│  └─────┬──────┘  └────────────┘  └────────────────────────┘ │
│        │                                                     │
│  ┌─────┴──────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │   Cache    │  │   Alerts   │  │      Export/Import     │ │
│  │            │  │            │  │                        │ │
│  │ - File     │  │ - Monitor  │  │ - Bundle               │ │
│  │ - Memory   │  │ - Notifiers│  │ - Migration            │ │
│  │ - Null     │  │            │  │                        │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                      Utilities                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │ Format  │  │  HTTP   │  │Analysis │  │      Path       │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── main.ts                 # Entry point
├── cli/
│   ├── parser.ts           # CLI argument parsing
│   ├── watch.ts            # Watch mode implementation
│   └── commands/
│       └── migrate.ts      # Export/import commands
├── core/
│   ├── types.ts            # TypeScript interfaces
│   └── constants.ts        # Default values
├── config/
│   ├── types.ts            # Config interfaces
│   ├── loader.ts           # YAML/env loading
│   └── defaults.ts         # Default config
├── providers/
│   ├── types.ts            # DataProvider interface
│   ├── alpha_vantage.ts    # Alpha Vantage implementation
│   ├── finnhub.ts          # Finnhub implementation
│   └── registry.ts         # Provider selection/fallback
├── cache/
│   ├── types.ts            # Cache interface
│   ├── file_cache.ts       # File-based cache
│   └── memory_cache.ts     # In-memory cache
├── indicators/
│   ├── rsi.ts              # RSI calculation
│   ├── sma.ts              # SMA calculation
│   └── macd.ts             # MACD calculation
├── portfolio/
│   ├── storage.ts          # Portfolio persistence
│   └── calculator.ts       # P&L calculations
├── alerts/
│   ├── storage.ts          # Alert persistence
│   ├── monitor.ts          # Condition evaluation
│   └── notifiers/          # Notification methods
├── output/
│   ├── types.ts            # OutputFormatter interface
│   ├── console.ts          # Terminal output
│   └── json.ts             # JSON output
└── utils/
    ├── format.ts           # Formatting functions
    ├── http.ts             # HTTP with retry/cache
    └── analysis.ts         # Analysis utilities
```

## Key Design Patterns

### Provider Pattern

Data providers implement a common interface:

```typescript
interface DataProvider {
  readonly id: string;
  readonly name: string;
  fetchQuote(symbol: string): Promise<Quote>;
  fetchDaily(symbol: string, days?: number): Promise<DailyBar[]>;
  fetchNews?(symbol: string, limit?: number): Promise<NewsItem[]>;
  supports(feature: ProviderFeature): boolean;
  isAvailable(): Promise<boolean>;
}
```

The `ProviderRegistry` manages provider selection and fallback.

### Cache Pattern

Caches implement a simple interface:

```typescript
interface Cache {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, data: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

Implementations: `FileCache`, `MemoryCache`, `NullCache`

### Output Formatter Pattern

Output formatters handle different output modes:

```typescript
interface OutputFormatter {
  formatTicker(result: TickerResult): void;
  formatBatch(results: BatchResult): void;
  formatNews(news: NewsItem[]): void;
  formatPortfolio(summary: PortfolioSummary): void;
  formatError(symbol: string, error: Error): void;
}
```

Implementations: `ConsoleOutputFormatter`, `JsonOutputFormatter`

## Data Flow

### Quote Fetch Flow

```
User Request
     │
     ▼
┌─────────────┐
│  CLI Parser │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Provider   │────▶│    Cache    │
│  Registry   │◀────│             │
└──────┬──────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│  Analysis   │
│  (Metrics)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Output     │
│  Formatter  │
└─────────────┘
```

### Configuration Loading

```
CLI Args
    │
    ▼
Environment Variables
    │
    ▼
Config File (YAML)
    │
    ▼
Default Values
    │
    ▼
Merged AppConfig
```

## Error Handling

Errors are propagated with context:

1. **API Errors** - Retry with exponential backoff
2. **Rate Limits** - Fallback to alternative provider
3. **Parse Errors** - Clear error messages with symbol context
4. **Config Errors** - Warnings for missing optional config

## Testing Strategy

```
tests/
├── unit/
│   ├── utils/          # Pure function tests
│   ├── indicators/     # Indicator calculation tests
│   └── cache/          # Cache behavior tests
├── integration/
│   └── providers/      # API integration tests
└── fixtures/
    └── api_responses/  # Mock API responses
```

## Extension Points

### Adding a New Provider

1. Implement `DataProvider` interface
2. Register in `ProviderRegistry`
3. Add configuration support
4. Add tests with mock responses

### Adding a New Indicator

1. Create function in `src/indicators/`
2. Add result type to `core/types.ts`
3. Integrate with `calculateIndicators()`
4. Add CLI option and formatting

### Adding a New Notifier

1. Create notifier in `src/alerts/notifiers/`
2. Add config type to `NotifierConfig`
3. Integrate with `sendNotifications()`
4. Document configuration
