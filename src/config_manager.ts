import { AppConfigLoader } from "./loaders/app_config_loader.ts";
import { UserConfigLoader } from "./loaders/user_config_loader.ts";
import type { AppConfig } from "./types/app_config.ts";
import type { UserConfig, LegacyUserConfig } from "./types/user_config.ts";
import { UserConfigFactory, UserConfigGuards, UserConfigHelpers } from "./types/user_config.ts";
import type { MergedConfig } from "./types/merged_config.ts";
import { Result } from "./types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "./errors/unified_errors.ts";

/**
 * Discriminated Union for AppConfig state management
 */
type AppConfigState = 
  | { kind: "uninitialized" }
  | { kind: "loading" }
  | { kind: "loaded"; data: AppConfig }
  | { kind: "error"; error: UnifiedError };

/**
 * Discriminated Union for UserConfig state management
 */
type UserConfigState = 
  | { kind: "uninitialized" }
  | { kind: "loading" }
  | { kind: "loaded"; data: UserConfig }
  | { kind: "not_found" }
  | { kind: "error"; error: UnifiedError };

/**
 * Discriminated Union for overall configuration state
 */
type ConfigManagerState = 
  | { kind: "uninitialized" }
  | { kind: "loading" }
  | { kind: "loaded"; config: MergedConfig }
  | { kind: "error"; error: UnifiedError };

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
  private appConfigState: AppConfigState = { kind: "uninitialized" };
  private userConfigState: UserConfigState = { kind: "uninitialized" };
  private managerState: ConfigManagerState = { kind: "uninitialized" };

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
   * Gets the current state of the configuration manager
   * @returns The current state
   */
  public getState(): ConfigManagerState {
    return this.managerState;
  }

  /**
   * Checks if the configuration is currently loaded
   * @returns True if configuration is loaded, false otherwise
   */
  public isLoaded(): boolean {
    return this.managerState.kind === "loaded";
  }

  /**
   * Checks if the configuration is currently in an error state
   * @returns True if in error state, false otherwise
   */
  public isInError(): boolean {
    return this.managerState.kind === "error";
  }

  /**
   * Checks if the configuration is currently loading
   * @returns True if loading, false otherwise
   */
  public isLoading(): boolean {
    return this.managerState.kind === "loading";
  }

  /**
   * Resets the configuration manager state to uninitialized
   * This forces a reload on the next access
   */
  public reset(): void {
    this.managerState = { kind: "uninitialized" };
    this.appConfigState = { kind: "uninitialized" };
    this.userConfigState = { kind: "uninitialized" };
  }

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
    // Return cached result if already loaded
    if (this.managerState.kind === "loaded") {
      return Result.ok(this.managerState.config);
    }

    // Return cached error if in error state
    if (this.managerState.kind === "error") {
      return Result.err(this.managerState.error);
    }

    // Set loading state
    this.managerState = { kind: "loading" };

    try {
      const appConfigResult = await this.loadAppConfigSafe();
      if (!appConfigResult.success) {
        this.managerState = { kind: "error", error: appConfigResult.error };
        return appConfigResult;
      }

      const userConfigResult = await this.loadUserConfigSafe();
      if (!userConfigResult.success) {
        this.managerState = { kind: "error", error: userConfigResult.error };
        return userConfigResult;
      }

      const mergeResult = this.mergeConfigs(appConfigResult.data, userConfigResult.data as unknown as LegacyUserConfig);
      if (!mergeResult.success) {
        this.managerState = { kind: "error", error: mergeResult.error };
        return mergeResult;
      }

      // Update to loaded state
      this.managerState = { kind: "loaded", config: mergeResult.data };
      return Result.ok(mergeResult.data);
    } catch (error) {
      const unifiedError = ErrorFactories.unknown(error, "getConfigSafe");
      this.managerState = { kind: "error", error: unifiedError };
      return Result.err(unifiedError);
    }
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
    // Return cached result if already loaded
    if (this.appConfigState.kind === "loaded") {
      return Result.ok(this.appConfigState.data);
    }

    // Return cached error if in error state
    if (this.appConfigState.kind === "error") {
      return Result.err(this.appConfigState.error);
    }

    // Set loading state
    this.appConfigState = { kind: "loading" };

    try {
      const result = await this.appConfigLoader.loadSafe();
      if (result.success) {
        this.appConfigState = { kind: "loaded", data: result.data };
        return Result.ok(result.data);
      }

      // Convert ConfigError to UnifiedError
      const error = result.error;
      let unifiedError: UnifiedError;
      
      if (error.kind === "fileNotFound") {
        unifiedError = ErrorFactories.configFileNotFound(error.path, "app");
      } else if (error.kind === "parseError") {
        unifiedError = ErrorFactories.configParseError(error.path, error.message, error.line, error.column);
      } else if (error.kind === "configValidationError") {
        const violations = error.errors.map((e: any) => ({
          field: e.field,
          value: e.value,
          expectedType: e.expectedType,
          actualType: typeof e.value,
          constraint: e.message,
        }));
        unifiedError = ErrorFactories.configValidationError(error.path, violations);
      } else {
        unifiedError = ErrorFactories.unknown(error, "loadAppConfig");
      }

      this.appConfigState = { kind: "error", error: unifiedError };
      return Result.err(unifiedError);
    } catch (error) {
      const unifiedError = ErrorFactories.unknown(error, "loadAppConfigSafe");
      this.appConfigState = { kind: "error", error: unifiedError };
      return Result.err(unifiedError);
    }
  }

  /**
   * Loads the user configuration.
   *
   * @returns {Promise<UserConfig>} The loaded user configuration
   * @throws {Error} If the user configuration is invalid
   */
  private async loadUserConfig(): Promise<LegacyUserConfig> {
    const result = await this.loadUserConfigSafe();
    if (result.success) {
      return result.data as unknown as LegacyUserConfig;
    } else {
      return {} as LegacyUserConfig;
    }
  }

  /**
   * Loads the user configuration (Result-based API).
   *
   * @returns {Promise<Result<UserConfig, UnifiedError>>} The loaded user configuration or error
   */
  private async loadUserConfigSafe(): Promise<Result<UserConfig, UnifiedError>> {
    // Return cached result if already loaded
    if (this.userConfigState.kind === "loaded") {
      // Convert back to legacy format for compatibility
      const legacyData = UserConfigFactory.toLegacy(this.userConfigState.data);
      return Result.ok(legacyData as any);
    }

    // Return empty config if already determined not found
    if (this.userConfigState.kind === "not_found") {
      return Result.ok({} as any);
    }

    // Return cached error if in error state
    if (this.userConfigState.kind === "error") {
      return Result.err(this.userConfigState.error);
    }

    // Set loading state
    this.userConfigState = { kind: "loading" };

    try {
      const result = await this.userConfigLoader.load();
      if (result.success) {
        // For now, maintain backward compatibility with legacy format
        const userData = result.data as unknown as LegacyUserConfig || {} as LegacyUserConfig;
        // Convert to new discriminated union format for internal state management
        const discriminatedUserData = UserConfigFactory.fromLegacy(userData);
        this.userConfigState = { kind: "loaded", data: discriminatedUserData };
        // But return the legacy format for compatibility
        return Result.ok(userData as any);
      }
      
      // User config is optional, so we treat failure as "not found"
      this.userConfigState = { kind: "not_found" };
      return Result.ok({} as any);
    } catch (error) {
      const unifiedError = ErrorFactories.unknown(error, "loadUserConfigSafe");
      this.userConfigState = { kind: "error", error: unifiedError };
      return Result.err(unifiedError);
    }
  }

  /**
   * Merges application and user configurations according to the rules:
   * 1. User settings override application settings
   * 2. For nested configurations, override occurs at the highest level
   * 3. Lower-level items are preserved unless explicitly overridden
   * 4. Uses type-safe state management with discriminated unions internally
   *
   * @param appConfig - The application configuration
   * @param userConfig - The user configuration (legacy format)
   * @returns {Result<MergedConfig, UnifiedError>} The merged configuration or error
   */
  private mergeConfigs(
    appConfig: AppConfig,
    userConfig: LegacyUserConfig,
  ): Result<MergedConfig, UnifiedError> {
    try {
      // Start with app config as base
      const mergedConfig: MergedConfig = {
        working_dir: String(appConfig.working_dir),
        app_prompt: {
          base_dir: String(appConfig.app_prompt.base_dir),
        },
        app_schema: {
          base_dir: String(appConfig.app_schema.base_dir),
        },
      };

      // Override with user config using legacy format for compatibility
      if (userConfig.app_prompt?.base_dir) {
        mergedConfig.app_prompt.base_dir = String(userConfig.app_prompt.base_dir);
      }

      if (userConfig.app_schema?.base_dir) {
        mergedConfig.app_schema.base_dir = String(userConfig.app_schema.base_dir);
      }

      // Add custom fields if they exist
      for (const [key, value] of Object.entries(userConfig)) {
        if (key !== "app_prompt" && key !== "app_schema" && value !== undefined && !(key in mergedConfig)) {
          (mergedConfig as any)[key] = String(value);
        }
      }

      return Result.ok(mergedConfig);
    } catch (error) {
      return Result.err(ErrorFactories.configMergeError(error));
    }
  }
}
