import { Result } from "../types/unified_result.ts";
import { UnifiedError } from "../errors/unified_errors.ts";
import type { MergedConfig } from "../types/merged_config.ts";

/**
 * Configuration cache with TTL support
 * Reduces repeated file I/O operations for frequently accessed configs
 */
export class ConfigCache {
  private static readonly cache = new Map<string, CacheEntry>();
  private static readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached configuration if available and not expired
   */
  static get(key: string): Result<MergedConfig, UnifiedError> | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Entry expired, remove it
      this.cache.delete(key);
      return null;
    }

    return Result.ok(entry.data);
  }

  /**
   * Set configuration in cache with optional TTL
   */
  static set(
    key: string,
    data: MergedConfig,
    ttl: number = this.DEFAULT_TTL_MS,
  ): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Remove specific entry from cache
   */
  static delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    size: number;
    keys: string[];
    memoryUsage: number;
  } {
    const keys = Array.from(this.cache.keys());

    // Estimate memory usage
    let memoryUsage = 0;
    for (const entry of this.cache.values()) {
      memoryUsage += JSON.stringify(entry.data).length;
    }

    return {
      size: this.cache.size,
      keys,
      memoryUsage,
    };
  }

  /**
   * Clean up expired entries
   */
  static cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Create a cache key from config loader parameters
   */
  static createKey(appConfigPath: string, userConfigPath?: string): string {
    return userConfigPath ? `${appConfigPath}:${userConfigPath}` : appConfigPath;
  }
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  data: MergedConfig;
  timestamp: number;
  ttl: number;
}
