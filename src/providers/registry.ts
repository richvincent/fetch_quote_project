/**
 * @fileoverview Provider registry for managing multiple data sources.
 * @module providers/registry
 */

import type { Quote, DailyBar, NewsItem } from "../core/types.ts";
import type { DataProvider, ProviderFeature } from "./types.ts";

/**
 * Registry for managing multiple data providers with fallback support.
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, DataProvider>();
  private defaultProviderId: string | null = null;
  private fallbackProviderId: string | null = null;

  /**
   * Registers a data provider.
   * @param provider - Provider instance to register
   */
  register(provider: DataProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Sets the default provider.
   * @param id - Provider ID
   */
  setDefault(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider not found: ${id}`);
    }
    this.defaultProviderId = id;
  }

  /**
   * Sets the fallback provider.
   * @param id - Provider ID
   */
  setFallback(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider not found: ${id}`);
    }
    this.fallbackProviderId = id;
  }

  /**
   * Gets a provider by ID.
   * @param id - Provider ID
   * @returns Provider instance
   */
  get(id: string): DataProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider not found: ${id}`);
    }
    return provider;
  }

  /**
   * Gets the default provider.
   * @returns Default provider or first registered provider
   */
  getDefault(): DataProvider {
    if (this.defaultProviderId) {
      return this.get(this.defaultProviderId);
    }
    const first = this.providers.values().next().value;
    if (!first) {
      throw new Error("No providers registered");
    }
    return first;
  }

  /**
   * Gets all registered providers.
   * @returns Array of providers
   */
  getAll(): DataProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Gets providers that support a specific feature.
   * @param feature - Feature to check
   * @returns Array of providers supporting the feature
   */
  getByFeature(feature: ProviderFeature): DataProvider[] {
    return this.getAll().filter((p) => p.supports(feature));
  }

  /**
   * Fetches quote with fallback support.
   * @param symbol - Stock symbol
   * @param preferredId - Optional preferred provider ID
   * @returns Quote data
   */
  async fetchQuote(symbol: string, preferredId?: string): Promise<Quote> {
    const providers = this.getProviderOrder(preferredId);

    let lastError: Error | null = null;
    for (const provider of providers) {
      try {
        if (await provider.isAvailable()) {
          return await provider.fetchQuote(symbol);
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`${provider.name} failed for ${symbol}: ${lastError.message}`);
      }
    }

    throw lastError ?? new Error(`All providers failed for ${symbol}`);
  }

  /**
   * Fetches daily data with fallback support.
   * @param symbol - Stock symbol
   * @param days - Number of days
   * @param preferredId - Optional preferred provider ID
   * @returns Daily bar data
   */
  async fetchDaily(
    symbol: string,
    days?: number,
    preferredId?: string,
  ): Promise<DailyBar[]> {
    const providers = this.getProviderOrder(preferredId);

    let lastError: Error | null = null;
    for (const provider of providers) {
      try {
        if (await provider.isAvailable()) {
          return await provider.fetchDaily(symbol, days);
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`${provider.name} daily failed for ${symbol}: ${lastError.message}`);
      }
    }

    throw lastError ?? new Error(`All providers failed for daily data: ${symbol}`);
  }

  /**
   * Fetches news with fallback support.
   * @param symbol - Stock symbol
   * @param limit - Maximum articles
   * @param preferredId - Optional preferred provider ID
   * @returns News items
   */
  async fetchNews(
    symbol: string,
    limit?: number,
    preferredId?: string,
  ): Promise<NewsItem[]> {
    const providers = this.getProviderOrder(preferredId).filter(
      (p) => p.fetchNews !== undefined,
    );

    let lastError: Error | null = null;
    for (const provider of providers) {
      try {
        if (await provider.isAvailable() && provider.fetchNews) {
          return await provider.fetchNews(symbol, limit);
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`${provider.name} news failed for ${symbol}: ${lastError.message}`);
      }
    }

    // News is optional, return empty array if all fail
    return [];
  }

  /**
   * Fetches top news with fallback support.
   * @param limit - Maximum articles
   * @param preferredId - Optional preferred provider ID
   * @returns News items
   */
  async fetchTopNews(limit?: number, preferredId?: string): Promise<NewsItem[]> {
    const providers = this.getProviderOrder(preferredId).filter(
      (p) => p.fetchTopNews !== undefined,
    );

    let lastError: Error | null = null;
    for (const provider of providers) {
      try {
        if (await provider.isAvailable() && provider.fetchTopNews) {
          return await provider.fetchTopNews(limit);
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`${provider.name} top news failed: ${lastError.message}`);
      }
    }

    return [];
  }

  /**
   * Gets the provider order for fallback.
   */
  private getProviderOrder(preferredId?: string): DataProvider[] {
    const order: DataProvider[] = [];

    // Add preferred provider first
    if (preferredId && this.providers.has(preferredId)) {
      order.push(this.get(preferredId));
    }

    // Add default provider if different
    if (this.defaultProviderId && this.defaultProviderId !== preferredId) {
      order.push(this.get(this.defaultProviderId));
    }

    // Add fallback provider if different
    if (
      this.fallbackProviderId &&
      this.fallbackProviderId !== preferredId &&
      this.fallbackProviderId !== this.defaultProviderId
    ) {
      order.push(this.get(this.fallbackProviderId));
    }

    // Add remaining providers
    for (const provider of this.providers.values()) {
      if (!order.includes(provider)) {
        order.push(provider);
      }
    }

    return order;
  }
}
