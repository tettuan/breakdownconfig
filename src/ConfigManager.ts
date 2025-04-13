import { AppConfigLoader } from "./loaders/app_config_loader.ts";
import { UserConfigLoader } from "./loaders/user_config_loader.ts";
import type { AppConfig } from "./types/app_config.ts";
import type { UserConfig } from "./types/user_config.ts";
import type { MergedConfig } from "./types/merged_config.ts";
import { ErrorCode, ErrorManager } from "./error_manager.ts";

/**
 * Manages the loading and merging of application and user configurations.
 * This class is responsible for coordinating the loading of configurations
 * from both application-specific and user-specific locations, and merging
 * them according to the defined rules.
 *
 * @example
 * ```typescript
 * const appLoader = new AppConfigLoader();
 * const userLoader = new UserConfigLoader();
 * const manager = new ConfigManager(appLoader, userLoader);
 * const config = await manager.getConfig();
 * ```
 */
export class ConfigManager {
  private appConfig: AppConfig | null = null;
  private userConfig: UserConfig | null = null;
  private isLoaded = false;

  /**
   * Creates a new instance of ConfigManager.
   *
   * @param appConfigLoader - Loader for application configuration
   * @param userConfigLoader - Loader for user configuration
   */
  constructor(
    private readonly appConfigLoader: AppConfigLoader,
    private readonly userConfigLoader: UserConfigLoader,
  ) {}

  /**
   * Loads and merges the application and user configurations.
   * If configurations are already loaded, returns the cached result.
   *
   * @returns {Promise<MergedConfig>} The merged configuration
   * @throws {Error} If the application configuration is invalid
   */
  async getConfig(): Promise<MergedConfig> {
    if (!this.isLoaded) {
      try {
        this.appConfig = await this.appConfigLoader.load();
        this.validateConfig(this.appConfig);
        this.userConfig = await this.userConfigLoader.load();
        this.isLoaded = true;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        ErrorManager.throwError(
          ErrorCode.UNKNOWN_ERROR,
          "Failed to load configuration",
        );
      }
    }

    if (!this.appConfig) {
      ErrorManager.throwError(
        ErrorCode.CONFIG_NOT_LOADED,
        "Configuration not loaded - Call loadConfig() first",
      );
    }

    if (!this.isLoaded) {
      ErrorManager.throwError(
        ErrorCode.CONFIG_NOT_LOADED,
        "Configuration not loaded",
      );
    }

    return this.mergeConfigs(this.appConfig, this.userConfig);
  }

  /**
   * Validates the configuration.
   *
   * @param config - The configuration to validate
   * @throws {Error} If the configuration is invalid
   */
  private validateConfig(config: AppConfig | MergedConfig): void {
    if (!config.working_dir || config.working_dir.trim() === "") {
      ErrorManager.throwError(
        ErrorCode.APP_CONFIG_INVALID,
        "Invalid application configuration",
      );
    }
  }

  /**
   * Merges application and user configurations according to the rules:
   * 1. User settings override application settings
   * 2. For nested configurations, override occurs at the highest level
   * 3. Lower-level items are preserved unless explicitly overridden
   *
   * @param appConfig - The application configuration
   * @param userConfig - The user configuration (optional)
   * @returns {MergedConfig} The merged configuration
   */
  private mergeConfigs(appConfig: AppConfig, userConfig: UserConfig | null): MergedConfig {
    if (!userConfig) {
      return appConfig as MergedConfig;
    }

    const merged: MergedConfig = {
      ...appConfig,
      working_dir:
        typeof userConfig.working_dir === "string" && userConfig.working_dir.trim() !== ""
          ? userConfig.working_dir
          : appConfig.working_dir,
      app_prompt: {
        ...appConfig.app_prompt,
        base_dir: userConfig.app_prompt?.base_dir || appConfig.app_prompt.base_dir,
      },
      app_schema: {
        ...appConfig.app_schema,
        base_dir: userConfig.app_schema?.base_dir || appConfig.app_schema.base_dir,
      },
    };

    // Handle additional fields from user config
    for (const [key, value] of Object.entries(userConfig)) {
      if (!(key in merged)) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }

    return merged;
  }
}
