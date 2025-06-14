import { join } from "@std/path";
import { parse as parseYaml } from "@std/yaml";
import { ErrorCode, ErrorManager } from "../error_manager.ts";
import type { AppConfig } from "../types/app_config.ts";
import { DefaultPaths } from "../types/app_config.ts";

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
 * The loader supports environment-specific configurations through configSetName:
 * - Development: `development-app.yml`
 * - Production: `production-app.yml`
 * - Staging: `staging-app.yml`
 * - Default: `app.yml`
 *
 * ## File Location Strategy
 * Configuration files must be located at:
 * - With configSetName: `{baseDir}/.agent/breakdown/config/{configSetName}-app.yml`
 * - Default: `{baseDir}/.agent/breakdown/config/app.yml`
 *
 * ## Error Handling
 * - Missing files: Throws ErrorCode.APP_CONFIG_NOT_FOUND
 * - Invalid YAML: Throws ErrorCode.APP_CONFIG_INVALID
 * - Missing required fields: Throws ErrorCode.APP_CONFIG_INVALID
 *
 * @example Basic application configuration loading
 * ```typescript
 * // Load default app configuration
 * const loader = new AppConfigLoader("/path/to/project");
 *
 * try {
 *   const config = await loader.load();
 *   console.log("Working directory:", config.working_dir);
 *   console.log("Prompt directory:", config.app_prompt.base_dir);
 *   console.log("Schema directory:", config.app_schema.base_dir);
 * } catch (error) {
 *   console.error("Failed to load app config:", error.message);
 * }
 * ```
 *
 * @example Environment-specific configuration loading
 * ```typescript
 * // Load production-specific configuration
 * const prodLoader = new AppConfigLoader("/app", "production");
 * const prodConfig = await prodLoader.load();
 *
 * // Load development-specific configuration
 * const devLoader = new AppConfigLoader("/app", "development");
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
 *   if (error.message.includes("ERR1001")) {
 *     console.error("Config file not found - check file path");
 *   } else if (error.message.includes("ERR1002")) {
 *     console.error("Config file invalid - check YAML syntax and required fields");
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
   * @param baseDir - Base directory to search for configuration files. If empty string,
   *                  searches relative to current working directory. Recommended to use
   *                  absolute paths for production deployments to ensure predictable behavior.
   * @param configSetName - Environment or deployment-specific configuration identifier.
   *                        Must match pattern /^[a-zA-Z0-9-]+$/ if provided.
   *                        Common values: "development", "production", "staging", "test".
   *                        If omitted, loads the default "app.yml" configuration.
   *
   * @example Single environment setup
   * ```typescript
   * // Use default app.yml configuration
   * const loader = new AppConfigLoader("/usr/local/app");
   * ```
   *
   * @example Multi-environment deployment
   * ```typescript
   * // Production environment with specific config
   * const prodLoader = new AppConfigLoader("/opt/app", "production");
   *
   * // Development environment with different settings
   * const devLoader = new AppConfigLoader("/home/dev/app", "development");
   *
   * // Test environment for CI/CD
   * const testLoader = new AppConfigLoader("/tmp/test-app", "test");
   * ```
   */
  constructor(
    private readonly baseDir: string = "",
    private readonly configSetName?: string,
  ) {}

  /**
   * Loads and validates the application configuration from filesystem
   *
   * Attempts to read the configuration file from the expected location,
   * parses the YAML content, and validates the structure to ensure all
   * required fields are present and of the correct type.
   *
   * The configuration file location is determined as follows:
   * - Without configSetName: `{baseDir}/.agent/breakdown/config/app.yml`
   * - With configSetName: `{baseDir}/.agent/breakdown/config/{configSetName}-app.yml`
   *
   * @returns {Promise<AppConfig>} The loaded and validated application configuration
   * @throws {Error} With ErrorCode.APP_CONFIG_NOT_FOUND if file doesn't exist
   * @throws {Error} With ErrorCode.APP_CONFIG_INVALID if file format or content is invalid
   *
   * @example
   * ```typescript
   * const loader = new AppConfigLoader("/path/to/project", "production");
   * try {
   *   const config = await loader.load();
   *   console.log(config.working_dir);
   * } catch (error) {
   *   console.error("Failed to load config:", error.message);
   * }
   * ```
   */
  async load(): Promise<AppConfig> {
    try {
      // Generate config file name based on configSetName
      const configFileName = this.configSetName ? `${this.configSetName}-app.yml` : "app.yml";

      const configPath = this.baseDir
        ? join(this.baseDir, DefaultPaths.WORKING_DIR, "config", configFileName)
        : join(DefaultPaths.WORKING_DIR, "config", configFileName);

      let text: string;
      try {
        text = await Deno.readTextFile(configPath);
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          ErrorManager.throwError(
            ErrorCode.APP_CONFIG_NOT_FOUND,
            `Application configuration file not found at: ${configPath}`,
          );
        }
        throw error;
      }

      let config: unknown;
      try {
        config = parseYaml(text);
      } catch (_error) {
        ErrorManager.throwError(
          ErrorCode.APP_CONFIG_INVALID,
          "Invalid application configuration",
        );
      }

      if (!this.validateConfig(config)) {
        ErrorManager.throwError(
          ErrorCode.APP_CONFIG_INVALID,
          "Invalid application configuration",
        );
      }

      return config as AppConfig;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      ErrorManager.throwError(
        ErrorCode.APP_CONFIG_INVALID,
        "Invalid application configuration - Failed to load configuration",
      );
    }
  }

  /**
   * Validates that the configuration object has all required fields
   * and that they are of the correct type.
   *
   * @param config - The configuration object to validate
   * @returns {boolean} True if the configuration is valid
   */
  private validateConfig(config: unknown): config is AppConfig {
    if (!config || typeof config !== "object") {
      return false;
    }

    const { working_dir, app_prompt, app_schema } = config as Partial<AppConfig>;

    return typeof working_dir === "string" &&
      this.isValidPromptConfig(app_prompt) &&
      this.isValidSchemaConfig(app_schema);
  }

  /**
   * Type guard for prompt configuration
   *
   * @param config - The configuration object to check
   * @returns {boolean} True if the configuration is valid
   */
  private isValidPromptConfig(config: unknown): config is { base_dir: string } {
    return typeof config === "object" &&
      config !== null &&
      "base_dir" in config &&
      typeof (config as { base_dir: unknown }).base_dir === "string";
  }

  /**
   * Type guard for schema configuration
   *
   * @param config - The configuration object to check
   * @returns {boolean} True if the configuration is valid
   */
  private isValidSchemaConfig(config: unknown): config is { base_dir: string } {
    return typeof config === "object" &&
      config !== null &&
      "base_dir" in config &&
      typeof (config as { base_dir: unknown }).base_dir === "string";
  }
}
