/**
 * Helper functions to convert throwError calls to Result-based error handling
 * This facilitates the migration from ErrorManager to UnifiedError
 */

import { Result } from "../types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "./unified_errors.ts";
import { ErrorCode } from "../error_manager.ts";

/**
 * Converts ErrorManager.throwError calls to Result.err for user config errors
 */
export function userConfigErrorToResult(
  path: string,
  errorKind: "parseError" | "configValidationError" | "unknownError",
  message: string,
  originalError?: Error | string | null,
): Result<never, UnifiedError> {
  switch (errorKind) {
    case "parseError":
      return Result.err(ErrorFactories.userConfigInvalid(
        path,
        "PARSE_ERROR",
        message,
        originalError,
      ));

    case "configValidationError":
      return Result.err(ErrorFactories.userConfigInvalid(
        path,
        "VALIDATION_ERROR",
        message || "Invalid user configuration structure",
        originalError,
      ));

    case "unknownError":
      return Result.err(ErrorFactories.userConfigInvalid(
        path,
        "UNKNOWN_ERROR",
        message,
        originalError,
      ));

    default:
      return Result.err(ErrorFactories.unknown(
        new Error(`Unknown error kind: ${errorKind}`),
        "userConfigErrorToResult",
      ));
  }
}

/**
 * Generic helper to convert any ErrorCode to UnifiedError
 */
export function errorCodeToUnifiedError(
  code: ErrorCode,
  message: string,
  context: {
    path?: string;
    field?: string;
    reason?: string;
    originalError?: Error | string | null;
  } = {},
): UnifiedError {
  switch (code) {
    case ErrorCode.USER_CONFIG_INVALID: {
      // Apply Total Function principle: validate reason type instead of using type assertion
      const validReasons = ["PARSE_ERROR", "VALIDATION_ERROR", "UNKNOWN_ERROR"] as const;
      type ValidReason = typeof validReasons[number];

      const isValidReason = (r: string): r is ValidReason =>
        validReasons.includes(r as ValidReason);

      const reason: ValidReason = context.reason && isValidReason(context.reason)
        ? context.reason
        : "UNKNOWN_ERROR";

      return ErrorFactories.userConfigInvalid(
        context.path || "unknown",
        reason,
        message,
        context.originalError,
      );
    }

    case ErrorCode.APP_CONFIG_NOT_FOUND:
      return ErrorFactories.configFileNotFound(
        context.path || "unknown",
        "app",
      );

    case ErrorCode.USER_CONFIG_NOT_FOUND:
      return ErrorFactories.configFileNotFound(
        context.path || "unknown",
        "user",
      );

    case ErrorCode.APP_CONFIG_INVALID:
      return ErrorFactories.configParseError(
        context.path || "unknown",
        message,
      );

    case ErrorCode.REQUIRED_FIELD_MISSING:
      return ErrorFactories.requiredFieldMissing(
        context.field || "unknown",
      );

    case ErrorCode.INVALID_FIELD_TYPE:
      return ErrorFactories.typeMismatch(
        context.field || "unknown",
        "expected",
        "actual",
        null,
      );

    case ErrorCode.INVALID_PATH_FORMAT:
      return ErrorFactories.pathValidationError(
        context.path || "unknown",
        "INVALID_CHARACTERS",
        context.field || "unknown",
      );

    case ErrorCode.PATH_TRAVERSAL_DETECTED:
      return ErrorFactories.pathValidationError(
        context.path || "unknown",
        "PATH_TRAVERSAL",
        context.field || "unknown",
      );

    case ErrorCode.ABSOLUTE_PATH_NOT_ALLOWED:
      return ErrorFactories.pathValidationError(
        context.path || "unknown",
        "ABSOLUTE_PATH_NOT_ALLOWED",
        context.field || "unknown",
      );

    case ErrorCode.INVALID_PROFILE_NAME:
      return ErrorFactories.invalidProfileName(
        context.path || "unknown",
      );

    case ErrorCode.CONFIG_NOT_LOADED:
      return ErrorFactories.configNotLoaded(
        message,
      );

    case ErrorCode.UNKNOWN_ERROR:
    default:
      return ErrorFactories.unknown(
        context.originalError || new Error(message),
        "errorCodeToUnifiedError",
      );
  }
}
