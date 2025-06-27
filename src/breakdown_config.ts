import { resolve } from "@std/path";
import type { MergedConfig } from "./types/merged_config.ts";
import { ConfigManager } from "./config_manager.ts";
import { AppConfigLoader } from "./loaders/app_config_loader.ts";
import { UserConfigLoader } from "./loaders/user_config_loader.ts";
import { ErrorCode, ErrorManager } from "./error_manager.ts";
import { Result } from "./types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "./errors/unified_errors.ts";
import { ValidProfilePrefix } from "./utils/valid_path.ts";

/**
 * Main configuration class for managing application and user settings.
 * This class provides methods to load, validate, and merge configurations
 * from both application-specific and user-specific locations.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const config = new BreakdownConfig();
 * await config.loadConfig();
 * const settings = await config.getConfig();
 *
 * // Environment-specific configuration
 * const prodConfig = new BreakdownConfig("production");
 * await prodConfig.loadConfig();
 *
 * // Custom base directory
 * const customConfig = new BreakdownConfig(undefined, "/path/to/project");
 * await customConfig.loadConfig();
 *
 * // Environment-specific with custom base directory
 * const envConfig = new BreakdownConfig("staging", "/path/to/project");
 * await envConfig.loadConfig();
 * ```
 */
export class BreakdownConfig {
  private configManager: ConfigManager;
  private baseDir: string;
  private profilePrefix?: string;
  private isConfigLoaded = false;

  /**
   * Creates a new instance of BreakdownConfig.
   * Initializes the configuration manager with the specified configuration set and base directory.
   *
   * @param profilePrefix - Optional profile for environment-specific settings.
   *                        Must contain only alphanumeric characters and hyphens (e.g., "production", "development", "staging-v2").
   *                        Used to load profile-specific configuration files that override default settings.
   *                        When specified, the system will look for configuration files with this profile
   *                        (e.g., "production-app.yml" for profilePrefix="production").
   * @param baseDir - Optional base directory that serves as the reference point for all configuration files.
   *                  This is the root directory from which all relative paths in configuration files are resolved.
   *                  Defaults to the current working directory ("") if not specified.
   *                  All configuration files (app_config.json, user_config.json) are expected to be located
   *                  relative to this directory, and all paths defined within those configurations
   *                  (such as working_dir, app_prompt.base_dir, etc.) are resolved relative to this baseDir.
   */
  constructor(profilePrefix?: string, baseDir?: string) {
    this.profilePrefix = profilePrefix;
    this.baseDir = baseDir ?? "";

    // Validate profile if provided
    if (this.profilePrefix && !/^[a-zA-Z0-9-]+$/.test(this.profilePrefix)) {
      ErrorManager.throwError(
        ErrorCode.INVALID_PROFILE_NAME,
        `Invalid profile: ${this.profilePrefix}. Only alphanumeric characters and hyphens are allowed.`,
      );
    }

    const appConfigLoader = new AppConfigLoader(this.profilePrefix, this.baseDir);
    const userConfigLoader = new UserConfigLoader(this.profilePrefix, this.baseDir);
    this.configManager = new ConfigManager(appConfigLoader, userConfigLoader);
  }

  /**
   * Loads and merges application and user configurations.
   *
   * This method performs the following operations:
   * 1. Loads application configuration from app_config.toml
   * 2. Loads user configuration from user_config.toml (if exists)
   * 3. Validates both configurations
   * 4. Merges configurations with user settings taking precedence
   * 5. Sets the configuration loaded flag
   *
   * @throws {Error} ERR1001 - Application configuration not found
   *   - Thrown when app_config.toml is missing in the base directory
   *   - The application configuration is mandatory and must exist
   *   - Example: "Application configuration not found: /path/to/app_config.toml"
   *
   * @throws {Error} ERR1002 - Invalid application configuration
   *   - Thrown when app_config.toml exists but contains invalid settings
   *   - Common causes:
   *     - Missing required fields (e.g., working_dir)
   *     - Empty or whitespace-only working_dir value
   *     - Malformed TOML syntax
   *   - Example: "Invalid application configuration"
   *
   * @throws {Error} ERR1003 - User configuration invalid
   *   - Thrown when user_config.toml exists but contains invalid settings
   *   - This is non-fatal if user config doesn't exist (uses app defaults)
   *   - Common causes:
   *     - Invalid overrides that conflict with app constraints
   *     - Malformed TOML syntax in user config
   *   - Example: "Invalid user configuration"
   *
   * @throws {Error} ERR9999 - Unknown error
   *   - Thrown for unexpected errors during configuration loading
   * - Wraps non-Error exceptions of unknown type
   *
   * @example
   * ```typescript
   * const config = new BreakdownConfig();
   * try {
   *   await config.loadConfig();
   *   console.log("Configuration loaded successfully");
   * } catch (error) {
   *   if (error.message.includes("ERR1001")) {
   *     console.error("App config missing - please create app_config.toml");
   *   } else if (error.message.includes("ERR1002")) {
   *     console.error("App config invalid - check working_dir setting");
   *   }
   * }
   * ```
   */
  async loadConfig(): Promise<void> {
    const result = await this.loadConfigSafe();
    if (!result.success) {
      throw new Error(result.error.message);
    }
  }

  /**
   * Loads and merges application and user configurations (Result-based API).
   *
   * @returns {Promise<Result<void, UnifiedError>>} Success or error result
   */
  async loadConfigSafe(): Promise<Result<void, UnifiedError>> {
    const configResult = await this.configManager.getConfigSafe();
    if (!configResult.success) {
      return configResult;
    }

    const config = configResult.data;
    if (!config.working_dir || config.working_dir.trim() === "") {
      return Result.err(
        ErrorFactories.configValidationError(
          "app_config",
          [{
            field: "working_dir",
            value: config.working_dir,
            expectedType: "non-empty string",
            actualType: "string",
            constraint: "must not be empty",
          }],
        ),
      );
    }

    this.isConfigLoaded = true;
    return Result.ok(undefined);
  }

  /**
   * Returns the merged configuration object containing both application and user settings.
   *
   * This method retrieves the final configuration after merging application defaults
   * with user-specific overrides. The configuration must be loaded first using
   * `loadConfig()` before calling this method.
   *
   * @returns {Promise<MergedConfig>} The merged configuration object with the following structure:
   *
   * **Required Fields (from AppConfig):**
   * - `working_dir: string` - The working directory for the application
   * - `app_prompt.base_dir: string` - Base directory for prompt files
   * - `app_schema.base_dir: string` - Base directory for schema files
   *
   * **Additional Fields:**
   * - `[key: string]: unknown` - Custom fields from user configuration that extend the base config
   *
   * The returned MergedConfig represents the final configuration state where:
   * 1. Application defaults are loaded from `app_config.toml`
   * 2. User overrides from `user_config.toml` (if present) take precedence
   * 3. Environment-specific settings (if profileName provided) override base configs
   * 4. All paths are resolved relative to the baseDir
   *
   * @example
   * ```typescript
   * // Basic usage
   * const config = new BreakdownConfig();
   * await config.loadConfig();
   * const mergedConfig = await config.getConfig();
   *
   * // Access default configuration values
   * console.log(mergedConfig.working_dir);         // ".agent/breakdown" (default)
   * console.log(mergedConfig.app_prompt.base_dir); // "breakdown/prompts/app" (default)
   * console.log(mergedConfig.app_schema.base_dir); // "breakdown/schema/app" (default)
   *
   * // Access custom user-defined fields
   * if (mergedConfig.debugMode) {
   *   console.log("Debug mode enabled");
   * }
   *
   * // Handle nested custom configuration
   * if (mergedConfig.apiConfig && typeof mergedConfig.apiConfig === 'object') {
   *   const api = mergedConfig.apiConfig as { endpoint?: string; timeout?: number };
   *   console.log(`API endpoint: ${api.endpoint}`);
   * }
   *
   * // Environment-specific configuration
   * const prodConfig = new BreakdownConfig("production");
   * await prodConfig.loadConfig();
   * const prodSettings = await prodConfig.getConfig();
   * // Returns production-specific merged configuration from app_config.production.toml
   * ```
   *
   * @throws {Error} ERR1004 - Configuration not loaded
   *   - Thrown when attempting to access configuration before calling `loadConfig()`
   *   - Message: "Configuration not loaded - Call loadConfig() first"
   *   - Solution: Ensure `await config.loadConfig()` is called before `getConfig()`
   *
   * @see {@link MergedConfig} for the complete type definition with detailed field documentation
   * @see {@link AppConfig} for base configuration structure inherited by MergedConfig
   * @see {@link loadConfig} for loading configuration before use
   * @see {@link ConfigManager.getConfig} for the underlying merge implementation
   */
  async getConfig(): Promise<MergedConfig> {
    const result = await this.getConfigSafe();
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data;
  }

  /**
   * Returns the merged configuration object (Result-based API).
   *
   * @returns {Promise<Result<MergedConfig, UnifiedError>>} The merged configuration or error
   */
  async getConfigSafe(): Promise<Result<MergedConfig, UnifiedError>> {
    if (!this.isConfigLoaded) {
      return Result.err(
        ErrorFactories.configNotLoaded("getConfig"),
      );
    }
    return await this.configManager.getConfigSafe();
  }

  /**
   * Gets the absolute path to the working directory.
   *
   * The working directory is the root directory for all application operations,
   * resolved from the base directory and the configured working_dir value.
   * This directory serves as the base for resolving prompt and schema directories.
   *
   * @returns {Promise<string>} The absolute path to the working directory.
   *                            This path is resolved relative to the baseDir
   *                            (if provided in constructor) or the current directory.
   * @throws {Error} If the configuration hasn't been loaded (call loadConfig() first)
   *
   * @example
   * ```typescript
   * const config = new BreakdownConfig();
   * await config.loadConfig();
   * const workingDir = await config.getWorkingDir();
   * console.log(workingDir); // e.g., "/home/user/myproject"
   *
   * // With custom base directory
   * const customConfig = new BreakdownConfig(undefined, "/opt/apps");
   * await customConfig.loadConfig();
   * const customWorkingDir = await customConfig.getWorkingDir();
   * console.log(customWorkingDir); // e.g., "/opt/apps/workspace"
   * ```
   */
  async getWorkingDir(): Promise<string> {
    const result = await this.getWorkingDirSafe();
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data;
  }

  /**
   * Gets the absolute path to the working directory (Result-based API).
   *
   * @returns {Promise<Result<string, UnifiedError>>} The absolute path or error
   */
  async getWorkingDirSafe(): Promise<Result<string, UnifiedError>> {
    const configResult = await this.getConfigSafe();
    if (!configResult.success) {
      return configResult;
    }
    return Result.ok(resolve(this.baseDir, configResult.data.working_dir));
  }

  /**
   * Gets the absolute path to the prompt directory.
   *
   * The prompt directory contains template files and prompts used by the application.
   * This path is resolved by combining the working directory with the configured
   * app_prompt.base_dir value, ensuring a hierarchical directory structure.
   *
   * @returns {Promise<string>} The absolute path to the prompt directory,
   *                            resolved as: baseDir → working_dir → app_prompt.base_dir.
   *                            For example, if baseDir="/project", working_dir="workspace",
   *                            and app_prompt.base_dir="prompts", the result would be
   *                            "/project/workspace/prompts".
   * @throws {Error} If the configuration hasn't been loaded (call loadConfig() first)
   *
   * @example
   * ```typescript
   * const config = new BreakdownConfig();
   * await config.loadConfig();
   * const promptDir = await config.getPromptDir();
   * console.log(promptDir); // e.g., "/home/user/myproject/prompts"
   *
   * // Use the prompt directory to read template files
   * const templatePath = `${promptDir}/templates/email.txt`;
   *
   * // With environment-specific configuration
   * const prodConfig = new BreakdownConfig("production");
   * await prodConfig.loadConfig();
   * const prodPromptDir = await prodConfig.getPromptDir();
   * // May return different path based on production config
   * ```
   */
  async getPromptDir(): Promise<string> {
    const result = await this.getPromptDirSafe();
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data;
  }

  /**
   * Gets the absolute path to the prompt directory (Result-based API).
   *
   * @returns {Promise<Result<string, UnifiedError>>} The absolute path or error
   */
  async getPromptDirSafe(): Promise<Result<string, UnifiedError>> {
    const configResult = await this.getConfigSafe();
    if (!configResult.success) {
      return configResult;
    }
    const workingDirResult = await this.getWorkingDirSafe();
    if (!workingDirResult.success) {
      return workingDirResult;
    }
    return Result.ok(resolve(workingDirResult.data, configResult.data.app_prompt.base_dir));
  }

  /**
   * Gets the absolute path to the schema directory.
   *
   * The schema directory contains JSON schema files, validation schemas,
   * or other structured data definitions used by the application.
   * This path is resolved by combining the working directory with the
   * configured app_schema.base_dir value.
   *
   * @returns {Promise<string>} The absolute path to the schema directory,
   *                            resolved as: baseDir → working_dir → app_schema.base_dir.
   *                            For example, if baseDir="/apps", working_dir="myapp",
   *                            and app_schema.base_dir="schemas", the result would be
   *                            "/apps/myapp/schemas".
   * @throws {Error} If the configuration hasn't been loaded (call loadConfig() first)
   *
   * @example
   * ```typescript
   * const config = new BreakdownConfig();
   * await config.loadConfig();
   * const schemaDir = await config.getSchemaDir();
   * console.log(schemaDir); // e.g., "/home/user/myproject/schemas"
   *
   * // Use the schema directory to load validation schemas
   * const userSchemaPath = `${schemaDir}/user-validation.json`;
   *
   * // Different environments may have different schemas
   * const testConfig = new BreakdownConfig("test", "/test/env");
   * await testConfig.loadConfig();
   * const testSchemaDir = await testConfig.getSchemaDir();
   * // Returns test-specific schema directory
   * ```
   */
  async getSchemaDir(): Promise<string> {
    const result = await this.getSchemaDirSafe();
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data;
  }

  /**
   * Gets the absolute path to the schema directory (Result-based API).
   *
   * @returns {Promise<Result<string, UnifiedError>>} The absolute path or error
   */
  async getSchemaDirSafe(): Promise<Result<string, UnifiedError>> {
    const configResult = await this.getConfigSafe();
    if (!configResult.success) {
      return configResult;
    }
    const workingDirResult = await this.getWorkingDirSafe();
    if (!workingDirResult.success) {
      return workingDirResult;
    }
    return Result.ok(resolve(workingDirResult.data, configResult.data.app_schema.base_dir));
  }
}
