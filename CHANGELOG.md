# Changelog

All notable changes to fetch_quote are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Modular Architecture** - Restructured codebase into feature modules
  - `src/core/` - Types and constants
  - `src/config/` - Configuration management
  - `src/providers/` - Data provider abstraction
  - `src/cache/` - Caching layer
  - `src/indicators/` - Technical indicators
  - `src/portfolio/` - Portfolio tracking
  - `src/alerts/` - Alert system
  - `src/output/` - Output formatters

- **Configuration File Support** (`~/.fetch_quote.yaml`)
  - YAML configuration with environment variable expansion
  - Multiple config file locations supported
  - CLI arguments override config settings

- **JSON Output Mode** (`--json`)
  - Machine-readable JSON output for scripting
  - Pretty-print option (`--json --pretty`)
  - JSONL format for watch mode streaming

- **Watch Mode** (`--watch`)
  - Continuous price monitoring
  - Configurable update interval
  - Change indicators between updates
  - Sound alerts on significant changes

- **Technical Indicators** (`--indicators`)
  - RSI (Relative Strength Index) with configurable period
  - SMA (Simple Moving Average) with multiple periods
  - MACD (Moving Average Convergence Divergence)
  - Golden/Death cross detection

- **Finnhub Data Provider**
  - Secondary data source with fallback support
  - Real-time quotes and historical data
  - Company news

- **Portfolio Tracking**
  - Track stock positions and cost basis
  - Calculate unrealized gains/losses
  - Transaction history
  - Export to CSV

- **Alerts System**
  - Price alerts (above/below thresholds)
  - RSI alerts
  - Volume spike alerts
  - Multiple notification methods:
    - Console
    - NTFY push notifications
    - Webhook (Slack, Discord)
    - Desktop notifications

- **Export/Import Migration**
  - Export configuration, portfolio, and alerts
  - Import on new machine
  - Optional credential encryption

- **Testing Infrastructure**
  - Unit tests for utilities, indicators, and cache
  - Test fixtures for mock API responses
  - 52 tests passing

- **Comprehensive Documentation**
  - Getting started guides
  - Feature guides
  - CLI reference
  - Architecture overview

### Changed

- Improved type safety with explicit return types
- Strengthened ticker validation (requires letter start)
- Better error handling with provider fallback

### Fixed

- Unsafe type casts in API responses
- Date sorting using localeCompare
- Terminal width fallback for charts

## [1.0.0] - Previous Version

### Features

- Basic stock quote fetching
- Alpha Vantage API integration
- 52-week high analysis
- Buy/sell zone calculation
- ASCII price charts
- News integration
- Colored terminal output
