import { join } from "@std/path";
import type { AppConfig } from "../types/app_config.ts";
import { DefaultPaths } from "../types/app_config.ts";
import { ConfigError, ConfigResult, Result, ValidationError } from "../types/config_result.ts";
import { SafeConfigLoader } from "./safe_config_loader.ts";
import { ConfigValidator } from "../validators/config_validator.ts";

/**
 * Loads and validates required application configuration files for system initialization
 *
 * AppConfigLoader is responsible for loading the core application configuration that
 * defines essential system settings. Unlike UserConfigLoader, these configurations are
 * mandatory and the system cannot function without them.
 *
 * ## Configuration Requirements
 * Application configs must contain:
 * - `working_dir`: Base working directory for the application
 * - `app_prompt.base_dir`: Directory containing prompt files
 * - `app_schema.base_dir`: Directory containing schema files
 *
 * ## Multi-Environment Support
 * The loader supports profile-specific configurations through profilePrefix:
 * - Development: `development-app.yml`
 * - Production: `production-app.yml`
 * - Staging: `staging-app.yml`
 * - Default: `app.yml`
 *
 * ## File Location Strategy
 * Configuration files must be located at:
 * - With profilePrefix: `{baseDir}/.agent/climpt/config/{profilePrefix}-app.yml`
 * - Default: `{baseDir}/.agent/climpt/config/app.yml`
 *
 * ## Error Handling
 * - Missing files: Throws ErrorCode.APP_CONFIG_NOT_FOUND
 * - Invalid YAML: Throws ErrorCode.APP_CONFIG_INVALID
 * - Missing required fields: Throws ErrorCode.APP_CONFIG_INVALID
 *
 * @example Basic application configuration loading
 * ```typescript
 * // Load default app configuration
 * const loader = new AppConfigLoader(undefined, "/path/to/project");
 *
 * try {
 *   const config = await loader.load();
 *   console.log("Working directory:", config.working_dir);
 *   console.log("Prompt directory:", config.app_prompt.base_dir);
 *   console.log("Schema directory:", config.app_schema.base_dir);
 * } catch (error) {
 *   if (error instanceof Error) {
 *     console.error("Failed to load app config:", error.message);
 *   }
 * }
 * ```
 *
 * @example Environment-specific configuration loading
 * ```typescript
 * // Load production-specific configuration
 * const prodLoader = new AppConfigLoader("production", "/app");
 * const prodConfig = await prodLoader.load();
 *
 * // Load development-specific configuration
 * const devLoader = new AppConfigLoader("development", "/app");
 * const devConfig = await devLoader.load();
 *
 * // Each environment can have different working directories,
 * // prompt locations, schema locations, etc.
 * console.log("Production working dir:", prodConfig.working_dir);
 * console.log("Development working dir:", devConfig.working_dir);
 * ```
 *
 * @example Error handling and validation
 * ```typescript
 * const loader = new AppConfigLoader("/project");
 *
 * try {
 *   const config = await loader.load();
 *
 *   // Configuration is guaranteed to have required fields
 *   const workingDir = config.working_dir; // string, never undefined
 *   const promptDir = config.app_prompt.base_dir; // string, never undefined
 *
 * } catch (error) {
 *   if (error instanceof Error) {
 *     if (error.message.includes("ERR1001")) {
 *       console.error("Config file not found - check file path");
 *     } else if (error.message.includes("ERR1002")) {
 *       console.error("Config file invalid - check YAML syntax and required fields");
 *     }
 *   }
 * }
 * ```
 */
export class AppConfigLoader {
  /**
   * Creates a new AppConfigLoader instance for loading mandatory application configurations
   *
   * The loader is designed to handle environment-specific application configurations
   * that define core system behavior and directory structures.
   *
   * @param profilePrefix - Profile-specific configuration identifier.
   *                        Must match pattern /^[a-zA-Z0-9-]+$/ if provided.
   *                        Common values: "development", "production", "staging", "test".
   *                        If omitted, loads the default "app.yml" configuration.
   * @param baseDir - Base directory to search for configuration files. If empty string,
   *                  searches relative to current working directory. Recommended to use
   *                  absolute paths for production deployments to ensure predictable behavior.
   *
   * @example Single environment setup
   * ```typescript
   * // Use default app.yml configuration
   * const loader = new AppConfigLoader(undefined, "/usr/local/app");
   * ```
   *
   * @example Multi-environment deployment
   * ```typescript
   * // Production environment with specific config
   * const prodLoader = new AppConfigLoader("production", "/opt/app");
   *
   * // Development environment with different settings
   * const devLoader = new AppConfigLoader("development", "/home/dev/app");
   *
   * // Test environment for CI/CD
   * const testLoader = new AppConfigLoader("test", "/tmp/test-app");
   * ```
   */
  constructor(
    private readonly profilePrefix?: string,
    private readonly baseDir: string = "",
  ) {}

  /**
   * Loads and validates the application configuration from filesystem
   *
   * Attempts to read the configuration file from the expected location,
   * parses the YAML content, and validates the structure to ensure all
   * required fields are present and of the correct type.
   *
   * The configuration file location is determined as follows:
   * - Without profilePrefix: `{baseDir}/.agent/climpt/config/app.yml`
   * - With profilePrefix: `{baseDir}/.agent/climpt/config/{profilePrefix}-app.yml`
   *
   * @returns {Promise<AppConfig>} The loaded and validated application configuration
   * @throws {Error} With ErrorCode.APP_CONFIG_NOT_FOUND if file doesn't exist
   * @throws {Error} With ErrorCode.APP_CONFIG_INVALID if file format or content is invalid
   *
   * @example
   * ```typescript
   * const loader = new AppConfigLoader("production", "/path/to/project");
   * try {
   *   const config = await loader.load();
   *   console.log(config.working_dir);
   * } catch (error) {
   *   if (error instanceof Error) {
   *     console.error("Failed to load config:", error.message);
   *   }
   * }
   * ```
   */
  async load(): Promise<AppConfig> {
    const result = await this.loadSafe();
    if (!result.success) {
      // For backward compatibility, convert errors to exceptions
      const error = result.error;
      if (error.kind === "fileNotFound") {
        throw new Error(`[ERR1001] ${error.message}`);
      } else if (error.kind === "parseError") {
        throw new Error(`[ERR1002] Invalid application configuration - ${error.message}`);
      } else if (error.kind === "configValidationError") {
        const messages = error.errors.map((e: ValidationError) =>
          e.message || `${e.field}: ${e.expectedType}`
        ).join(
          ", ",
        );
        throw new Error(`[ERR1002] Invalid application configuration - ${messages}`);
      } else {
        throw new Error(`[ERR1002] Invalid application configuration`);
      }
    }
    return result.data;
  }

  /**
   * Loads and validates the application configuration from filesystem (Result-based API)
   *
   * @returns {Promise<ConfigResult<AppConfig, ConfigError>>} The loaded and validated application configuration or error
   */
  async loadSafe(): Promise<ConfigResult<AppConfig, ConfigError>> {
    // Generate config file name based on profilePrefix
    const configFileName = this.profilePrefix ? `${this.profilePrefix}-app.yml` : "app.yml";

    const configPath = this.baseDir
      ? join(this.baseDir, DefaultPaths.WORKING_DIR, "config", configFileName)
      : join(DefaultPaths.WORKING_DIR, "config", configFileName);

    // Use SafeConfigLoader to load the file
    const loader = new SafeConfigLoader(configPath);

    // Read file
    const fileResult = await loader.readFile();
    if (!fileResult.success) {
      return fileResult;
    }

    // Parse YAML
    const parseResult = loader.parseYaml(fileResult.data);
    if (!parseResult.success) {
      return parseResult;
    }

    // Validate configuration using ConfigValidator
    const validationResult = ConfigValidator.validateAppConfig(parseResult.data);
    if (!validationResult.success) {
      return Result.err({
        kind: "configValidationError",
        errors: validationResult.error,
        path: configPath,
      });
    }

    return validationResult;
  }
}
