import { AppConfigLoader } from "./loaders/app_config_loader.ts";
import { UserConfigLoader } from "./loaders/user_config_loader.ts";
import type { AppConfig } from "./types/app_config.ts";
import type { UserConfig } from "./types/user_config.ts";
import type { MergedConfig } from "./types/merged_config.ts";
import { Result } from "./types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "./errors/unified_errors.ts";

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
    const result = await this.getConfigSafe();
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error.message);
    }
  }

  /**
   * Loads and merges the application and user configurations (Result-based API).
   * If configurations are already loaded, returns the cached result.
   *
   * @returns {Promise<Result<MergedConfig, UnifiedError>>} The merged configuration or error
   */
  public async getConfigSafe(): Promise<Result<MergedConfig, UnifiedError>> {
    if (this.isLoaded) {
      return Result.ok(this.config);
    }

    const appConfigResult = await this.loadAppConfigSafe();
    if (!appConfigResult.success) {
      return appConfigResult;
    }

    const userConfigResult = await this.loadUserConfigSafe();
    if (!userConfigResult.success) {
      return userConfigResult;
    }

    const mergeResult = this.mergeConfigs(appConfigResult.data, userConfigResult.data);
    if (!mergeResult.success) {
      return mergeResult;
    }

    this.config = mergeResult.data;
    this.isLoaded = true;
    return Result.ok(this.config);
  }

  /**
   * Loads the application configuration.
   *
   * @returns {Promise<AppConfig>} The loaded application configuration
   * @throws {Error} If the application configuration is invalid
   */
  private async loadAppConfig(): Promise<AppConfig> {
    const result = await this.loadAppConfigSafe();
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error.message);
    }
  }

  /**
   * Loads the application configuration (Result-based API).
   *
   * @returns {Promise<Result<AppConfig, UnifiedError>>} The loaded application configuration or error
   */
  private async loadAppConfigSafe(): Promise<Result<AppConfig, UnifiedError>> {
    const result = await this.appConfigLoader.loadSafe();
    if (result.success) {
      this.appConfig = result.data;
      return Result.ok(result.data);
    }

    // Convert ConfigError to UnifiedError
    const error = result.error;
    if (error.kind === "fileNotFound") {
      return Result.err(ErrorFactories.configFileNotFound(error.path, "app"));
    } else if (error.kind === "parseError") {
      return Result.err(
        ErrorFactories.configParseError(error.path, error.message, error.line, error.column),
      );
    } else if (error.kind === "configValidationError") {
      const violations = error.errors.map((e: any) => ({
        field: e.field,
        value: e.value,
        expectedType: e.expectedType,
        actualType: typeof e.value,
        constraint: e.message,
      }));
      return Result.err(ErrorFactories.configValidationError(error.path, violations));
    } else {
      return Result.err(ErrorFactories.unknown(error, "loadAppConfig"));
    }
  }

  /**
   * Loads the user configuration.
   *
   * @returns {Promise<UserConfig>} The loaded user configuration
   * @throws {Error} If the user configuration is invalid
   */
  private async loadUserConfig(): Promise<UserConfig> {
    const result = await this.loadUserConfigSafe();
    if (result.success) {
      return result.data;
    } else {
      return {} as UserConfig;
    }
  }

  /**
   * Loads the user configuration (Result-based API).
   *
   * @returns {Promise<Result<UserConfig, UnifiedError>>} The loaded user configuration or error
   */
  private async loadUserConfigSafe(): Promise<Result<UserConfig, UnifiedError>> {
    const result = await this.userConfigLoader.load();
    if (result.success) {
      this.userConfig = result.data;
      return Result.ok(result.data || {} as UserConfig);
    }
    // User config is optional, so we return empty config on error
    return Result.ok({} as UserConfig);
  }

  /**
   * Merges application and user configurations according to the rules:
   * 1. User settings override application settings
   * 2. For nested configurations, override occurs at the highest level
   * 3. Lower-level items are preserved unless explicitly overridden
   *
   * @param appConfig - The application configuration
   * @param userConfig - The user configuration (optional)
   * @returns {Result<MergedConfig, UnifiedError>} The merged configuration or error
   */
  private mergeConfigs(
    appConfig: AppConfig,
    userConfig: UserConfig | null | undefined,
  ): Result<MergedConfig, UnifiedError> {
    try {
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

      // If userConfig exists, merge additional fields
      if (userConfig) {
        for (const [key, value] of Object.entries(userConfig)) {
          if (!(key in mergedConfig)) {
            (mergedConfig as any)[key] = String(value);
          }
        }
      }

      return Result.ok(mergedConfig);
    } catch (error) {
      return Result.err(ErrorFactories.configMergeError(error));
    }
  }
}
