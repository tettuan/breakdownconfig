import type { AppConfig } from "../types/app_config.ts";
import type { UserConfig } from "../types/user_config.ts";
import { UserConfigGuards } from "../types/user_config.ts";
import { ConfigResult, Result, ValidationError } from "../types/config_result.ts";

export class ConfigValidator {
  static validateAppConfig(config: unknown): ConfigResult<AppConfig, ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!config || typeof config !== "object") {
      errors.push({
        field: "root",
        value: config,
        expectedType: "object",
        message: "Configuration must be an object",
      });
      return Result.err(errors);
    }

    const { working_dir, app_prompt, app_schema } = config as Partial<AppConfig>;

    if (!working_dir || typeof working_dir !== "string") {
      errors.push({
        field: "working_dir",
        value: working_dir,
        expectedType: "string",
        message: "working_dir is required and must be a string",
      });
    }

    if (!app_prompt || typeof app_prompt !== "object") {
      errors.push({
        field: "app_prompt",
        value: app_prompt,
        expectedType: "object",
        message: "app_prompt is required and must be an object",
      });
    } else if (!app_prompt.base_dir || typeof app_prompt.base_dir !== "string") {
      errors.push({
        field: "app_prompt.base_dir",
        value: app_prompt.base_dir,
        expectedType: "string",
        message: "app_prompt.base_dir is required and must be a string",
      });
    }

    if (!app_schema || typeof app_schema !== "object") {
      errors.push({
        field: "app_schema",
        value: app_schema,
        expectedType: "object",
        message: "app_schema is required and must be an object",
      });
    } else if (!app_schema.base_dir || typeof app_schema.base_dir !== "string") {
      errors.push({
        field: "app_schema.base_dir",
        value: app_schema.base_dir,
        expectedType: "string",
        message: "app_schema.base_dir is required and must be a string",
      });
    }

    // Validate paths if fields exist
    if (typeof working_dir === "string") {
      const pathResult = this.validatePath(working_dir, "working_dir");
      if (!pathResult.success) {
        errors.push(...pathResult.error);
      }
    }

    if (app_prompt && typeof app_prompt.base_dir === "string") {
      const pathResult = this.validatePath(app_prompt.base_dir, "app_prompt.base_dir");
      if (!pathResult.success) {
        errors.push(...pathResult.error);
      }
    }

    if (app_schema && typeof app_schema.base_dir === "string") {
      const pathResult = this.validatePath(app_schema.base_dir, "app_schema.base_dir");
      if (!pathResult.success) {
        errors.push(...pathResult.error);
      }
    }

    if (errors.length > 0) {
      return Result.err(errors);
    }

    return Result.ok(config as AppConfig);
  }

  static validateUserConfig(config: unknown): ConfigResult<UserConfig, ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!config || typeof config !== "object") {
      errors.push({
        field: "root",
        value: config,
        expectedType: "object",
        message: "Configuration must be an object",
      });
      return Result.err(errors);
    }

    const userConfig = config as UserConfig;

    if (UserConfigGuards.hasPromptConfig(userConfig)) {
      if (typeof userConfig.app_prompt !== "object") {
        errors.push({
          field: "app_prompt",
          value: userConfig.app_prompt,
          expectedType: "object",
          message: "app_prompt must be an object",
        });
      } else if (userConfig.app_prompt.base_dir) {
        if (typeof userConfig.app_prompt.base_dir !== "string") {
          errors.push({
            field: "app_prompt.base_dir",
            value: userConfig.app_prompt.base_dir,
            expectedType: "string",
            message: "app_prompt.base_dir must be a string",
          });
        } else {
          const pathResult = this.validatePath(
            userConfig.app_prompt.base_dir,
            "app_prompt.base_dir",
          );
          if (!pathResult.success) {
            errors.push(...pathResult.error);
          }
        }
      }
    }

    if (UserConfigGuards.hasSchemaConfig(userConfig)) {
      if (typeof userConfig.app_schema !== "object") {
        errors.push({
          field: "app_schema",
          value: userConfig.app_schema,
          expectedType: "object",
          message: "app_schema must be an object",
        });
      } else if (userConfig.app_schema.base_dir) {
        if (typeof userConfig.app_schema.base_dir !== "string") {
          errors.push({
            field: "app_schema.base_dir",
            value: userConfig.app_schema.base_dir,
            expectedType: "string",
            message: "app_schema.base_dir must be a string",
          });
        } else {
          const pathResult = this.validatePath(
            userConfig.app_schema.base_dir,
            "app_schema.base_dir",
          );
          if (!pathResult.success) {
            errors.push(...pathResult.error);
          }
        }
      }
    }

    if (errors.length > 0) {
      return Result.err(errors);
    }

    return Result.ok(userConfig);
  }

  private static validatePath(
    path: string,
    fieldName: string,
  ): ConfigResult<void, ValidationError[]> {
    const errors: ValidationError[] = [];

    // パスが空の場合
    if (!path || path.trim() === "") {
      errors.push({
        field: fieldName,
        value: path,
        expectedType: "non-empty string",
        message: "Path must not be empty",
      });
      return Result.err(errors);
    }

    // パスに使用できない文字のチェック
    const invalidChars = /[<>:"|?*]/g;
    if (invalidChars.test(path)) {
      errors.push({
        field: fieldName,
        value: path,
        expectedType: "valid path characters",
        message: `Path contains invalid characters: ${path}`,
      });
    }

    // パストラバーサルのチェック
    if (path.includes("..")) {
      errors.push({
        field: fieldName,
        value: path,
        expectedType: "path without traversal",
        message: `Path traversal detected in: ${path}`,
      });
    }

    // 絶対パスのチェック
    if (path.startsWith("/")) {
      errors.push({
        field: fieldName,
        value: path,
        expectedType: "relative path",
        message: `Absolute path not allowed: ${path}`,
      });
    }

    if (errors.length > 0) {
      return Result.err(errors);
    }

    return Result.ok(undefined);
  }
}
