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
 * @example Basic configuration loading
 * ```typescript
 * // Initialize and load default configuration
 * const config = new BreakdownConfig();
 * await config.loadConfig();
 *
 * // Access merged configuration (app + user overrides)
 * const settings = await config.getConfig();
 * console.log("Working directory:", settings.working_dir);
 * console.log("Prompt base directory:", settings.app_prompt.base_dir);
 * console.log("Schema base directory:", settings.app_schema.base_dir);
 * ```
 *
 * @example Custom base directory setup
 * ```typescript
 * // Use specific project directory
 * const config = new BreakdownConfig("/path/to/my/project");
 * await config.loadConfig();
 *
 * // Get absolute paths for directory operations
 * const workingDir = await config.getWorkingDir();
 * const promptDir = await config.getPromptDir();
 * const schemaDir = await config.getSchemaDir();
 *
 * console.log("Resolved paths:");
 * console.log("- Working:", workingDir);
 * console.log("- Prompts:", promptDir);
 * console.log("- Schemas:", schemaDir);
 * ```
 *
 * @example Environment-specific configuration
 * ```typescript
 * // Load production-specific configuration
 * const prodConfig = new BreakdownConfig("production", "/opt/app");
 * await prodConfig.loadConfig();
 *
 * // Load development configuration
 * const devConfig = new BreakdownConfig("development", "/home/dev/app");
 * await devConfig.loadConfig();
 *
 * // Each environment can have different settings
 * const prodSettings = await prodConfig.getConfig();
 * const devSettings = await devConfig.getConfig();
 *
 * console.log("Production working dir:", prodSettings.working_dir);
 * console.log("Development working dir:", devSettings.working_dir);
 * ```
 *
 * @example Error handling and validation
 * ```typescript
 * import { BreakdownConfig } from "@tettuan/breakdownconfig";
 *
 * async function setupConfig() {
 *   const config = new BreakdownConfig("/my/project");
 *
 *   try {
 *     await config.loadConfig();
 *
 *     // Configuration is now guaranteed to be valid
 *     const settings = await config.getConfig();
 *     return settings;
 *
 *   } catch (error) {
 *     if (error.message.includes("ERR1001")) {
 *       console.error("App configuration file not found");
 *       console.log("Please create .agent/breakdown/config/app.yml");
 *     } else if (error.message.includes("ERR1002")) {
 *       console.error("Invalid configuration format");
 *       console.log("Check YAML syntax and required fields");
 *     }
 *     throw error;
 *   }
 * }
 * ```
 *
 * @example Working with TypeScript types
 * ```typescript
 * import { BreakdownConfig, type MergedConfig } from "@tettuan/breakdownconfig";
 *
 * // Type-safe configuration handling
 * async function processConfig(): Promise<MergedConfig> {
 *   const config = new BreakdownConfig();
 *   await config.loadConfig();
 *
 *   // TypeScript knows the exact shape of the returned config
 *   const settings: MergedConfig = await config.getConfig();
 *
 *   // All fields are guaranteed to exist and be the correct type
 *   const workingDir: string = settings.working_dir;
 *   const promptBaseDir: string = settings.app_prompt.base_dir;
 *   const schemaBaseDir: string = settings.app_schema.base_dir;
 *
 *   return settings;
 * }
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
 * Configuration type for the merged result
 *
 * @typedef {MergedConfig} Final configuration combining application defaults and user overrides
 */
export type { MergedConfig } from "./src/types.ts";
