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
 * const configResult = BreakdownConfig.create();
 * if (!configResult.success) throw new Error(`Config creation failed: ${configResult.error && typeof configResult.error === 'object' && 'message' in configResult.error ? configResult.error.message : 'Unknown error'}`);
 * const config = configResult.data;
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
 * const configResult = BreakdownConfig.create(undefined, "/path/to/my/project");
 * if (!configResult.success) throw new Error(`Config creation failed: ${configResult.error && typeof configResult.error === 'object' && 'message' in configResult.error ? configResult.error.message : 'Unknown error'}`);
 * const config = configResult.data;
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
 * const prodResult = BreakdownConfig.create("production", "/opt/app");
 * if (!prodResult.success) throw new Error(`Config creation failed: ${prodResult.error && typeof prodResult.error === 'object' && 'message' in prodResult.error ? prodResult.error.message : 'Unknown error'}`);
 * const prodConfig = prodResult.data;
 * await prodConfig.loadConfig();
 *
 * // Load development configuration
 * const devResult = BreakdownConfig.create("development", "/home/dev/app");
 * if (!devResult.success) throw new Error(`Config creation failed: ${devResult.error && typeof devResult.error === 'object' && 'message' in devResult.error ? devResult.error.message : 'Unknown error'}`);
 * const devConfig = devResult.data;
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
 *   const configResult = BreakdownConfig.create(undefined, "/my/project");
 *   if (!configResult.success) throw new Error(`Config creation failed: ${configResult.error && typeof configResult.error === 'object' && 'message' in configResult.error ? configResult.error.message : 'Unknown error'}`);
 *   const config = configResult.data;
 *
 *   try {
 *     await config.loadConfig();
 *
 *     // Configuration is now guaranteed to be valid
 *     const settings = await config.getConfig();
 *     return settings;
 *
 *   } catch (error) {
 *     const errorMessage = error instanceof Error ? error.message : String(error);
 *     if (errorMessage.includes("ERR1001")) {
 *       console.error("App configuration file not found");
 *       console.log("Please create .agent/breakdown/config/app.yml");
 *     } else if (errorMessage.includes("ERR1002")) {
 *       console.error("Invalid configuration format");
 *       console.log("Check YAML syntax and required fields");
 *     }
 *     throw error;
 *   }
 * }
 * ```
 *
 * @example Configuration file structure (YAML format)
 * ```yaml
 * # app.yml - Application configuration (required)
 * working_dir: "./workspace"
 * app_prompt:
 *   base_dir: "./prompts"
 *   files:
 *     - "main.prompt"
 *     - "templates/*.prompt"
 * app_schema:
 *   base_dir: "./schemas"
 *   files:
 *     - "core.schema"
 *     - "validation/*.schema"
 *
 * # user.yml - User configuration (optional overrides)
 * working_dir: "/home/user/custom-workspace"
 * app_prompt:
 *   base_dir: "/home/user/my-prompts"
 *   files:
 *     - "custom.prompt"
 * # app_schema inherits from app.yml if not specified
 * ```
 *
 * @example Working with TypeScript types
 * ```typescript
 * import { BreakdownConfig, type MergedConfig } from "@tettuan/breakdownconfig";
 *
 * // Type-safe configuration handling
 * async function processConfig(): Promise<MergedConfig> {
 *   const configResult = BreakdownConfig.create();
 *   if (!configResult.success) throw new Error(`Config creation failed: ${configResult.error && typeof configResult.error === 'object' && 'message' in configResult.error ? configResult.error.message : 'Unknown error'}`);
 *   const config = configResult.data;
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
 *
 * ## Error Codes Reference
 *
 * The library uses structured error codes to help identify and handle specific error conditions.
 * All errors follow the format `ERR{category}{number}` where category indicates the error type.
 *
 * ### Configuration File Errors (1000 series)
 *
 * - **ERR1001: APP_CONFIG_NOT_FOUND**
 *   - **Condition**: Application configuration file `.agent/breakdown/config/app.yml` does not exist
 *   - **Resolution**: Create the required configuration file with valid YAML content
 *
 * - **ERR1002: APP_CONFIG_INVALID**
 *   - **Condition**: Application configuration file exists but contains invalid YAML syntax or structure
 *   - **Resolution**: Fix YAML syntax errors, ensure proper indentation, and verify all required fields
 *
 * - **ERR1003: USER_CONFIG_NOT_FOUND**
 *   - **Condition**: User configuration file `.agent/breakdown/config/user.yml` does not exist
 *   - **Resolution**: This is usually not critical as user config is optional. Create the file if overrides are needed
 *
 * - **ERR1004: USER_CONFIG_INVALID**
 *   - **Condition**: User configuration file exists but contains invalid YAML syntax or structure
 *   - **Resolution**: Fix YAML syntax in user configuration file or remove invalid entries
 *
 * - **ERR1010: CONFIG_NOT_LOADED**
 *   - **Condition**: Attempting to access configuration before calling `loadConfig()`
 *   - **Resolution**: Ensure `await config.loadConfig()` is called before accessing configuration values
 *
 * ### Required Field Errors (2000 series)
 *
 * - **ERR1005: REQUIRED_FIELD_MISSING**
 *   - **Condition**: A mandatory configuration field is not present in the configuration file
 *   - **Resolution**: Add the missing required field to your configuration file
 *
 * - **ERR1006: INVALID_FIELD_TYPE**
 *   - **Condition**: A configuration field has an incorrect data type (e.g., string instead of number)
 *   - **Resolution**: Correct the field value to match the expected type
 *
 * ### Path Validation Errors (3000 series)
 *
 * - **ERR1007: INVALID_PATH_FORMAT**
 *   - **Condition**: Path contains invalid characters or format issues
 *   - **Resolution**: Use valid path characters and ensure proper path format for your OS
 *
 * - **ERR1008: PATH_TRAVERSAL_DETECTED**
 *   - **Condition**: Path contains `../` sequences that could lead to directory traversal attacks
 *   - **Resolution**: Use direct paths without parent directory references
 *
 * - **ERR1009: ABSOLUTE_PATH_NOT_ALLOWED**
 *   - **Condition**: An absolute path was provided where only relative paths are allowed
 *   - **Resolution**: Convert to a relative path from the base directory
 *
 * ### Configuration Set Errors (4000 series)
 *
 * - **ERR4001: INVALID_CONFIG_SET_NAME**
 *   - **Condition**: Configuration set name contains invalid characters or format
 *   - **Resolution**: Use alphanumeric characters and underscores only for config set names
 *
 * ### General Errors (9000 series)
 *
 * - **ERR9999: UNKNOWN_ERROR**
 *   - **Condition**: An unexpected error occurred that doesn't fit other categories
 *   - **Resolution**: Check error details and stack trace for more information
 *
 * @example Comprehensive error handling with recovery strategies
 * ```typescript
 * import { BreakdownConfig } from "@tettuan/breakdownconfig";
 * import { ensureDir } from "https://deno.land/std/fs/mod.ts";
 * import * as YAML from "https://deno.land/x/js_yaml_port@3.14.0/js-yaml.js";
 *
 * async function loadConfigWithErrorHandling() {
 *   const configResult = BreakdownConfig.create();
 *   if (!configResult.success) throw new Error(`Config creation failed: ${configResult.error && typeof configResult.error === 'object' && 'message' in configResult.error ? configResult.error.message : 'Unknown error'}`);
 *   const config = configResult.data;
 *
 *   try {
 *     await config.loadConfig();
 *     return await config.getConfig();
 *   } catch (error) {
 *     const message = error instanceof Error ? error.message : String(error);
 *
 *     // Handle specific error codes
 *     if (message.includes("ERR1001")) {
 *       console.error("Application config not found. Creating default...");
 *       await createDefaultAppConfig();
 *       // Retry loading after creating default
 *       await config.loadConfig();
 *       return await config.getConfig();
 *     }
 *
 *     else if (message.includes("ERR1002")) {
 *       console.error("Invalid YAML in app config. Details:");
 *       // Extract YAML error details
 *       const yamlError = message.match(/line (\d+), column (\d+)/);
 *       if (yamlError) {
 *         console.error(`  Error at line ${yamlError[1]}, column ${yamlError[2]}`);
 *       }
 *       // Show common YAML mistakes
 *       console.log("\nCommon issues:");
 *       console.log("- Check indentation (use spaces, not tabs)");
 *       console.log("- Ensure colons have a space after them");
 *       console.log("- Quote strings containing special characters");
 *     }
 *
 *     else if (message.includes("ERR1005")) {
 *       const fieldName = message.match(/field '([^']+)'/)?.[1];
 *       console.error(`Required field missing: ${fieldName}`);
 *       console.log("\nRequired structure:");
 *       console.log("working_dir: string");
 *       console.log("app_prompt:");
 *       console.log("  base_dir: string");
 *       console.log("app_schema:");
 *       console.log("  base_dir: string");
 *     }
 *
 *     else if (message.includes("ERR1008")) {
 *       console.error("Security violation: Path traversal attempt blocked");
 *       const badPath = message.match(/path '([^']+)'/)?.[1];
 *       if (badPath) {
 *         console.error(`Problematic path: ${badPath}`);
 *         console.log("Paths should not contain '..' sequences");
 *       }
 *     }
 *
 *     throw error;
 *   }
 * }
 *
 * // Helper function to create default configuration
 * async function createDefaultAppConfig() {
 *   const configDir = ".agent/breakdown/config";
 *   await ensureDir(configDir);
 *
 *   const defaultConfig = {
 *     working_dir: "./workspace",
 *     app_prompt: {
 *       base_dir: "./prompts",
 *       files: ["main.prompt"]
 *     },
 *     app_schema: {
 *       base_dir: "./schemas",
 *       files: ["core.schema"]
 *     }
 *   };
 *
 *   const yamlContent = YAML.dump(defaultConfig, {
 *     indent: 2,
 *     lineWidth: -1
 *   });
 *
 *   await Deno.writeTextFile(`${configDir}/app.yml`, yamlContent);
 *   console.log("Created default app.yml configuration");
 * }
 * ```
 *
 * @example Custom fields and extensibility patterns
 * ```typescript
 * import { BreakdownConfig, type MergedConfig } from "@tettuan/breakdownconfig";
 * import * as YAML from "https://deno.land/x/js_yaml_port@3.14.0/js-yaml.js";
 *
 * // Extend the base configuration with custom fields
 * interface ExtendedConfig extends MergedConfig {
 *   // Add application-specific fields
 *   custom?: {
 *     theme?: string;
 *     plugins?: string[];
 *     features?: {
 *       [key: string]: boolean;
 *     };
 *   };
 * }
 *
 * // Custom configuration manager extending BreakdownConfig
 * class ExtendedBreakdownConfig extends BreakdownConfig {
 *   private customConfig?: ExtendedConfig["custom"];
 *
 *   async loadConfig(): Promise<void> {
 *     // Load base configuration first
 *     await super.loadConfig();
 *
 *     // Load additional custom configuration
 *     await this.loadCustomConfig();
 *   }
 *
 *   private async loadCustomConfig(): Promise<void> {
 *     const customPath = `${this.baseDir}/.agent/breakdown/config/custom.yml`;
 *     try {
 *       const customYaml = await Deno.readTextFile(customPath);
 *       this.customConfig = YAML.load(customYaml) as ExtendedConfig["custom"];
 *     } catch {
 *       // Custom config is optional, use defaults
 *       this.customConfig = {
 *         theme: "default",
 *         plugins: [],
 *         features: {}
 *       };
 *     }
 *   }
 *
 *   async getExtendedConfig(): Promise<ExtendedConfig> {
 *     const baseConfig = await this.getConfig();
 *     return {
 *       ...baseConfig,
 *       custom: this.customConfig,
 *     };
 *   }
 * }
 *
 * // Usage example
 * async function useExtendedConfig() {
 *   const config = new ExtendedBreakdownConfig();
 *   await config.loadConfig();
 *
 *   const extConfig = await config.getExtendedConfig();
 *
 *   // Access standard configuration
 *   console.log("Working dir:", extConfig.working_dir);
 *
 *   // Access custom fields
 *   console.log("Theme:", extConfig.custom?.theme);
 *   console.log("Plugins:", extConfig.custom?.plugins);
 *
 *   // Check feature flags
 *   if (extConfig.custom?.features?.["dark-mode"]) {
 *     console.log("Dark mode is enabled");
 *   }
 * }
 * ```
 *
 * @example Metadata and dynamic configuration patterns
 * ```typescript
 * // Using the files array for metadata storage
 * interface PromptMetadata {
 *   name: string;
 *   version: string;
 *   tags: string[];
 *   priority: number;
 * }
 *
 * class MetadataConfig extends BreakdownConfig {
 *   async getPromptMetadata(): Promise<PromptMetadata[]> {
 *     const config = await this.getConfig();
 *     const metadata: PromptMetadata[] = [];
 *
 *     // Parse metadata from files array
 *     for (const file of config.app_prompt.files || []) {
 *       // Format: "name:version:tags:priority"
 *       const parts = file.split(":");
 *       if (parts.length >= 4) {
 *         metadata.push({
 *           name: parts[0],
 *           version: parts[1],
 *           tags: parts[2].split(","),
 *           priority: parseInt(parts[3], 10)
 *         });
 *       }
 *     }
 *
 *     return metadata.sort((a, b) => b.priority - a.priority);
 *   }
 * }
 *
 * // Configuration with metadata in YAML
 * // app.yml:
 * // app_prompt:
 * //   base_dir: "./prompts"
 * //   files:
 * //     - "main:1.0.0:core,essential:100"
 * //     - "helper:0.9.0:utility:50"
 * //     - "debug:0.5.0:development,optional:10"
 * ```
 *
 * @example Configuration validation and schema enforcement
 * ```typescript
 * import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
 *
 * // Define strict schema using Zod
 * const ConfigSchema = z.object({
 *   working_dir: z.string().min(1),
 *   app_prompt: z.object({
 *     base_dir: z.string().min(1),
 *     files: z.array(z.string()).optional()
 *   }),
 *   app_schema: z.object({
 *     base_dir: z.string().min(1),
 *     files: z.array(z.string()).optional()
 *   })
 * });
 *
 * class ValidatedConfig extends BreakdownConfig {
 *   async loadConfig(): Promise<void> {
 *     await super.loadConfig();
 *
 *     // Validate configuration after loading
 *     const config = await this.getConfig();
 *     try {
 *       ConfigSchema.parse(config);
 *     } catch (error) {
 *       if (error instanceof z.ZodError) {
 *         console.error("Configuration validation failed:");
 *         for (const issue of error.issues) {
 *           console.error(`- ${issue.path.join(".")}: ${issue.message}`);
 *         }
 *         throw new Error(`ERR1006: Invalid configuration structure`);
 *       }
 *       throw error;
 *     }
 *   }
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
