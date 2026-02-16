import type { AppConfigLoader } from "./loaders/app_config_loader.ts";
import type { UserConfigLoader } from "./loaders/user_config_loader.ts";
import type { AppConfig } from "./types/app_config.ts";
import type { LegacyUserConfig, UserConfig } from "./types/user_config.ts";
import { UserConfigFactory, UserConfigGuards } from "./types/user_config.ts";
import type { MergedConfig } from "./types/merged_config.ts";
import { Result } from "./types/unified_result.ts";
import { ErrorFactories, type UnifiedError } from "./errors/unified_errors.ts";

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

      // Convert UserConfig back to legacy format for merging
      const legacyUserConfig = UserConfigFactory.toLegacy(userConfigResult.data);
      const mergeResult = this.mergeConfigs(appConfigResult.data, legacyUserConfig);
      if (!mergeResult.success) {
        this.managerState = { kind: "error", error: mergeResult.error };
        return mergeResult;
      }

      // Update to loaded state
      this.managerState = { kind: "loaded", config: mergeResult.data };
      return Result.ok(mergeResult.data);
    } catch (error) {
      const unifiedError = ErrorFactories.unknown(
        error ? error : new Error(String(error)),
        "getConfigSafe",
      );
      this.managerState = { kind: "error", error: unifiedError };
      return Result.err(unifiedError);
    }
  }

  /**
   * Loads the application configuration (Result-based API).
   * AppConfigLoader.loadSafe() returns Result<AppConfig, UnifiedError> directly.
   */
  private async loadAppConfigSafe(): Promise<Result<AppConfig, UnifiedError>> {
    if (this.appConfigState.kind === "loaded") {
      return Result.ok(this.appConfigState.data);
    }
    if (this.appConfigState.kind === "error") {
      return Result.err(this.appConfigState.error);
    }

    this.appConfigState = { kind: "loading" };

    try {
      const result = await this.appConfigLoader.loadSafe();
      if (result.success) {
        this.appConfigState = { kind: "loaded", data: result.data };
      } else {
        this.appConfigState = { kind: "error", error: result.error };
      }
      return result;
    } catch (error) {
      const unifiedError = ErrorFactories.unknown(error, "loadAppConfigSafe");
      this.appConfigState = { kind: "error", error: unifiedError };
      return Result.err(unifiedError);
    }
  }

  /**
   * Loads the user configuration (Result-based API).
   * UserConfigLoader.load() returns Result<UserConfig | null, UnifiedError> directly.
   */
  private async loadUserConfigSafe(): Promise<Result<UserConfig, UnifiedError>> {
    if (this.userConfigState.kind === "loaded") {
      return Result.ok(this.userConfigState.data);
    }
    if (this.userConfigState.kind === "not_found") {
      return Result.ok(UserConfigFactory.createEmpty());
    }
    if (this.userConfigState.kind === "error") {
      return Result.err(this.userConfigState.error);
    }

    this.userConfigState = { kind: "loading" };

    try {
      const result = await this.userConfigLoader.load();
      if (result.success) {
        if (result.data === null) {
          this.userConfigState = { kind: "not_found" };
          return Result.ok(UserConfigFactory.createEmpty());
        }
        // UserConfigLoader already returns UserConfig (discriminated union)
        this.userConfigState = { kind: "loaded", data: result.data };
        return Result.ok(result.data);
      }

      // User config is optional, treat failure as "not found"
      this.userConfigState = { kind: "not_found" };
      return Result.ok(UserConfigFactory.createEmpty());
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
   * 5. Handles large configurations (10MB+) with thousands of config items
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
      // Deep clone app config to avoid reference issues with large configs
      const appConfigCopy = this.deepCloneConfig(appConfig as unknown as Record<string, unknown>);

      // Start with complete app config as base - ensuring ALL fields are preserved
      const mergedConfig: MergedConfig = {
        "working_dir": String(appConfigCopy.working_dir || ""),
        "app_prompt": {
          "base_dir": this.safeGetBaseDir(appConfigCopy.app_prompt),
          // Deep clone additional app_prompt fields to prevent reference issues
          ...this.deepCloneNestedFields(appConfigCopy.app_prompt as Record<string, unknown>, [
            "base_dir",
          ]),
        },
        "app_schema": {
          "base_dir": this.safeGetBaseDir(appConfigCopy.app_schema),
          // Deep clone additional app_schema fields to prevent reference issues
          ...this.deepCloneNestedFields(appConfigCopy.app_schema as Record<string, unknown>, [
            "base_dir",
          ]),
        },
      };

      // Copy ALL additional fields from app config (handles large configs with thousands of items)
      this.copyAdditionalFields(appConfigCopy, mergedConfig, [
        "working_dir",
        "app_prompt",
        "app_schema",
      ]);

      // Apply user config overrides with proper type handling
      this.applyUserConfigOverrides(userConfig, mergedConfig);

      return Result.ok(mergedConfig);
    } catch (error) {
      return Result.err(ErrorFactories.configMergeError(error));
    }
  }

  /**
   * Safely extracts base_dir from configuration object following Total Function principle
   * Always returns a string, never throws exceptions
   *
   * @param configObj - Configuration object that may contain base_dir
   * @returns {string} The base_dir value or empty string if not found/invalid
   */
  private safeGetBaseDir(configObj: unknown): string {
    // Handle null or undefined
    if (configObj === null || configObj === undefined) {
      return "";
    }

    // Ensure it's an object
    if (typeof configObj !== "object") {
      return "";
    }

    // Type-safe access to base_dir property
    const obj = configObj as Record<string, unknown>;
    const baseDir = obj.base_dir;

    // Ensure base_dir is a string
    if (typeof baseDir === "string") {
      return baseDir;
    }

    // For any other type, return empty string (Total Function - no exceptions)
    return "";
  }

  /**
   * Deep clone configuration object to prevent reference issues
   * Optimized for large configurations
   */
  private deepCloneConfig(config: Record<string, unknown>): Record<string, unknown> {
    try {
      return JSON.parse(JSON.stringify(config));
    } catch (_error) {
      // Fallback for non-serializable values
      const clone: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(config)) {
        if (value !== undefined && value !== null) {
          clone[key] = typeof value === "object"
            ? { ...(value as Record<string, unknown>) }
            : value;
        }
      }
      return clone;
    }
  }

  /**
   * Deep clone nested fields from an object with exclusions
   */
  private deepCloneNestedFields(
    obj: Record<string, unknown> | undefined,
    excludeKeys: string[],
  ): Record<string, unknown> {
    if (!obj || typeof obj !== "object") return {};

    const cloned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!excludeKeys.includes(key) && value !== undefined) {
        // Deep clone complex objects to prevent reference issues
        if (typeof value === "object" && value !== null) {
          try {
            cloned[key] = JSON.parse(JSON.stringify(value));
          } catch {
            cloned[key] = value;
          }
        } else {
          cloned[key] = value;
        }
      }
    }
    return cloned;
  }

  /**
   * Copy additional fields from source to target configuration
   * Handles large numbers of config items efficiently
   */
  private copyAdditionalFields(
    source: Record<string, unknown>,
    target: MergedConfig,
    excludeKeys: string[],
  ): void {
    const targetRecord = target as Record<string, unknown>;

    for (const [key, value] of Object.entries(source)) {
      if (!excludeKeys.includes(key) && value !== undefined) {
        targetRecord[key] = value;
      }
    }
  }

  /**
   * Apply user config overrides with proper nested object handling
   */
  private applyUserConfigOverrides(
    userConfig: LegacyUserConfig,
    mergedConfig: MergedConfig,
  ): void {
    // Convert legacy user config to discriminated union for safe access
    const discriminatedUserConfig = UserConfigFactory.fromLegacy(userConfig);

    // Handle app_prompt overrides using type guards
    if (UserConfigGuards.hasPromptConfig(discriminatedUserConfig)) {
      mergedConfig.app_prompt.base_dir = String(discriminatedUserConfig.app_prompt.base_dir);
    }

    // Apply additional app_prompt fields from user config with deep merge
    if (UserConfigGuards.hasPromptConfig(discriminatedUserConfig)) {
      const promptConfig = mergedConfig.app_prompt as Record<string, unknown>;

      for (const [key, value] of Object.entries(discriminatedUserConfig.app_prompt)) {
        if (key !== "base_dir" && value !== undefined) {
          // For object values like templates, perform deep merge
          if (
            typeof value === "object" && value !== null &&
            typeof promptConfig[key] === "object" && promptConfig[key] !== null
          ) {
            const existingObj = promptConfig[key] as Record<string, unknown>;
            const userObj = value as Record<string, unknown>;

            // Deep merge object properties
            for (const [objKey, objValue] of Object.entries(userObj)) {
              if (objValue !== undefined) {
                existingObj[objKey] = objValue;
              }
            }
          } else {
            // For non-objects, simple replacement
            promptConfig[key] = value;
          }
        }
      }
    }

    // Handle app_schema overrides using type guards
    if (UserConfigGuards.hasSchemaConfig(discriminatedUserConfig)) {
      mergedConfig.app_schema.base_dir = String(discriminatedUserConfig.app_schema.base_dir);
    }

    // Apply additional app_schema fields from user config with deep merge
    if (UserConfigGuards.hasSchemaConfig(discriminatedUserConfig)) {
      const schemaConfig = mergedConfig.app_schema as Record<string, unknown>;
      for (const [key, value] of Object.entries(discriminatedUserConfig.app_schema)) {
        if (key !== "base_dir" && value !== undefined) {
          // For object values, perform deep merge
          if (
            typeof value === "object" && value !== null &&
            typeof schemaConfig[key] === "object" && schemaConfig[key] !== null
          ) {
            const existingObj = schemaConfig[key] as Record<string, unknown>;
            const userObj = value as Record<string, unknown>;

            // Deep merge object properties
            for (const [objKey, objValue] of Object.entries(userObj)) {
              if (objValue !== undefined) {
                existingObj[objKey] = objValue;
              }
            }
          } else {
            // For non-objects, simple replacement
            schemaConfig[key] = value;
          }
        }
      }
    }

    // Apply all other user config fields with deep merge for objects
    const mergedRecord = mergedConfig as Record<string, unknown>;
    for (const [key, value] of Object.entries(userConfig)) {
      if (key !== "app_prompt" && key !== "app_schema" && value !== undefined) {
        // Handle special case for UserConfig internal fields
        if (key === "kind" || key === "customFields") {
          // Skip internal UserConfig structure fields - customFields should be expanded
          if (key === "customFields" && typeof value === "object" && value !== null) {
            // Expand customFields properties at the root level
            const customFieldsObj = value as Record<string, unknown>;
            for (const [customKey, customValue] of Object.entries(customFieldsObj)) {
              if (customValue !== undefined) {
                // Apply the same deep merge logic to custom fields
                if (
                  typeof customValue === "object" && customValue !== null &&
                  typeof mergedRecord[customKey] === "object" && mergedRecord[customKey] !== null
                ) {
                  const existingObj = mergedRecord[customKey] as Record<string, unknown>;
                  const userObj = customValue as Record<string, unknown>;

                  // Deep merge object properties
                  for (const [objKey, objValue] of Object.entries(userObj)) {
                    if (objValue !== undefined) {
                      existingObj[objKey] = objValue;
                    }
                  }
                } else {
                  // For non-objects, simple replacement
                  mergedRecord[customKey] = customValue;
                }
              }
            }
          }
          continue;
        }

        // For object values, perform deep merge instead of complete replacement
        if (
          typeof value === "object" && value !== null &&
          typeof mergedRecord[key] === "object" && mergedRecord[key] !== null
        ) {
          const existingObj = mergedRecord[key] as Record<string, unknown>;
          const userObj = value as Record<string, unknown>;

          // Deep merge object properties
          for (const [objKey, objValue] of Object.entries(userObj)) {
            if (objValue !== undefined) {
              existingObj[objKey] = objValue;
            }
          }
        } else {
          // For non-objects, simple replacement
          mergedRecord[key] = value;
        }
      }
    }
  }
}
