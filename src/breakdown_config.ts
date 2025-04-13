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
 * const config = new BreakdownConfig();
 * await config.loadConfig();
 * const settings = await config.getConfig();
 * ```
 */
export class BreakdownConfig {
  private configManager: ConfigManager;
  private baseDir: string;
  private isConfigLoaded = false;

  /**
   * Creates a new instance of BreakdownConfig.
   * Initializes the configuration manager with the specified base directory.
   *
   * @param baseDir - Optional base directory for configuration files
   */
  constructor(baseDir: string = "") {
    this.baseDir = baseDir;
    const appConfigLoader = new AppConfigLoader(baseDir);
    const userConfigLoader = new UserConfigLoader(baseDir);
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
