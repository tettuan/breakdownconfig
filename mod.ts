/**
 * BreakdownConfig - A Deno library for managing application and user configurations
 * 
 * This module provides a robust configuration management system that handles both
 * application-level and user-level settings. It implements a hierarchical configuration
 * system where user settings can override application defaults while maintaining
 * type safety and validation.
 * 
 * The library focuses on:
 * - Safe configuration loading and validation
 * - Clear separation between application and user settings
 * - Type-safe configuration merging
 * - Path safety and validation
 * - Centralized error management
 * 
 * @module
 * @example
 * ```typescript
 * // Basic usage
 * const config = new BreakdownConfig();
 * await config.loadConfig();
 * const settings = await config.getConfig();
 * 
 * // With custom base directory
 * const config = new BreakdownConfig("./custom/path");
 * await config.loadConfig();
 * const workingDir = await config.getWorkingDir();
 * ```
 */

/**
 * Main configuration class that manages the lifecycle of application and user settings.
 * Provides methods for loading, validating, and accessing configuration values.
 * 
 * @see {@link BreakdownConfig} for detailed class documentation
 */
export { BreakdownConfig } from "./src/breakdown_config.ts";

/**
 * Type definitions for configuration management
 * 
 * @typedef {AppConfig} Application-level configuration with required settings
 * @typedef {MergedConfig} Combined configuration that merges app and user settings
 * @typedef {UserConfig} User-level configuration with optional overrides
 */
export type { AppConfig, MergedConfig, UserConfig } from "./src/types.ts";
