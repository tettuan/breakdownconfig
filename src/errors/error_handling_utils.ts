/**
 * Error handling utilities for test and integration support
 * Provides helper functions for error type conversions and handling
 */

import { ErrorFactories, type UnifiedError } from "./unified_errors.ts";
import {
  type BaseErrorInterface,
  ErrorCategory,
  ErrorSeverity,
  StandardErrorCode,
} from "./unified_error_interface.ts";
import type { Result as _Result } from "../types/unified_result.ts";

/**
 * Error handling utilities
 */
export class ErrorHandlingUtils {
  /**
   * Convert any error to UnifiedError with proper type guards
   */
  static toUnifiedError(error: unknown, context?: string): UnifiedError {
    // Type guard for UnifiedError
    if (this.isUnifiedError(error)) {
      return error;
    }

    // Type guard for standard Error
    if (error instanceof Error) {
      return ErrorFactories.unknown(error, context);
    }

    // Handle other types safely
    const errorMessage = this.getErrorMessage(error);
    return ErrorFactories.unknown(
      new Error(errorMessage),
      context,
    );
  }

  /**
   * Safely extract error message from unknown type
   */
  private static getErrorMessage(error: unknown): string {
    if (typeof error === "string") {
      return error;
    }
    if (typeof error === "number" || typeof error === "boolean") {
      return String(error);
    }
    if (
      error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ) {
      return error.message;
    }
    if (
      error && typeof error === "object" && "toString" in error &&
      typeof error.toString === "function"
    ) {
      return error.toString();
    }
    return "Unknown error";
  }

  /**
   * Type guard for UnifiedError with proper type checking
   */
  static isUnifiedError(error: unknown): error is UnifiedError {
    return (
      typeof error === "object" &&
      error !== null &&
      "kind" in error &&
      typeof (error as Record<string, unknown>).kind === "string" &&
      "message" in error &&
      typeof (error as Record<string, unknown>).message === "string" &&
      "timestamp" in error &&
      (error as Record<string, unknown>).timestamp instanceof Date
    );
  }

  /**
   * Convert UnifiedError to BaseErrorInterface
   */
  static toBaseErrorInterface(error: UnifiedError): BaseErrorInterface {
    return {
      kind: error.kind,
      code: this.mapToStandardErrorCode(error.kind),
      category: this.mapToErrorCategory(error.kind),
      severity: this.mapToErrorSeverity(error.kind),
      message: error.message,
      timestamp: error.timestamp,
      context: this.extractContext(error),
      stackTrace: "stackTrace" in error && typeof error.stackTrace === "string"
        ? error.stackTrace
        : undefined,
      cause: undefined,
      correlationId: undefined,
    };
  }

  /**
   * Map error kind to StandardErrorCode
   */
  private static mapToStandardErrorCode(kind: string): StandardErrorCode {
    // Exhaustive mapping using switch for Total Function compliance
    switch (kind) {
      case "CONFIG_FILE_NOT_FOUND":
        return StandardErrorCode.CF_CONFIG_FILE_NOT_FOUND;
      case "CONFIG_PARSE_ERROR":
        return StandardErrorCode.CF_CONFIG_PARSE_ERROR;
      case "CONFIG_VALIDATION_ERROR":
        return StandardErrorCode.CF_CONFIG_VALIDATION_ERROR;
      case "USER_CONFIG_INVALID":
        return StandardErrorCode.CF_USER_CONFIG_INVALID;
      case "PATH_VALIDATION_ERROR":
        return StandardErrorCode.PS_PATH_TRAVERSAL;
      case "CONFIG_NOT_LOADED":
        return StandardErrorCode.CF_CONFIG_NOT_LOADED;
      case "INVALID_PROFILE_NAME":
        return StandardErrorCode.CF_INVALID_PROFILE_NAME;
      case "FILE_SYSTEM_ERROR":
        return StandardErrorCode.FS_FILE_NOT_FOUND;
      case "REQUIRED_FIELD_MISSING":
        return StandardErrorCode.VL_REQUIRED_FIELD_MISSING;
      case "TYPE_MISMATCH":
        return StandardErrorCode.VL_TYPE_MISMATCH;
      case "UNKNOWN_ERROR":
        return StandardErrorCode.UN_UNKNOWN_ERROR;
      default:
        return StandardErrorCode.UN_UNKNOWN_ERROR;
    }
  }

  /**
   * Map error kind to ErrorCategory
   */
  private static mapToErrorCategory(kind: string): ErrorCategory {
    // Exhaustive mapping using switch for Total Function compliance
    switch (kind) {
      case "CONFIG_FILE_NOT_FOUND":
      case "CONFIG_PARSE_ERROR":
      case "CONFIG_NOT_LOADED":
        return ErrorCategory.CONFIGURATION;
      case "CONFIG_VALIDATION_ERROR":
      case "USER_CONFIG_INVALID":
      case "PATH_VALIDATION_ERROR":
      case "INVALID_PROFILE_NAME":
      case "REQUIRED_FIELD_MISSING":
      case "TYPE_MISMATCH":
        return ErrorCategory.VALIDATION;
      case "FILE_SYSTEM_ERROR":
        return ErrorCategory.FILESYSTEM;
      case "UNKNOWN_ERROR":
        return ErrorCategory.UNKNOWN;
      default:
        return ErrorCategory.UNKNOWN;
    }
  }

  /**
   * Map error kind to ErrorSeverity
   */
  private static mapToErrorSeverity(kind: string): ErrorSeverity {
    // Exhaustive mapping using switch for Total Function compliance
    switch (kind) {
      case "USER_CONFIG_INVALID":
        return ErrorSeverity.WARNING;
      case "FILE_SYSTEM_ERROR":
      case "UNKNOWN_ERROR":
        return ErrorSeverity.CRITICAL;
      case "CONFIG_FILE_NOT_FOUND":
      case "CONFIG_PARSE_ERROR":
      case "CONFIG_VALIDATION_ERROR":
      case "PATH_VALIDATION_ERROR":
      case "CONFIG_NOT_LOADED":
      case "INVALID_PROFILE_NAME":
      case "REQUIRED_FIELD_MISSING":
      case "TYPE_MISMATCH":
        return ErrorSeverity.ERROR;
      default:
        return ErrorSeverity.ERROR;
    }
  }

  /**
   * Extract context from UnifiedError
   */
  private static extractContext(error: UnifiedError): Record<string, unknown> {
    const context: Record<string, unknown> = {};

    // Extract specific fields based on error type
    if ("path" in error) {
      context.path = error.path;
    }
    if ("field" in error) {
      context.field = error.field;
    }
    if ("operation" in error) {
      context.operation = error.operation;
    }
    if ("configType" in error) {
      context.configType = error.configType;
    }

    return context;
  }
}

/**
 * Alias for backward compatibility
 */
export const ErrorUtils = ErrorHandlingUtils;
