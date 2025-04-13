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
  private config: MergedConfig = {
    working_dir: "",
    app_prompt: { base_dir: "" },
    app_schema: { base_dir: "" },
  };

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
  public async getConfig(): Promise<MergedConfig> {
    if (this.isLoaded) {
      return this.config;
    }

    try {
      const appConfig = await this.loadAppConfig();
      const userConfig = await this.loadUserConfig();
      this.config = this.mergeConfigs(appConfig, userConfig);
      this.isLoaded = true;
      return this.config;
    } catch (_error) {
      if (_error instanceof Error) {
        throw _error;
      }
      ErrorManager.throwError(ErrorCode.APP_CONFIG_INVALID, "Invalid application configuration");
    }
  }

  /**
   * Loads the application configuration.
   *
   * @returns {Promise<AppConfig>} The loaded application configuration
   * @throws {Error} If the application configuration is invalid
   */
  private async loadAppConfig(): Promise<AppConfig> {
    try {
      this.appConfig = await this.appConfigLoader.load();
      if (!this.appConfig) {
        ErrorManager.throwError(
          ErrorCode.APP_CONFIG_NOT_FOUND,
          "Application configuration file not found",
        );
      }
      return this.appConfig;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      ErrorManager.throwError(ErrorCode.APP_CONFIG_INVALID, "Invalid application configuration");
    }
  }

  /**
   * Loads the user configuration.
   *
   * @returns {Promise<UserConfig>} The loaded user configuration
   * @throws {Error} If the user configuration is invalid
   */
  private async loadUserConfig(): Promise<UserConfig> {
    try {
      this.userConfig = await this.userConfigLoader.load();
      if (!this.userConfig) {
        return {} as UserConfig; // Return empty config if not found
      }
      return this.userConfig;
    } catch (_error) {
      // User config is optional, so we return empty config on error
      return {} as UserConfig;
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
  private mergeConfigs(
    appConfig: AppConfig,
    userConfig: UserConfig | null | undefined,
  ): MergedConfig {
    const mergedConfig: MergedConfig = {
      working_dir: String(userConfig?.working_dir || appConfig.working_dir),
      app_prompt: {
        base_dir: userConfig?.app_prompt?.base_dir
          ? String(userConfig.app_prompt.base_dir)
          : String(appConfig.app_prompt.base_dir),
      },
      app_schema: {
        base_dir: userConfig?.app_schema?.base_dir
          ? String(userConfig.app_schema.base_dir)
          : String(appConfig.app_schema.base_dir),
      },
    };

    // If userConfig exists, merge any additional fields
    if (userConfig) {
      for (const [key, value] of Object.entries(userConfig)) {
        if (!(key in mergedConfig)) {
          mergedConfig[key] = String(value);
        }
      }
    }

    return mergedConfig;
  }
}
