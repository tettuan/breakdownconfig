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

    case "configValidationError": {
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
    }

    case "pathError": {
      const unifiedReason = PATH_REASON_MAP[configError.reason];
      return ErrorFactories.pathValidationError(
        configError.path,
        unifiedReason,
        "path", // Default field name
      );
    }

    case "unknownError":
      return ErrorFactories.unknown(
        configError.originalError || new Error(configError.message),
        "legacy-config-error",
      );

    default: {
      // Exhaustive check with safe type access
      const _exhaustiveCheck: never = configError;
      const unknownError = configError as { kind?: string };
      const unknownKind = unknownError.kind ?? "unknown";
      return ErrorFactories.unknown(
        new Error(`Unknown ConfigError type: ${unknownKind}`),
        "legacy-adapter",
      );
    }
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

    case "PATH_VALIDATION_ERROR": {
      const legacyReasonEntry = Object.entries(PATH_REASON_MAP).find(
        ([_, unified]) => unified === unifiedError.reason,
      );
      const legacyReason: LegacyPathErrorReason = legacyReasonEntry?.[0]
        ? legacyReasonEntry[0] as LegacyPathErrorReason
        : "invalidCharacters";

      return {
        kind: "pathError",
        path: unifiedError.path,
        reason: legacyReason,
        message: unifiedError.message,
      };
    }

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
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const errorObj = error as Record<string, unknown>;
  if (!("kind" in errorObj) || typeof errorObj.kind !== "string") {
    return false;
  }

  const validKinds = [
    "fileNotFound",
    "parseError",
    "configValidationError",
    "pathError",
    "unknownError",
  ];
  return validKinds.includes(errorObj.kind);
}

/**
 * Type guard to check if an error is a UnifiedError
 */
export function isUnifiedError(error: unknown): error is UnifiedError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const errorObj = error as Record<string, unknown>;
  return (
    "kind" in errorObj &&
    typeof errorObj.kind === "string" &&
    "timestamp" in errorObj &&
    errorObj.timestamp instanceof Date &&
    "message" in errorObj &&
    typeof errorObj.message === "string"
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

  // Handle string errors
  if (typeof error === "string") {
    return ErrorFactories.unknown(new Error(error), "string-error");
  }

  // Handle null/undefined
  if (error === null || error === undefined) {
    return ErrorFactories.unknown(new Error("Null or undefined error"), "null-error");
  }

  // Handle any other unknown error types with safe conversion
  return ErrorFactories.unknown(
    new Error(`Unknown error type: ${typeof error}`),
    "unknown-type",
  );
}
