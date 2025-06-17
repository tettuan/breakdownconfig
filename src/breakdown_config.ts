import { resolve } from "@std/path";
import type { MergedConfig } from "./types/merged_config.ts";
import { ConfigManager } from "./config_manager.ts";
import { AppConfigLoader } from "./loaders/app_config_loader.ts";
import { UserConfigLoader } from "./loaders/user_config_loader.ts";
import { ErrorCode, ErrorManager } from "./error_manager.ts";

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
  private configSetName?: string;
  private isConfigLoaded = false;

  /**
   * Creates a new instance of BreakdownConfig.
   * Initializes the configuration manager with the specified configuration set and base directory.
   *
   * @param configSetName - Optional configuration set name (e.g., "production", "development")
   * @param baseDir - Optional base directory for configuration files. Defaults to current directory if not specified.
   */
  constructor(configSetName?: string, baseDir?: string) {
    this.configSetName = configSetName;
    this.baseDir = baseDir ?? "";

    // Validate config set name if provided
    if (this.configSetName && !/^[a-zA-Z0-9-]+$/.test(this.configSetName)) {
      ErrorManager.throwError(
        ErrorCode.INVALID_CONFIG_SET_NAME,
        `Invalid config set name: ${this.configSetName}. Only alphanumeric characters and hyphens are allowed.`,
      );
    }

    const appConfigLoader = new AppConfigLoader(this.baseDir, this.configSetName);
    const userConfigLoader = new UserConfigLoader(this.baseDir, this.configSetName);
    this.configManager = new ConfigManager(appConfigLoader, userConfigLoader);
  }

  /**
   * Loads and merges application and user configurations.
   * Validates the configurations and handles any errors that occur.
   *
   * @throws {Error} If the application configuration is missing or invalid
   * @throws {Error} If the user configuration is invalid (if present)
   */
  async loadConfig(): Promise<void> {
    try {
      const config = await this.configManager.getConfig();
      if (!config.working_dir || config.working_dir.trim() === "") {
        ErrorManager.throwError(
          ErrorCode.APP_CONFIG_INVALID,
          "Invalid application configuration",
        );
      }
      this.isConfigLoaded = true;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      ErrorManager.throwError(ErrorCode.UNKNOWN_ERROR, "An unknown error occurred");
    }
  }

  /**
   * Returns the merged configuration object.
   * Throws an error if the configuration hasn't been loaded yet.
   *
   * @returns {Promise<MergedConfig>} The merged configuration object
   * @throws {Error} If the configuration hasn't been loaded
   */
  async getConfig(): Promise<MergedConfig> {
    if (!this.isConfigLoaded) {
      ErrorManager.throwError(
        ErrorCode.CONFIG_NOT_LOADED,
        "Configuration not loaded - Call loadConfig() first",
      );
    }
    return await this.configManager.getConfig();
  }

  /**
   * Gets the absolute path to the working directory.
   *
   * @returns {Promise<string>} The absolute path to the working directory
   * @throws {Error} If the configuration hasn't been loaded
   */
  async getWorkingDir(): Promise<string> {
    const config = await this.getConfig();
    return resolve(this.baseDir, config.working_dir);
  }

  /**
   * Gets the absolute path to the prompt directory.
   *
   * @returns {Promise<string>} The absolute path to the prompt directory
   * @throws {Error} If the configuration hasn't been loaded
   */
  async getPromptDir(): Promise<string> {
    const config = await this.getConfig();
    const workingDir = await this.getWorkingDir();
    return resolve(workingDir, config.app_prompt.base_dir);
  }

  /**
   * Gets the absolute path to the schema directory.
   *
   * @returns {Promise<string>} The absolute path to the schema directory
   * @throws {Error} If the configuration hasn't been loaded
   */
  async getSchemaDir(): Promise<string> {
    const config = await this.getConfig();
    const workingDir = await this.getWorkingDir();
    return resolve(workingDir, config.app_schema.base_dir);
  }
}
