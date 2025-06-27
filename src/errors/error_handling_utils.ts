/**
 * Error handling utilities for test and integration support
 * Provides helper functions for error type conversions and handling
 */

import { ErrorFactories, UnifiedError } from "./unified_errors.ts";
import {
  BaseErrorInterface,
  ErrorCategory,
  ErrorSeverity,
  StandardErrorCode,
} from "./unified_error_interface.ts";
import { Result } from "../types/unified_result.ts";

/**
 * Error handling utilities
 */
export class ErrorHandlingUtils {
  /**
   * Convert any error to UnifiedError
   */
  static toUnifiedError(error: unknown, context?: string): UnifiedError {
    if (this.isUnifiedError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return ErrorFactories.unknown(error, context);
    }

    return ErrorFactories.unknown(error, context);
  }

  /**
   * Type guard for UnifiedError
   */
  static isUnifiedError(error: unknown): error is UnifiedError {
    return (
      typeof error === "object" &&
      error !== null &&
      "kind" in error &&
      "message" in error &&
      "timestamp" in error
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
      stackTrace: (error as any).stackTrace,
      cause: undefined,
      correlationId: undefined,
    };
  }

  /**
   * Map error kind to StandardErrorCode
   */
  private static mapToStandardErrorCode(kind: string): StandardErrorCode {
    const mapping: Record<string, StandardErrorCode> = {
      "CONFIG_FILE_NOT_FOUND": StandardErrorCode.CF_CONFIG_FILE_NOT_FOUND,
      "CONFIG_PARSE_ERROR": StandardErrorCode.CF_CONFIG_PARSE_ERROR,
      "CONFIG_VALIDATION_ERROR": StandardErrorCode.CF_CONFIG_VALIDATION_ERROR,
      "USER_CONFIG_INVALID": StandardErrorCode.CF_USER_CONFIG_INVALID,
      "PATH_VALIDATION_ERROR": StandardErrorCode.PS_PATH_TRAVERSAL,
      "CONFIG_NOT_LOADED": StandardErrorCode.CF_CONFIG_NOT_LOADED,
      "INVALID_PROFILE_NAME": StandardErrorCode.CF_INVALID_PROFILE_NAME,
      "FILE_SYSTEM_ERROR": StandardErrorCode.FS_FILE_NOT_FOUND,
      "REQUIRED_FIELD_MISSING": StandardErrorCode.VL_REQUIRED_FIELD_MISSING,
      "TYPE_MISMATCH": StandardErrorCode.VL_TYPE_MISMATCH,
      "UNKNOWN_ERROR": StandardErrorCode.UN_UNKNOWN_ERROR,
    };

    return mapping[kind] || StandardErrorCode.UN_UNKNOWN_ERROR;
  }

  /**
   * Map error kind to ErrorCategory
   */
  private static mapToErrorCategory(kind: string): ErrorCategory {
    const mapping: Record<string, ErrorCategory> = {
      "CONFIG_FILE_NOT_FOUND": ErrorCategory.CONFIGURATION,
      "CONFIG_PARSE_ERROR": ErrorCategory.CONFIGURATION,
      "CONFIG_VALIDATION_ERROR": ErrorCategory.VALIDATION,
      "USER_CONFIG_INVALID": ErrorCategory.VALIDATION,
      "PATH_VALIDATION_ERROR": ErrorCategory.VALIDATION,
      "CONFIG_NOT_LOADED": ErrorCategory.CONFIGURATION,
      "INVALID_PROFILE_NAME": ErrorCategory.VALIDATION,
      "FILE_SYSTEM_ERROR": ErrorCategory.FILESYSTEM,
      "REQUIRED_FIELD_MISSING": ErrorCategory.VALIDATION,
      "TYPE_MISMATCH": ErrorCategory.VALIDATION,
      "UNKNOWN_ERROR": ErrorCategory.UNKNOWN,
    };

    return mapping[kind] || ErrorCategory.UNKNOWN;
  }

  /**
   * Map error kind to ErrorSeverity
   */
  private static mapToErrorSeverity(kind: string): ErrorSeverity {
    const mapping: Record<string, ErrorSeverity> = {
      "CONFIG_FILE_NOT_FOUND": ErrorSeverity.ERROR,
      "CONFIG_PARSE_ERROR": ErrorSeverity.ERROR,
      "CONFIG_VALIDATION_ERROR": ErrorSeverity.ERROR,
      "USER_CONFIG_INVALID": ErrorSeverity.WARNING,
      "PATH_VALIDATION_ERROR": ErrorSeverity.ERROR,
      "CONFIG_NOT_LOADED": ErrorSeverity.ERROR,
      "INVALID_PROFILE_NAME": ErrorSeverity.ERROR,
      "FILE_SYSTEM_ERROR": ErrorSeverity.CRITICAL,
      "REQUIRED_FIELD_MISSING": ErrorSeverity.ERROR,
      "TYPE_MISMATCH": ErrorSeverity.ERROR,
      "UNKNOWN_ERROR": ErrorSeverity.CRITICAL,
    };

    return mapping[kind] || ErrorSeverity.ERROR;
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
