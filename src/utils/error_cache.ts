import { ErrorFactories, type UnifiedError } from "../errors/unified_errors.ts";
import type { PathErrorReason } from "../errors/unified_errors.ts";

/**
 * Error instance cache to reduce error creation overhead
 * Based on performance analysis showing error creation is expensive
 */
export class ErrorCache {
  private static readonly cache = new Map<string, UnifiedError>();
  private static readonly MAX_CACHE_SIZE = 100;

  /**
   * Get or create a cached path validation error
   */
  static pathValidationError(
    path: string,
    reason: PathErrorReason,
    affectedField: string,
  ): UnifiedError {
    const key = `path:${reason}:${affectedField}:${path}`;

    let error = this.cache.get(key);
    if (!error) {
      error = ErrorFactories.pathValidationError(path, reason, affectedField);
      this.addToCache(key, error);
    }

    // Return a new error with updated timestamp
    return {
      ...error,
      timestamp: new Date(),
    };
  }

  /**
   * Get or create a cached file not found error
   */
  static configFileNotFound(
    path: string,
    configType: "app" | "user",
  ): UnifiedError {
    const key = `fileNotFound:${configType}:${path}`;

    let error = this.cache.get(key);
    if (!error) {
      error = ErrorFactories.configFileNotFound(path, configType);
      this.addToCache(key, error);
    }

    return {
      ...error,
      timestamp: new Date(),
    };
  }

  /**
   * Get or create a cached required field missing error
   */
  static requiredFieldMissing(
    field: string,
    parentObject?: string,
  ): UnifiedError {
    const key = `requiredField:${field}:${parentObject || ""}`;

    let error = this.cache.get(key);
    if (!error) {
      error = ErrorFactories.requiredFieldMissing(field, parentObject);
      this.addToCache(key, error);
    }

    return {
      ...error,
      timestamp: new Date(),
    };
  }

  /**
   * Add error to cache with LRU eviction
   */
  private static addToCache(key: string, error: UnifiedError): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry (first in map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, error);
  }

  /**
   * Clear the error cache
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }
}
