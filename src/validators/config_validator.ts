import type { AppConfig } from "../types/app_config.ts";
import type { UserConfig } from "../types/user_config.ts";
import { hasPromptConfig, hasSchemaConfig } from "../types/user_config.ts";
import { Result } from "../types/unified_result.ts";
import {
  ErrorFactories,
  type UnifiedError,
  type ValidationViolation,
} from "../errors/unified_errors.ts";

export class ConfigValidator {
  static validateAppConfig(
    config: unknown,
    source = "app_config",
  ): Result<AppConfig, UnifiedError> {
    const violations: ValidationViolation[] = [];

    if (!config || typeof config !== "object") {
      violations.push({
        field: "root",
        value: config,
        expectedType: "object",
        actualType: typeof config,
        constraint: "Configuration must be an object",
      });
      return Result.err(ErrorFactories.configValidationError(source, violations));
    }

    const { working_dir, app_prompt, app_schema } = config as Partial<AppConfig>;

    if (!working_dir || typeof working_dir !== "string") {
      violations.push({
        field: "working_dir",
        value: working_dir,
        expectedType: "string",
        actualType: typeof working_dir,
        constraint: "working_dir is required and must be a string",
      });
    }

    if (!app_prompt || typeof app_prompt !== "object") {
      violations.push({
        field: "app_prompt",
        value: app_prompt,
        expectedType: "object",
        actualType: typeof app_prompt,
        constraint: "app_prompt is required and must be an object",
      });
    } else if (!app_prompt.base_dir || typeof app_prompt.base_dir !== "string") {
      violations.push({
        field: "app_prompt.base_dir",
        value: app_prompt.base_dir,
        expectedType: "string",
        actualType: typeof app_prompt.base_dir,
        constraint: "app_prompt.base_dir is required and must be a string",
      });
    }

    if (!app_schema || typeof app_schema !== "object") {
      violations.push({
        field: "app_schema",
        value: app_schema,
        expectedType: "object",
        actualType: typeof app_schema,
        constraint: "app_schema is required and must be an object",
      });
    } else if (!app_schema.base_dir || typeof app_schema.base_dir !== "string") {
      violations.push({
        field: "app_schema.base_dir",
        value: app_schema.base_dir,
        expectedType: "string",
        actualType: typeof app_schema.base_dir,
        constraint: "app_schema.base_dir is required and must be a string",
      });
    }

    // Validate paths if fields exist
    if (typeof working_dir === "string") {
      const pathResult = this.validatePath(working_dir, "working_dir");
      if (!pathResult.success) {
        if (pathResult.error.kind === "CONFIG_VALIDATION_ERROR") {
          violations.push(...pathResult.error.violations);
        }
      }
    }

    if (app_prompt && typeof app_prompt.base_dir === "string") {
      const pathResult = this.validatePath(app_prompt.base_dir, "app_prompt.base_dir");
      if (!pathResult.success) {
        if (pathResult.error.kind === "CONFIG_VALIDATION_ERROR") {
          violations.push(...pathResult.error.violations);
        }
      }
    }

    if (app_schema && typeof app_schema.base_dir === "string") {
      const pathResult = this.validatePath(app_schema.base_dir, "app_schema.base_dir");
      if (!pathResult.success) {
        if (pathResult.error.kind === "CONFIG_VALIDATION_ERROR") {
          violations.push(...pathResult.error.violations);
        }
      }
    }

    if (violations.length > 0) {
      return Result.err(ErrorFactories.configValidationError(source, violations));
    }

    return Result.ok(config as AppConfig);
  }

  static validateUserConfig(
    config: unknown,
    source = "user_config",
  ): Result<UserConfig, UnifiedError> {
    const violations: ValidationViolation[] = [];

    // Handle null and undefined as invalid (these should fail validation)
    if (config === null || config === undefined) {
      violations.push({
        field: "root",
        value: config,
        expectedType: "object",
        actualType: config === null ? "null" : "undefined",
        constraint: "Configuration must be an object",
      });
      return Result.err(ErrorFactories.configValidationError(source, violations));
    }

    // Handle non-object types as empty user configs
    // This follows the Total Function principle by making the function total
    // over all possible input types, treating non-objects as valid empty configs
    if (typeof config !== "object") {
      // Return empty user config for non-object types
      return Result.ok({} as UserConfig);
    }

    const userConfig = config as UserConfig;

    if (hasPromptConfig(userConfig)) {
      if (typeof userConfig.app_prompt !== "object") {
        violations.push({
          field: "app_prompt",
          value: userConfig.app_prompt,
          expectedType: "object",
          actualType: typeof userConfig.app_prompt,
          constraint: "app_prompt must be an object",
        });
      } else if (userConfig.app_prompt.base_dir) {
        if (typeof userConfig.app_prompt.base_dir !== "string") {
          violations.push({
            field: "app_prompt.base_dir",
            value: userConfig.app_prompt.base_dir,
            expectedType: "string",
            actualType: typeof userConfig.app_prompt.base_dir,
            constraint: "app_prompt.base_dir must be a string",
          });
        } else {
          const pathResult = this.validatePath(
            userConfig.app_prompt.base_dir,
            "app_prompt.base_dir",
          );
          if (!pathResult.success) {
            if (pathResult.error.kind === "CONFIG_VALIDATION_ERROR") {
              violations.push(...pathResult.error.violations);
            }
          }
        }
      }
    }

    if (hasSchemaConfig(userConfig)) {
      if (typeof userConfig.app_schema !== "object") {
        violations.push({
          field: "app_schema",
          value: userConfig.app_schema,
          expectedType: "object",
          actualType: typeof userConfig.app_schema,
          constraint: "app_schema must be an object",
        });
      } else if (userConfig.app_schema.base_dir) {
        if (typeof userConfig.app_schema.base_dir !== "string") {
          violations.push({
            field: "app_schema.base_dir",
            value: userConfig.app_schema.base_dir,
            expectedType: "string",
            actualType: typeof userConfig.app_schema.base_dir,
            constraint: "app_schema.base_dir must be a string",
          });
        } else {
          const pathResult = this.validatePath(
            userConfig.app_schema.base_dir,
            "app_schema.base_dir",
          );
          if (!pathResult.success) {
            if (pathResult.error.kind === "CONFIG_VALIDATION_ERROR") {
              violations.push(...pathResult.error.violations);
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      return Result.err(ErrorFactories.configValidationError(source, violations));
    }

    return Result.ok(userConfig);
  }

  private static validatePath(
    path: string,
    fieldName: string,
  ): Result<void, UnifiedError> {
    const violations: ValidationViolation[] = [];

    if (!path || path.trim() === "") {
      violations.push({
        field: fieldName,
        value: path,
        expectedType: "non-empty string",
        actualType: typeof path,
        constraint: "Path must not be empty",
      });
      return Result.err(
        ErrorFactories.configValidationError(fieldName, violations),
      );
    }

    const invalidChars = /[<>:"|?*]/g;
    if (invalidChars.test(path)) {
      violations.push({
        field: fieldName,
        value: path,
        expectedType: "valid path characters",
        actualType: typeof path,
        constraint: `Path contains invalid characters: ${path}`,
      });
    }

    if (path.includes("..")) {
      violations.push({
        field: fieldName,
        value: path,
        expectedType: "path without traversal",
        actualType: typeof path,
        constraint: `Path traversal detected in: ${path}`,
      });
    }

    if (path.startsWith("/")) {
      violations.push({
        field: fieldName,
        value: path,
        expectedType: "relative path",
        actualType: typeof path,
        constraint: `Absolute path not allowed: ${path}`,
      });
    }

    if (violations.length > 0) {
      return Result.err(
        ErrorFactories.configValidationError(fieldName, violations),
      );
    }

    return Result.ok(undefined);
  }
}
