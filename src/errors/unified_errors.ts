/**
 * Unified error type definitions for the entire application
 * Using Discriminated Union pattern for type-safe error handling
 */

import { ErrorCode } from "../error_manager.ts";
import { StandardErrorCode } from "./unified_error_interface.ts";

// Re-export StandardErrorCode for compatibility
export { StandardErrorCode };

/**
 * Base error interface with discriminator field
 */
interface BaseError {
  readonly kind: string;
  readonly message: string;
  readonly timestamp: Date;
}

/**
 * Configuration file not found error
 */
export interface ConfigFileNotFoundError extends BaseError {
  readonly kind: "CONFIG_FILE_NOT_FOUND";
  readonly path: string;
  readonly configType: "app" | "user";
  readonly searchedLocations?: string[];
}

/**
 * Configuration parse error (YAML/JSON syntax errors)
 */
export interface ConfigParseError extends BaseError {
  readonly kind: "CONFIG_PARSE_ERROR";
  readonly path: string;
  readonly line?: number;
  readonly column?: number;
  readonly syntaxError: string;
}

/**
 * Configuration validation error
 */
export interface ConfigValidationError extends BaseError {
  readonly kind: "CONFIG_VALIDATION_ERROR";
  readonly path: string;
  readonly violations: ValidationViolation[];
}

/**
 * User configuration invalid error (specific to user config files)
 */
export interface UserConfigInvalidError extends BaseError {
  readonly kind: "USER_CONFIG_INVALID";
  readonly path: string;
  readonly reason: "PARSE_ERROR" | "VALIDATION_ERROR" | "UNKNOWN_ERROR";
  readonly details?: string;
  readonly originalError?: unknown;
}

export interface ValidationViolation {
  readonly field: string;
  readonly value: unknown;
  readonly expectedType: string;
  readonly actualType: string;
  readonly constraint?: string;
}

/**
 * Path validation error
 */
export interface PathValidationError extends BaseError {
  readonly kind: "PATH_VALIDATION_ERROR";
  readonly path: string;
  readonly reason: PathErrorReason;
  readonly affectedField: string;
}

export type PathErrorReason =
  | "PATH_TRAVERSAL"
  | "ABSOLUTE_PATH_NOT_ALLOWED"
  | "INVALID_CHARACTERS"
  | "PATH_TOO_LONG"
  | "EMPTY_PATH";

/**
 * Configuration not loaded error
 */
export interface ConfigNotLoadedError extends BaseError {
  readonly kind: "CONFIG_NOT_LOADED";
  readonly requestedOperation: string;
  readonly suggestion: string;
}

/**
 * Invalid profile name error
 */
export interface InvalidProfileNameError extends BaseError {
  readonly kind: "INVALID_PROFILE_NAME";
  readonly providedName: string;
  readonly pattern: string;
  readonly validExamples: string[];
}

/**
 * File system operation error
 */
export interface FileSystemError extends BaseError {
  readonly kind: "FILE_SYSTEM_ERROR";
  readonly operation: "read" | "write" | "delete" | "create";
  readonly path: string;
  readonly systemError?: string;
  readonly code?: string;
}

/**
 * Required field missing error
 */
export interface RequiredFieldMissingError extends BaseError {
  readonly kind: "REQUIRED_FIELD_MISSING";
  readonly field: string;
  readonly parentObject?: string;
  readonly availableFields: string[];
}

/**
 * Type mismatch error
 */
export interface TypeMismatchError extends BaseError {
  readonly kind: "TYPE_MISMATCH";
  readonly field: string;
  readonly expectedType: string;
  readonly actualType: string;
  readonly value: unknown;
}

/**
 * Unknown/unexpected error wrapper
 */
export interface UnknownError extends BaseError {
  readonly kind: "UNKNOWN_ERROR";
  readonly originalError: unknown;
  readonly context?: string;
  readonly stackTrace?: string;
}

/**
 * Unified error type - Discriminated Union of all possible errors
 */
export type UnifiedError =
  | ConfigFileNotFoundError
  | ConfigParseError
  | ConfigValidationError
  | UserConfigInvalidError
  | PathValidationError
  | ConfigNotLoadedError
  | InvalidProfileNameError
  | FileSystemError
  | RequiredFieldMissingError
  | TypeMismatchError
  | UnknownError;

/**
 * Type guard functions for error type checking
 */
export const ErrorGuards = {
  isConfigFileNotFound: (error: UnifiedError): error is ConfigFileNotFoundError =>
    error.kind === "CONFIG_FILE_NOT_FOUND",

  isConfigParseError: (error: UnifiedError): error is ConfigParseError =>
    error.kind === "CONFIG_PARSE_ERROR",

  isConfigValidationError: (error: UnifiedError): error is ConfigValidationError =>
    error.kind === "CONFIG_VALIDATION_ERROR",

  isUserConfigInvalidError: (error: UnifiedError): error is UserConfigInvalidError =>
    error.kind === "USER_CONFIG_INVALID",

  isPathValidationError: (error: UnifiedError): error is PathValidationError =>
    error.kind === "PATH_VALIDATION_ERROR",

  isConfigNotLoadedError: (error: UnifiedError): error is ConfigNotLoadedError =>
    error.kind === "CONFIG_NOT_LOADED",

  isInvalidProfileNameError: (error: UnifiedError): error is InvalidProfileNameError =>
    error.kind === "INVALID_PROFILE_NAME",

  isFileSystemError: (error: UnifiedError): error is FileSystemError =>
    error.kind === "FILE_SYSTEM_ERROR",

  isRequiredFieldMissingError: (error: UnifiedError): error is RequiredFieldMissingError =>
    error.kind === "REQUIRED_FIELD_MISSING",

  isTypeMismatchError: (error: UnifiedError): error is TypeMismatchError =>
    error.kind === "TYPE_MISMATCH",

  isUnknownError: (error: UnifiedError): error is UnknownError => error.kind === "UNKNOWN_ERROR",
} as const;

/**
 * Error factory functions for creating type-safe errors
 */
export const ErrorFactories = {
  configFileNotFound: (
    path: string,
    configType: "app" | "user",
    searchedLocations?: string[],
  ): ConfigFileNotFoundError => ({
    kind: "CONFIG_FILE_NOT_FOUND",
    path,
    configType,
    searchedLocations,
    message: `${
      configType === "app" ? ErrorCode.APP_CONFIG_NOT_FOUND : ErrorCode.USER_CONFIG_NOT_FOUND
    }: ${configType === "app" ? "Application" : "User"} configuration file not found at: ${path}`,
    timestamp: new Date(),
  }),

  configParseError: (
    path: string,
    syntaxError: string,
    line?: number,
    column?: number,
  ): ConfigParseError => ({
    kind: "CONFIG_PARSE_ERROR",
    path,
    line,
    column,
    syntaxError,
    message:
      `${ErrorCode.APP_CONFIG_INVALID}: Failed to parse configuration file at ${path}: ${syntaxError}`,
    timestamp: new Date(),
  }),

  configValidationError: (
    path: string,
    violations: ValidationViolation[],
  ): ConfigValidationError => ({
    kind: "CONFIG_VALIDATION_ERROR",
    path,
    violations,
    message:
      `${ErrorCode.APP_CONFIG_INVALID}: Configuration validation failed for ${path}: ${violations.length} violation(s)`,
    timestamp: new Date(),
  }),

  userConfigInvalid: (
    path: string,
    reason: "PARSE_ERROR" | "VALIDATION_ERROR" | "UNKNOWN_ERROR",
    details?: string,
    originalError?: unknown,
  ): UserConfigInvalidError => ({
    kind: "USER_CONFIG_INVALID",
    path,
    reason,
    details,
    originalError,
    message: `${ErrorCode.USER_CONFIG_INVALID}: User configuration invalid at ${path}: ${reason}${
      details ? ` - ${details}` : ""
    }`,
    timestamp: new Date(),
  }),

  pathValidationError: (
    path: string,
    reason: PathErrorReason,
    affectedField: string,
  ): PathValidationError => ({
    kind: "PATH_VALIDATION_ERROR",
    path,
    reason,
    affectedField,
    message: `${
      reason === "PATH_TRAVERSAL"
        ? ErrorCode.PATH_TRAVERSAL_DETECTED
        : reason === "ABSOLUTE_PATH_NOT_ALLOWED"
        ? ErrorCode.ABSOLUTE_PATH_NOT_ALLOWED
        : ErrorCode.INVALID_PATH_FORMAT
    }: Invalid path "${path}" in field "${affectedField}": ${reason}`,
    timestamp: new Date(),
  }),

  configNotLoaded: (
    requestedOperation: string,
  ): ConfigNotLoadedError => ({
    kind: "CONFIG_NOT_LOADED",
    requestedOperation,
    suggestion: "Call loadConfig() before accessing configuration values",
    message:
      `${ErrorCode.CONFIG_NOT_LOADED}: Configuration not loaded. Cannot perform operation: ${requestedOperation}`,
    timestamp: new Date(),
  }),

  invalidProfileName: (
    providedName: string,
  ): InvalidProfileNameError => ({
    kind: "INVALID_PROFILE_NAME",
    providedName,
    pattern: "^[a-zA-Z0-9-]+$",
    validExamples: ["development", "production", "test", "staging"],
    message:
      `${ErrorCode.INVALID_PROFILE_NAME}: Invalid profile name "${providedName}". Must match pattern: ^[a-zA-Z0-9-]+$`,
    timestamp: new Date(),
  }),

  fileSystemError: (
    operation: "read" | "write" | "delete" | "create",
    path: string,
    systemError?: string,
    code?: string,
  ): FileSystemError => ({
    kind: "FILE_SYSTEM_ERROR",
    operation,
    path,
    systemError,
    code,
    message: `File system ${operation} operation failed for ${path}${
      systemError ? `: ${systemError}` : ""
    }`,
    timestamp: new Date(),
  }),

  requiredFieldMissing: (
    field: string,
    parentObject?: string,
    availableFields: string[] = [],
  ): RequiredFieldMissingError => ({
    kind: "REQUIRED_FIELD_MISSING",
    field,
    parentObject,
    availableFields,
    message: `${ErrorCode.REQUIRED_FIELD_MISSING}: Required field "${field}"${
      parentObject ? ` in ${parentObject}` : ""
    } is missing`,
    timestamp: new Date(),
  }),

  typeMismatch: (
    field: string,
    expectedType: string,
    actualType: string,
    value: unknown,
  ): TypeMismatchError => ({
    kind: "TYPE_MISMATCH",
    field,
    expectedType,
    actualType,
    value,
    message:
      `${ErrorCode.INVALID_FIELD_TYPE}: Type mismatch for field "${field}": expected ${expectedType}, got ${actualType}`,
    timestamp: new Date(),
  }),

  configMergeError: (
    error: unknown,
  ): UnknownError => ({
    kind: "UNKNOWN_ERROR",
    originalError: error,
    context: "configMerge",
    stackTrace: error instanceof Error ? error.stack : undefined,
    message: `Configuration merge failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
    timestamp: new Date(),
  }),

  unknown: (
    error: unknown,
    context?: string,
  ): UnknownError => ({
    kind: "UNKNOWN_ERROR",
    originalError: error,
    context,
    stackTrace: error instanceof Error ? error.stack : undefined,
    message: `Unknown error occurred${context ? ` in ${context}` : ""}: ${
      error instanceof Error ? error.message : String(error)
    }`,
    timestamp: new Date(),
  }),
} as const;
