/**
 * Legacy adapter for ConfigError to UnifiedError migration
 *
 * This adapter helps migrate from the old ConfigError system to UnifiedError
 * while maintaining backward compatibility during the transition period.
 */

import { ConfigError, PathErrorReason as LegacyPathErrorReason } from "../types/config_result.ts";
import { ErrorFactories, PathErrorReason, UnifiedError } from "./unified_errors.ts";

/**
 * Maps legacy PathErrorReason to new PathErrorReason
 */
const PATH_REASON_MAP: Record<LegacyPathErrorReason, PathErrorReason> = {
  pathTraversal: "PATH_TRAVERSAL",
  absoluteNotAllowed: "ABSOLUTE_PATH_NOT_ALLOWED",
  invalidCharacters: "INVALID_CHARACTERS",
  tooLong: "PATH_TOO_LONG",
  empty: "EMPTY_PATH",
};

/**
 * Converts legacy ConfigError to UnifiedError
 */
export function convertConfigErrorToUnified(configError: ConfigError): UnifiedError {
  switch (configError.kind) {
    case "fileNotFound":
      return ErrorFactories.configFileNotFound(
        configError.path,
        "app", // Default to app, as legacy doesn't distinguish
        [],
      );

    case "parseError":
      return ErrorFactories.configParseError(
        configError.path,
        configError.message,
        configError.line,
        configError.column,
      );

    case "configValidationError":
      const violations = configError.errors.map((err) => ({
        field: err.field,
        value: err.value,
        expectedType: err.expectedType,
        actualType: typeof err.value,
        constraint: err.message,
      }));

      return ErrorFactories.configValidationError(
        configError.path,
        violations,
      );

    case "pathError":
      const unifiedReason = PATH_REASON_MAP[configError.reason];
      return ErrorFactories.pathValidationError(
        configError.path,
        unifiedReason,
        "path", // Default field name
      );

    case "unknownError":
      return ErrorFactories.unknown(
        configError.originalError || new Error(configError.message),
        "legacy-config-error",
      );

    default:
      // Exhaustive check
      const _exhaustiveCheck: never = configError;
      return ErrorFactories.unknown(
        new Error(`Unknown ConfigError type: ${(configError as any).kind}`),
        "legacy-adapter",
      );
  }
}

/**
 * Converts UnifiedError back to ConfigError (for legacy compatibility)
 */
export function convertUnifiedToConfigError(unifiedError: UnifiedError): ConfigError {
  switch (unifiedError.kind) {
    case "CONFIG_FILE_NOT_FOUND":
      return {
        kind: "fileNotFound",
        path: unifiedError.path,
        message: unifiedError.message,
      };

    case "CONFIG_PARSE_ERROR":
      return {
        kind: "parseError",
        path: unifiedError.path,
        line: unifiedError.line || 0,
        column: unifiedError.column || 0,
        message: unifiedError.syntaxError,
      };

    case "CONFIG_VALIDATION_ERROR":
      return {
        kind: "configValidationError",
        path: unifiedError.path,
        errors: unifiedError.violations.map((violation) => ({
          field: violation.field,
          value: violation.value,
          expectedType: violation.expectedType,
          message: violation.constraint,
        })),
      };

    case "PATH_VALIDATION_ERROR":
      const legacyReason = Object.entries(PATH_REASON_MAP).find(
        ([_, unified]) => unified === unifiedError.reason,
      )?.[0] as LegacyPathErrorReason || "invalidCharacters";

      return {
        kind: "pathError",
        path: unifiedError.path,
        reason: legacyReason,
        message: unifiedError.message,
      };

    case "USER_CONFIG_INVALID":
    case "CONFIG_NOT_LOADED":
    case "INVALID_PROFILE_NAME":
    case "FILE_SYSTEM_ERROR":
    case "REQUIRED_FIELD_MISSING":
    case "TYPE_MISMATCH":
    case "UNKNOWN_ERROR":
    default:
      return {
        kind: "unknownError",
        message: unifiedError.message,
        originalError: unifiedError.kind === "UNKNOWN_ERROR"
          ? unifiedError.originalError
          : unifiedError,
      };
  }
}

/**
 * Type guard to check if an error is a legacy ConfigError
 */
export function isLegacyConfigError(error: unknown): error is ConfigError {
  return (
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    typeof (error as any).kind === "string" &&
    ["fileNotFound", "parseError", "configValidationError", "pathError", "unknownError"].includes(
      (error as any).kind,
    )
  );
}

/**
 * Type guard to check if an error is a UnifiedError
 */
export function isUnifiedError(error: unknown): error is UnifiedError {
  return (
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    "timestamp" in error &&
    typeof (error as any).kind === "string" &&
    (error as any).timestamp instanceof Date
  );
}

/**
 * Unified error detection and conversion utility
 */
export function normalizeError(error: unknown): UnifiedError {
  if (isUnifiedError(error)) {
    return error;
  }

  if (isLegacyConfigError(error)) {
    return convertConfigErrorToUnified(error);
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return ErrorFactories.unknown(error, "error-normalization");
  }

  // Handle any other unknown error types
  return ErrorFactories.unknown(error, "unknown-type");
}
