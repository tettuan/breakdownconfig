/**
 * Mapping from legacy ErrorCode enum to new UnifiedError types
 * This file helps with migration from throw-based to Result-based error handling
 */

import { ErrorCode } from "../error_manager.ts";
import { ErrorFactories, UnifiedError } from "./unified_errors.ts";

/**
 * Maps legacy ErrorCode values to appropriate UnifiedError factory functions
 */
export const ErrorCodeMapping = {
  /**
   * Maps ERR1001: APP_CONFIG_NOT_FOUND
   */
  [ErrorCode.APP_CONFIG_NOT_FOUND]: (path: string, searchedLocations?: string[]) =>
    ErrorFactories.configFileNotFound(path, "app", searchedLocations),

  /**
   * Maps ERR1002: APP_CONFIG_INVALID
   */
  [ErrorCode.APP_CONFIG_INVALID]: (path: string, details: string) =>
    ErrorFactories.configParseError(path, details),

  /**
   * Maps ERR1003: USER_CONFIG_NOT_FOUND
   */
  [ErrorCode.USER_CONFIG_NOT_FOUND]: (path: string, searchedLocations?: string[]) =>
    ErrorFactories.configFileNotFound(path, "user", searchedLocations),

  /**
   * Maps ERR1004: USER_CONFIG_INVALID
   */
  [ErrorCode.USER_CONFIG_INVALID]: (
    path: string,
    details: string,
    reason?: "PARSE_ERROR" | "VALIDATION_ERROR" | "UNKNOWN_ERROR",
  ) => ErrorFactories.userConfigInvalid(path, reason || "UNKNOWN_ERROR", details),

  /**
   * Maps ERR2001: REQUIRED_FIELD_MISSING
   */
  [ErrorCode.REQUIRED_FIELD_MISSING]: (field: string, parent?: string) =>
    ErrorFactories.requiredFieldMissing(field, parent),

  /**
   * Maps ERR2002: INVALID_FIELD_TYPE
   */
  [ErrorCode.INVALID_FIELD_TYPE]: (
    field: string,
    expected: string,
    actual: string,
    value: unknown,
  ) => ErrorFactories.typeMismatch(field, expected, actual, value),

  /**
   * Maps ERR3001: INVALID_PATH_FORMAT
   */
  [ErrorCode.INVALID_PATH_FORMAT]: (path: string, field: string) =>
    ErrorFactories.pathValidationError(path, "INVALID_CHARACTERS", field),

  /**
   * Maps ERR3002: PATH_TRAVERSAL_DETECTED
   */
  [ErrorCode.PATH_TRAVERSAL_DETECTED]: (path: string, field: string) =>
    ErrorFactories.pathValidationError(path, "PATH_TRAVERSAL", field),

  /**
   * Maps ERR3003: ABSOLUTE_PATH_NOT_ALLOWED
   */
  [ErrorCode.ABSOLUTE_PATH_NOT_ALLOWED]: (path: string, field: string) =>
    ErrorFactories.pathValidationError(path, "ABSOLUTE_PATH_NOT_ALLOWED", field),

  /**
   * Maps ERR4001: INVALID_PROFILE_NAME
   */
  [ErrorCode.INVALID_PROFILE_NAME]: (providedName: string) =>
    ErrorFactories.invalidProfileName(providedName),

  /**
   * Maps ERR5001: CONFIG_NOT_LOADED
   */
  [ErrorCode.CONFIG_NOT_LOADED]: (operation: string) => ErrorFactories.configNotLoaded(operation),

  /**
   * Maps ERR9999: UNKNOWN_ERROR
   */
  [ErrorCode.UNKNOWN_ERROR]: (error: unknown, context?: string) =>
    ErrorFactories.unknown(error, context),
} as const;

/**
 * Converts a legacy ErrorCode-based error to a UnifiedError
 */
export function convertLegacyError(
  code: ErrorCode,
  message: string,
  context?: Record<string, unknown>,
): UnifiedError {
  switch (code) {
    case ErrorCode.APP_CONFIG_NOT_FOUND:
      return ErrorFactories.configFileNotFound(
        context?.path as string || "unknown",
        "app",
        context?.searchedLocations as string[],
      );

    case ErrorCode.APP_CONFIG_INVALID:
      return ErrorFactories.configParseError(
        context?.path as string || "unknown",
        message,
      );

    case ErrorCode.USER_CONFIG_NOT_FOUND:
      return ErrorFactories.configFileNotFound(
        context?.path as string || "unknown",
        "user",
        context?.searchedLocations as string[],
      );

    case ErrorCode.USER_CONFIG_INVALID:
      return ErrorFactories.userConfigInvalid(
        context?.path as string || "unknown",
        context?.reason as "PARSE_ERROR" | "VALIDATION_ERROR" | "UNKNOWN_ERROR" || "UNKNOWN_ERROR",
        message,
        context?.originalError,
      );

    case ErrorCode.REQUIRED_FIELD_MISSING:
      return ErrorFactories.requiredFieldMissing(
        context?.field as string || "unknown",
        context?.parent as string,
      );

    case ErrorCode.INVALID_FIELD_TYPE:
      return ErrorFactories.typeMismatch(
        context?.field as string || "unknown",
        context?.expected as string || "unknown",
        context?.actual as string || "unknown",
        context?.value,
      );

    case ErrorCode.INVALID_PATH_FORMAT:
      return ErrorFactories.pathValidationError(
        context?.path as string || "unknown",
        "INVALID_CHARACTERS",
        context?.field as string || "unknown",
      );

    case ErrorCode.PATH_TRAVERSAL_DETECTED:
      return ErrorFactories.pathValidationError(
        context?.path as string || "unknown",
        "PATH_TRAVERSAL",
        context?.field as string || "unknown",
      );

    case ErrorCode.ABSOLUTE_PATH_NOT_ALLOWED:
      return ErrorFactories.pathValidationError(
        context?.path as string || "unknown",
        "ABSOLUTE_PATH_NOT_ALLOWED",
        context?.field as string || "unknown",
      );

    case ErrorCode.INVALID_PROFILE_NAME:
      return ErrorFactories.invalidProfileName(
        context?.name as string || "unknown",
      );

    case ErrorCode.CONFIG_NOT_LOADED:
      return ErrorFactories.configNotLoaded(
        context?.operation as string || "unknown",
      );

    case ErrorCode.UNKNOWN_ERROR:
    default:
      return ErrorFactories.unknown(
        context?.error || new Error(message),
        context?.context as string,
      );
  }
}

/**
 * Type predicate to check if an error matches a specific ErrorCode
 */
export function isErrorCode(error: UnifiedError, code: ErrorCode): boolean {
  switch (code) {
    case ErrorCode.APP_CONFIG_NOT_FOUND:
      return error.kind === "CONFIG_FILE_NOT_FOUND" && error.configType === "app";

    case ErrorCode.USER_CONFIG_NOT_FOUND:
      return error.kind === "CONFIG_FILE_NOT_FOUND" && error.configType === "user";

    case ErrorCode.APP_CONFIG_INVALID:
      return error.kind === "CONFIG_PARSE_ERROR";

    case ErrorCode.USER_CONFIG_INVALID:
      return error.kind === "USER_CONFIG_INVALID";

    case ErrorCode.REQUIRED_FIELD_MISSING:
      return error.kind === "REQUIRED_FIELD_MISSING";

    case ErrorCode.INVALID_FIELD_TYPE:
      return error.kind === "TYPE_MISMATCH";

    case ErrorCode.INVALID_PATH_FORMAT:
      return error.kind === "PATH_VALIDATION_ERROR" && error.reason === "INVALID_CHARACTERS";

    case ErrorCode.PATH_TRAVERSAL_DETECTED:
      return error.kind === "PATH_VALIDATION_ERROR" && error.reason === "PATH_TRAVERSAL";

    case ErrorCode.ABSOLUTE_PATH_NOT_ALLOWED:
      return error.kind === "PATH_VALIDATION_ERROR" && error.reason === "ABSOLUTE_PATH_NOT_ALLOWED";

    case ErrorCode.INVALID_PROFILE_NAME:
      return error.kind === "INVALID_PROFILE_NAME";

    case ErrorCode.CONFIG_NOT_LOADED:
      return error.kind === "CONFIG_NOT_LOADED";

    case ErrorCode.UNKNOWN_ERROR:
      return error.kind === "UNKNOWN_ERROR";

    default:
      return false;
  }
}
