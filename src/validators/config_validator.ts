import { ErrorCode, ErrorManager } from "../error_manager.ts";
import type { AppConfig } from "../types/app_config.ts";
import type { UserConfig } from "../types/user_config.ts";

export class ConfigValidator {
  static validateAppConfig(config: unknown): asserts config is AppConfig {
    if (!config || typeof config !== "object") {
      ErrorManager.throwError(ErrorCode.APP_CONFIG_INVALID, "Configuration must be an object");
    }

    const { working_dir, app_prompt, app_schema } = config as Partial<AppConfig>;

    if (!working_dir || typeof working_dir !== "string") {
      ErrorManager.throwError(
        ErrorCode.REQUIRED_FIELD_MISSING,
        "working_dir is required and must be a string",
      );
    }

    if (!app_prompt || typeof app_prompt !== "object") {
      ErrorManager.throwError(
        ErrorCode.REQUIRED_FIELD_MISSING,
        "app_prompt is required and must be an object",
      );
    }

    if (!app_prompt.base_dir || typeof app_prompt.base_dir !== "string") {
      ErrorManager.throwError(
        ErrorCode.REQUIRED_FIELD_MISSING,
        "app_prompt.base_dir is required and must be a string",
      );
    }

    if (!app_schema || typeof app_schema !== "object") {
      ErrorManager.throwError(
        ErrorCode.REQUIRED_FIELD_MISSING,
        "app_schema is required and must be an object",
      );
    }

    if (!app_schema.base_dir || typeof app_schema.base_dir !== "string") {
      ErrorManager.throwError(
        ErrorCode.REQUIRED_FIELD_MISSING,
        "app_schema.base_dir is required and must be a string",
      );
    }

    this.validatePath(working_dir);
    this.validatePath(app_prompt.base_dir);
    this.validatePath(app_schema.base_dir);
  }

  static validateUserConfig(config: unknown): asserts config is UserConfig {
    if (!config || typeof config !== "object") {
      ErrorManager.throwError(ErrorCode.USER_CONFIG_INVALID, "Configuration must be an object");
    }

    const userConfig = config as UserConfig;

    if (userConfig.app_prompt) {
      if (typeof userConfig.app_prompt !== "object") {
        ErrorManager.throwError(ErrorCode.INVALID_FIELD_TYPE, "app_prompt must be an object");
      }
      if (userConfig.app_prompt.base_dir) {
        if (typeof userConfig.app_prompt.base_dir !== "string") {
          ErrorManager.throwError(
            ErrorCode.INVALID_FIELD_TYPE,
            "app_prompt.base_dir must be a string",
          );
        }
        this.validatePath(userConfig.app_prompt.base_dir);
      }
    }

    if (userConfig.app_schema) {
      if (typeof userConfig.app_schema !== "object") {
        ErrorManager.throwError(ErrorCode.INVALID_FIELD_TYPE, "app_schema must be an object");
      }
      if (userConfig.app_schema.base_dir) {
        if (typeof userConfig.app_schema.base_dir !== "string") {
          ErrorManager.throwError(
            ErrorCode.INVALID_FIELD_TYPE,
            "app_schema.base_dir must be a string",
          );
        }
        this.validatePath(userConfig.app_schema.base_dir);
      }
    }
  }

  private static validatePath(path: string): void {
    // パスに使用できない文字のチェック
    const invalidChars = /[<>:"|?*]/g;
    if (invalidChars.test(path)) {
      ErrorManager.throwError(
        ErrorCode.INVALID_PATH_FORMAT,
        `Path contains invalid characters: ${path}`,
      );
    }

    // パストラバーサルのチェック
    if (path.includes("..")) {
      ErrorManager.throwError(
        ErrorCode.PATH_TRAVERSAL_DETECTED,
        `Path traversal detected in: ${path}`,
      );
    }

    // 絶対パスのチェック
    if (path.startsWith("/")) {
      ErrorManager.throwError(
        ErrorCode.ABSOLUTE_PATH_NOT_ALLOWED,
        `Absolute path not allowed: ${path}`,
      );
    }
  }

  /**
   * Validates a path string for invalid characters and patterns
   * @param path - The path to validate
   * @returns true if the path is valid, false otherwise
   */
  private static isValidPath(path: string): boolean {
    if (!path || path.trim() === "") {
      return false;
    }

    // Check for invalid characters in the path
    const invalidChars = /[<>:"|?*]/g;
    if (invalidChars.test(path)) {
      return false;
    }

    // Check for relative path traversal
    if (path.includes("..")) {
      return false;
    }

    return true;
  }
}
