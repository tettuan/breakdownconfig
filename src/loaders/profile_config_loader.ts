import { join } from "@std/path";
import type { AppConfig } from "../types/app_config.ts";
import type { UserConfig } from "../types/user_config.ts";
import type { ConfigProfile, AppOnlyProfile, MergedProfile } from "../types/merged_config.ts";
import { Result as UnifiedResult } from "../types/unified_result.ts";
import type { UnifiedError } from "../errors/unified_errors.ts";
import { ErrorFactories } from "../errors/unified_errors.ts";
import { AppConfigLoader } from "./app_config_loader.ts";
import { UserConfigLoader } from "./user_config_loader.ts";
import { DefaultPaths } from "../types/app_config.ts";

/**
 * ProfileConfigLoader - Loads and returns ConfigProfile (AppOnlyProfile or MergedProfile)
 * 
 * This loader handles the complete configuration loading process:
 * 1. Loads required application configuration
 * 2. Attempts to load optional user configuration
 * 3. Returns appropriate profile type based on what was loaded
 * 
 * @example Loading default profile
 * ```typescript
 * const loader = new ProfileConfigLoader();
 * const result = await loader.load();
 * 
 * if (result.success) {
 *   switch (result.data.kind) {
 *     case "app-only":
 *       console.log("Using app config only");
 *       break;
 *     case "merged":
 *       console.log("Using merged config");
 *       break;
 *   }
 * }
 * ```
 * 
 * @example Loading named profile
 * ```typescript
 * const loader = new ProfileConfigLoader("production", "/app");
 * const result = await loader.load();
 * 
 * if (result.success) {
 *   console.log("Profile:", result.data.profileName);
 *   console.log("Working dir:", result.data.config.working_dir);
 * }
 * ```
 */
export class ProfileConfigLoader {
  private readonly appLoader: AppConfigLoader;
  private readonly userLoader: UserConfigLoader;

  /**
   * Creates a new ProfileConfigLoader
   * 
   * @param profileName - Optional profile name (e.g., "development", "production")
   * @param baseDir - Base directory for configuration files
   */
  constructor(
    private readonly profileName?: string,
    private readonly baseDir: string = "",
  ) {
    this.appLoader = new AppConfigLoader(profileName, baseDir);
    this.userLoader = new UserConfigLoader(profileName, baseDir);
  }

  /**
   * Loads configuration profile
   * 
   * @returns ConfigProfile (either AppOnlyProfile or MergedProfile)
   */
  async load(): Promise<UnifiedResult<ConfigProfile, UnifiedError>> {
    // First, load the required app configuration
    const appResult = await this.appLoader.loadSafe();
    if (!appResult.success) {
      // Convert ConfigError to UnifiedError
      return UnifiedResult.err(this.convertToUnifiedError(appResult.error));
    }

    const appConfig = appResult.data;
    const appConfigPath = this.getAppConfigPath();

    // Then, attempt to load user configuration
    const userResult = await this.userLoader.load();
    
    // Check if user config exists and is valid
    if (userResult.success && Object.keys(userResult.data).length > 0) {
      // User config exists and loaded successfully - return MergedProfile
      const mergedProfile: MergedProfile = {
        kind: "merged",
        profileName: this.profileName,
        source: {
          appConfigPath,
          userConfigPath: this.getUserConfigPath(),
          userConfigExists: true,
        },
        config: this.mergeConfigs(appConfig, userResult.data),
      };
      return UnifiedResult.ok(mergedProfile);
    } else {
      // User config doesn't exist or is empty - return AppOnlyProfile
      const appOnlyProfile: AppOnlyProfile = {
        kind: "app-only",
        profileName: this.profileName,
        source: {
          appConfigPath,
          userConfigAttempted: true,
          userConfigExists: false,
        },
        config: {
          working_dir: appConfig.working_dir,
          app_prompt: {
            base_dir: appConfig.app_prompt.base_dir,
          },
          app_schema: {
            base_dir: appConfig.app_schema.base_dir,
          },
        },
      };
      return UnifiedResult.ok(appOnlyProfile);
    }
  }

  /**
   * Merges app and user configurations
   */
  private mergeConfigs(appConfig: AppConfig, userConfig: UserConfig): MergedProfile["config"] {
    // Start with app config as base
    const merged: any = {
      working_dir: appConfig.working_dir,
      app_prompt: {
        base_dir: appConfig.app_prompt.base_dir,
      },
      app_schema: {
        base_dir: appConfig.app_schema.base_dir,
      },
    };

    // Apply user overrides
    if (userConfig.working_dir) {
      merged.working_dir = userConfig.working_dir;
    }
    if (userConfig.app_prompt?.base_dir) {
      merged.app_prompt.base_dir = userConfig.app_prompt.base_dir;
    }
    if (userConfig.app_schema?.base_dir) {
      merged.app_schema.base_dir = userConfig.app_schema.base_dir;
    }

    // Copy additional fields from both configs
    const skipFields = ["working_dir", "app_prompt", "app_schema"];
    
    // Copy app config fields
    for (const [key, value] of Object.entries(appConfig)) {
      if (!skipFields.includes(key)) {
        merged[key] = value;
      }
    }

    // Override with user config fields
    for (const [key, value] of Object.entries(userConfig)) {
      if (!skipFields.includes(key)) {
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Gets the app configuration file path
   */
  private getAppConfigPath(): string {
    const configFileName = this.profileName ? `${this.profileName}-app.yml` : "app.yml";
    return this.baseDir
      ? join(this.baseDir, DefaultPaths.WORKING_DIR, "config", configFileName)
      : join(DefaultPaths.WORKING_DIR, "config", configFileName);
  }

  /**
   * Gets the user configuration file path
   */
  private getUserConfigPath(): string {
    const configFileName = this.profileName ? `${this.profileName}-user.yml` : "user.yml";
    return this.baseDir
      ? join(this.baseDir, DefaultPaths.WORKING_DIR, "config", configFileName)
      : join(DefaultPaths.WORKING_DIR, "config", configFileName);
  }

  /**
   * Converts ConfigError to UnifiedError
   */
  private convertToUnifiedError(error: any): UnifiedError {
    switch (error.kind) {
      case "fileNotFound":
        return ErrorFactories.configFileNotFound(error.path, "app");
      case "parseError":
        return ErrorFactories.configParseError(error.path, error.message);
      case "configValidationError":
        return ErrorFactories.configValidationError(error.path, error.errors);
      default:
        return ErrorFactories.unknown(error);
    }
  }
}