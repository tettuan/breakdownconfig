import type { AppConfig } from "./app_config.ts";
import type { LegacyUserConfig as _LegacyUserConfig, UserConfig } from "./user_config.ts";

// Re-export for test compatibility
export type { AppConfig };
export type { UserConfig };
import { UserConfigGuards as _UserConfigGuards, UserConfigHelpers } from "./user_config.ts";
import type { ValidPath } from "../utils/valid_path.ts";
import { Result } from "./unified_result.ts";
import type { UnifiedError, ValidationViolation } from "../errors/unified_errors.ts";
import { ErrorFactories } from "../errors/unified_errors.ts";

/**
 * Result type for configuration loading operations
 * Represents all possible outcomes when loading a configuration
 */
export type ConfigLoadResult = Result<ValidatedConfig, UnifiedError>;

/**
 * Validated configuration with all paths validated
 * This ensures type safety and prevents runtime errors from invalid paths
 */
export interface ValidatedConfig {
  /**
   * The validated working directory for the application
   */
  working_dir: ValidPath;

  /**
   * Configuration settings for prompt-related functionality with validated paths
   */
  app_prompt: {
    /**
     * Validated base directory for prompt files
     */
    base_dir: ValidPath;
  };

  /**
   * Configuration settings for schema-related functionality with validated paths
   */
  app_schema: {
    /**
     * Validated base directory for schema files
     */
    base_dir: ValidPath;
  };

  /**
   * Optional fields from AppConfig that may be present
   */
  app_name?: string;
  app_version?: string;

  /**
   * Additional validated custom fields
   */
  [key: string]: string | number | boolean | ValidPath | { [key: string]: unknown } | undefined;
}

/**
 * プロファイル統合状態を表すDiscriminated Union
 * Represents the merged state of application and user configurations
 */
export type ConfigProfile = AppOnlyProfile | MergedProfile;

/**
 * アプリケーション設定のみの状態
 * State when only application configuration is loaded
 */
export interface AppOnlyProfile {
  readonly kind: "app-only";
  readonly profileName?: string; // デフォルトプロファイルの場合undefined
  readonly source: {
    appConfigPath: string;
    userConfigAttempted: boolean;
    userConfigExists: false;
  };
  readonly config: {
    working_dir: string;
    app_prompt: {
      base_dir: string;
    };
    app_schema: {
      base_dir: string;
    };
  };
}

/**
 * アプリケーション設定とユーザー設定が統合された状態
 * State when both application and user configurations are merged
 */
export interface MergedProfile {
  readonly kind: "merged";
  readonly profileName?: string; // デフォルトプロファイルの場合undefined
  readonly source: {
    appConfigPath: string;
    userConfigPath: string;
    userConfigExists: true;
  };
  readonly config: {
    working_dir: string;
    app_prompt: {
      base_dir: string;
      [key: string]: unknown;
    };
    app_schema: {
      base_dir: string;
      [key: string]: unknown;
    };
    [key: string]: unknown; // ユーザー設定からの任意フィールド
  };
}

/**
 * ConfigProfile作成のためのSmart Constructor
 * Factory for creating type-safe ConfigProfile instances
 */
export class ConfigProfileFactory {
  private constructor() {}

  /**
   * AppOnlyProfileを作成
   * Creates an application-only profile
   */
  static createAppOnly(
    appConfig: AppConfig,
    profileName: string | undefined,
    appConfigPath: string,
    userConfigAttempted: boolean,
  ): Result<AppOnlyProfile, UnifiedError> {
    // バリデーション
    const validation = this.validateAppConfig(appConfig, appConfigPath);
    if (!validation.success) {
      return validation;
    }

    return Result.ok({
      kind: "app-only",
      profileName,
      source: {
        appConfigPath,
        userConfigAttempted,
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
    });
  }

  /**
   * MergedProfileを作成
   * Creates a merged profile with both application and user configurations
   */
  static createMerged(
    appConfig: AppConfig,
    userConfig: UserConfig,
    profileName: string | undefined,
    appConfigPath: string,
    userConfigPath: string,
  ): Result<MergedProfile, UnifiedError> {
    // バリデーション
    const appValidation = this.validateAppConfig(appConfig, appConfigPath);
    if (!appValidation.success) {
      return appValidation;
    }

    const userValidation = this.validateUserConfig(userConfig, userConfigPath);
    if (!userValidation.success) {
      return userValidation;
    }

    // 統合処理
    const mergedConfig = this.mergeConfigs(appConfig, userConfig);

    return Result.ok({
      kind: "merged",
      profileName,
      source: {
        appConfigPath,
        userConfigPath,
        userConfigExists: true,
      },
      config: mergedConfig,
    });
  }

  private static validateAppConfig(
    config: AppConfig,
    path: string,
  ): Result<void, UnifiedError> {
    const violations: ValidationViolation[] = [];

    if (!config.working_dir || config.working_dir.trim() === "") {
      violations.push({
        field: "working_dir",
        value: config.working_dir,
        expectedType: "non-empty string",
        actualType: "string",
        constraint: "cannot be empty",
      });
    }

    if (!config.app_prompt?.base_dir || config.app_prompt.base_dir.trim() === "") {
      violations.push({
        field: "app_prompt.base_dir",
        value: config.app_prompt?.base_dir,
        expectedType: "non-empty string",
        actualType: "string",
        constraint: "cannot be empty",
      });
    }

    if (!config.app_schema?.base_dir || config.app_schema.base_dir.trim() === "") {
      violations.push({
        field: "app_schema.base_dir",
        value: config.app_schema?.base_dir,
        expectedType: "non-empty string",
        actualType: "string",
        constraint: "cannot be empty",
      });
    }

    if (violations.length > 0) {
      return Result.err(ErrorFactories.configValidationError(path, violations));
    }

    return Result.ok(undefined);
  }

  private static validateUserConfig(
    config: UserConfig,
    path: string,
  ): Result<void, UnifiedError> {
    const violations: ValidationViolation[] = [];

    // Discriminated Union による型安全な検証
    switch (config.kind) {
      case "empty":
        // 空の設定は常に有効
        break;

      case "prompt-only":
        if (!config.app_prompt.base_dir || config.app_prompt.base_dir.trim() === "") {
          violations.push({
            field: "app_prompt.base_dir",
            value: config.app_prompt.base_dir,
            expectedType: "non-empty string",
            actualType: typeof config.app_prompt.base_dir,
            constraint: "cannot be empty",
          });
        }
        break;

      case "schema-only":
        if (!config.app_schema.base_dir || config.app_schema.base_dir.trim() === "") {
          violations.push({
            field: "app_schema.base_dir",
            value: config.app_schema.base_dir,
            expectedType: "non-empty string",
            actualType: typeof config.app_schema.base_dir,
            constraint: "cannot be empty",
          });
        }
        break;

      case "complete":
        if (!config.app_prompt.base_dir || config.app_prompt.base_dir.trim() === "") {
          violations.push({
            field: "app_prompt.base_dir",
            value: config.app_prompt.base_dir,
            expectedType: "non-empty string",
            actualType: typeof config.app_prompt.base_dir,
            constraint: "cannot be empty",
          });
        }
        if (!config.app_schema.base_dir || config.app_schema.base_dir.trim() === "") {
          violations.push({
            field: "app_schema.base_dir",
            value: config.app_schema.base_dir,
            expectedType: "non-empty string",
            actualType: typeof config.app_schema.base_dir,
            constraint: "cannot be empty",
          });
        }
        break;

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = config;
        violations.push({
          field: "kind",
          value: "unknown",
          expectedType: "valid discriminator",
          actualType: "unknown",
          constraint: "must be a valid UserConfig variant",
        });
      }
    }

    if (violations.length > 0) {
      return Result.err(ErrorFactories.configValidationError(path, violations));
    }

    return Result.ok(undefined);
  }

  private static mergeConfigs(
    appConfig: AppConfig,
    userConfig: UserConfig,
  ): MergedProfile["config"] {
    // working_dirは上書き不可
    const mergedConfig: MergedProfile["config"] = {
      working_dir: appConfig.working_dir,
      app_prompt: {
        base_dir: UserConfigHelpers.getPromptBaseDir(userConfig) ?? appConfig.app_prompt.base_dir,
      },
      app_schema: {
        base_dir: UserConfigHelpers.getSchemaBaseDir(userConfig) ?? appConfig.app_schema.base_dir,
      },
    };

    // ユーザー設定のカスタムフィールドを統合
    const customFields = UserConfigHelpers.getCustomFields(userConfig);
    if (customFields) {
      Object.assign(mergedConfig, customFields);
    }

    return mergedConfig;
  }
}

/**
 * ConfigProfile型ガード
 * Type guards for ConfigProfile discrimination
 */
export function isAppOnly(profile: ConfigProfile): profile is AppOnlyProfile {
  return profile.kind === "app-only";
}

export function isMerged(profile: ConfigProfile): profile is MergedProfile {
  return profile.kind === "merged";
}

export function isDefaultProfile(profile: ConfigProfile): boolean {
  return profile.profileName === undefined;
}

export function isNamedProfile(profile: ConfigProfile): boolean {
  return profile.profileName !== undefined;
}

// Compatibility object for existing code
export const ConfigProfileGuards = {
  isAppOnly,
  isMerged,
  isDefaultProfile,
  isNamedProfile,
};

/**
 * ConfigProfileヘルパー関数
 * Helper functions for working with ConfigProfile
 */
export function getProfileDisplayName(profile: ConfigProfile): string {
  return profile.profileName ?? "default";
}

export function getWorkingDir(profile: ConfigProfile): string {
  return profile.config.working_dir;
}

export function getPromptBaseDir(profile: ConfigProfile): string {
  return profile.config.app_prompt.base_dir;
}

export function getSchemaBaseDir(profile: ConfigProfile): string {
  return profile.config.app_schema.base_dir;
}

export function hasUserCustomization(profile: ConfigProfile): boolean {
  return isMerged(profile);
}

export function getConfigPath(profile: ConfigProfile): string {
  return profile.source.appConfigPath;
}

export function getUserConfigPath(profile: ConfigProfile): string | undefined {
  if (isMerged(profile)) {
    return profile.source.userConfigPath;
  }
  return undefined;
}

// Compatibility object for existing code
export const ConfigProfileHelpers = {
  getProfileDisplayName,
  getWorkingDir,
  getPromptBaseDir,
  getSchemaBaseDir,
  hasUserCustomization,
  getConfigPath,
  getUserConfigPath,
};

/**
 * Legacy MergedConfig interface for backward compatibility
 * @deprecated Use ConfigProfile instead
 */
export interface MergedConfig extends AppConfig {
  working_dir: string;
  app_prompt: {
    base_dir: string;
  };
  app_schema: {
    base_dir: string;
  };
  [key: string]: string | number | boolean | null | undefined | { [key: string]: unknown };
}

/**
 * Convert ConfigProfile to legacy MergedConfig format
 * @deprecated This is for backward compatibility only
 */
export function profileToLegacyConfig(profile: ConfigProfile): MergedConfig {
  const config = profile.config;
  const result: MergedConfig = {
    working_dir: config.working_dir,
    app_prompt: {
      base_dir: config.app_prompt.base_dir,
    },
    app_schema: {
      base_dir: config.app_schema.base_dir,
    },
  };

  // Copy additional fields for merged profiles
  if (isMerged(profile)) {
    for (const [key, value] of Object.entries(config)) {
      if (key !== "working_dir" && key !== "app_prompt" && key !== "app_schema") {
        (result as Record<string, unknown>)[key] = value;
      }
    }

    // Copy additional prompt fields
    for (const [key, value] of Object.entries(config.app_prompt)) {
      if (key !== "base_dir") {
        (result.app_prompt as Record<string, unknown>)[key] = value;
      }
    }

    // Copy additional schema fields
    for (const [key, value] of Object.entries(config.app_schema)) {
      if (key !== "base_dir") {
        (result.app_schema as Record<string, unknown>)[key] = value;
      }
    }
  }

  return result;
}
