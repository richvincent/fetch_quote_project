# Contributing to fetch_quote

Thank you for your interest in contributing to fetch_quote! This document provides guidelines and information for contributors.

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to maintain a welcoming environment for all contributors.

## Getting Started

### Prerequisites

- [Deno](https://deno.land/) v1.40 or later
- Git
- An API key from Alpha Vantage (for testing)

### Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/fetch_quote.git
   cd fetch_quote
   ```

2. Set up API keys:
   ```bash
   export ALPHA_VANTAGE_API_KEY="your-key"
   ```

3. Run tests:
   ```bash
   deno task test
   ```

4. Type check:
   ```bash
   deno check src/main.ts
   ```

## Project Structure

```
src/
├── core/           # Types and constants
├── config/         # Configuration management
├── providers/      # Data providers (Alpha Vantage, Finnhub)
├── cache/          # Caching implementations
├── indicators/     # Technical indicators
├── portfolio/      # Portfolio tracking
├── alerts/         # Alert system
├── output/         # Output formatters
├── cli/            # CLI components
└── utils/          # Shared utilities

tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── fixtures/       # Test data
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Follow existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Run Tests

```bash
# All tests
deno task test

# Specific test file
deno test tests/unit/indicators/indicators_test.ts

# With coverage
deno task test:coverage
```

### 4. Type Check

```bash
deno check src/main.ts
```

### 5. Commit

Write clear commit messages:

```
Add RSI indicator calculation

- Implement calculateRSI with configurable period
- Add oversold/overbought interpretation
- Include unit tests
```

### 6. Submit PR

- Fill out the PR template
- Link related issues
- Ensure CI passes

## Code Style

### TypeScript

- Use explicit types for function parameters and return values
- Prefer `interface` over `type` for object shapes
- Use `const` by default, `let` when needed
- Avoid `any` - use `unknown` with type guards

### Naming

- **Files**: `snake_case.ts`
- **Functions/Variables**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`

### Documentation

- Add JSDoc comments for exported functions
- Include `@param`, `@returns`, and `@throws` where applicable
- Document module purpose in `@fileoverview`

Example:
```typescript
/**
 * Calculates the Relative Strength Index.
 *
 * @param bars - Daily price bars in chronological order
 * @param period - RSI calculation period (default 14)
 * @returns RSI result with value and interpretation
 * @throws Error if insufficient data
 */
export function calculateRSI(
  bars: DailyBar[],
  period: number = 14,
): RSIResult | null {
  // ...
}
```

### Formatting

The project uses Deno's built-in formatter:

```bash
deno fmt
```

## Testing Guidelines

### Unit Tests

- Test individual functions in isolation
- Use descriptive test names
- Cover edge cases and error conditions

```typescript
Deno.test("calculateRSI returns null for insufficient data", () => {
  const bars = generateBars(10);
  const result = calculateRSI(bars, 14);
  assertEquals(result, null);
});
```

### Integration Tests

- Test API interactions with mock responses
- Test configuration loading
- Test command execution

### Test Fixtures

Store mock data in `tests/fixtures/`:

```
tests/fixtures/
├── alpha_vantage/
│   ├── quote_AAPL.json
│   └── daily_AAPL.json
└── finnhub/
    └── quote_AAPL.json
```

## Adding Features

### New Data Provider

1. Create `src/providers/your_provider.ts`
2. Implement `DataProvider` interface
3. Add to `ProviderRegistry`
4. Add configuration support
5. Write tests with mocked responses
6. Update documentation

### New Indicator

1. Create `src/indicators/your_indicator.ts`
2. Add result type to `core/types.ts`
3. Export from `indicators/mod.ts`
4. Integrate with `calculateIndicators()`
5. Add CLI option
6. Write tests
7. Document in guides

### New Notifier

1. Create `src/alerts/notifiers/your_notifier.ts`
2. Add config type to `NotifierConfig`
3. Export from `notifiers/mod.ts`
4. Integrate with `sendNotifications()`
5. Write tests
6. Document configuration

## Pull Request Guidelines

### PR Title

Use conventional commit format:
- `feat: Add new feature`
- `fix: Fix bug`
- `docs: Update documentation`
- `test: Add tests`
- `refactor: Improve code structure`

### PR Description

Include:
- Summary of changes
- Related issue numbers
- Testing performed
- Documentation updates

### Review Process

1. Maintainers will review within a few days
2. Address feedback in new commits
3. Squash commits before merge

## Reporting Issues

### Bug Reports

Include:
- fetch_quote version
- Deno version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Error messages

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternatives considered

## Questions?

- Open a GitHub issue for questions
- Check existing issues first
- Use clear, descriptive titles

Thank you for contributing!
