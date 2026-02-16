/**
 * Unified Error System - Final Export Module
 *
 * This module provides the complete export interface for the unified error system,
 * consolidating all components into a coherent, production-ready error handling solution.
 */

// Import main components
import {
  type CompleteUnifiedErrorManager,
  ErrorUtils,
  unifiedErrorManager,
} from "./unified_error_implementation.ts";

// Import error handling utilities
import { ErrorHandlingUtils as ErrorUtilsHandling } from "./error_handling_utils.ts";

import type { UnifiedError as _UnifiedError } from "./unified_errors.ts";

// Export only the key interfaces and types (no duplicate exports)
export type { BaseErrorInterface, StandardErrorCode } from "./unified_error_interface.ts";

// Export enums as values so they can be used at runtime
export { ErrorCategory, ErrorSeverity } from "./unified_error_interface.ts";

export type {
  ConfigFileNotFoundError,
  ConfigParseError,
  ConfigValidationError,
  FileSystemError,
  InvalidProfileNameError,
  PathErrorReason,
  PathValidationError,
  RequiredFieldMissingError,
  TypeMismatchError,
  UnifiedError,
  UnknownError,
  ValidationViolation,
} from "./unified_errors.ts";

// Export main functionality
export { ErrorFactories, ErrorGuards } from "./unified_errors.ts";
export { ErrorUtils, unifiedErrorManager };

// Internationalization system
export {
  enhancedI18n,
  EnhancedI18nManager,
  ErrorMessageUtils,
  PluralForm,
  SupportedLanguage,
} from "./enhanced_i18n_system.ts";

export type {
  ErrorMessageDefinition,
  MessageContext,
  MessageParams,
  MessageTemplate,
} from "./enhanced_i18n_system.ts";

// Standardized error codes
export { ErrorCodeRegistry, ErrorCodeUtils } from "./standardized_error_codes.ts";

export type { ErrorCodeMetadata } from "./standardized_error_codes.ts";

// Interface specifications
export type {
  ErrorAggregator,
  ErrorConfiguration,
  ErrorContext,
  ErrorFactory,
  ErrorHandler,
  ErrorI18nConfig,
  ErrorLifecycleHooks,
  ErrorMetrics,
  ErrorRecoveryStrategy,
  ErrorReporter,
  ErrorSerializer,
  ErrorTransformer,
  ErrorValidator,
  UnifiedErrorInterface,
  UnifiedErrorManager,
} from "./unified_error_interface.ts";

// Legacy compatibility exports already handled above

// UnifiedError type already imported above

export { convertLegacyError, ErrorCodeMapping, isErrorCode } from "./error_code_mapping.ts";

// Import ErrorFactories for use in utility functions
import { ErrorFactories } from "./unified_errors.ts";
import {
  type BaseErrorInterface,
  ErrorCategory,
  type ErrorConfiguration,
  ErrorSeverity,
  type StandardErrorCode as _StandardErrorCode,
} from "./unified_error_interface.ts";

// Type guard to check if an object is a BaseErrorInterface
function isBaseErrorInterface(value: unknown): value is BaseErrorInterface {
  return (
    value !== null &&
    typeof value === "object" &&
    "kind" in value &&
    "code" in value &&
    "category" in value &&
    "severity" in value &&
    "message" in value &&
    "timestamp" in value
  );
}

// Helper function to convert error to unified error using Total Function principle
function toUnifiedError(
  error: Error | string | BaseErrorInterface,
  context?: string,
): _UnifiedError {
  // Type-safe check without type assertion
  if (isBaseErrorInterface(error)) {
    // Convert BaseErrorInterface to UnifiedError by creating UnknownError
    return ErrorFactories.unknown(
      new Error(error.message),
      context ?? error.kind,
    );
  }

  // Convert to UnknownError
  const unknownError = ErrorFactories.unknown(
    error instanceof Error ? error : new Error(String(error)),
    context,
  );

  // Return the error directly without unnecessary spreading
  return unknownError;
}

// Helper function to convert error to BaseErrorInterface
function toBaseError(
  error: Error | string | BaseErrorInterface | _UnifiedError,
  context?: string,
): BaseErrorInterface {
  // If already BaseErrorInterface, return as is
  if (isBaseErrorInterface(error)) {
    return error;
  }

  // Convert to UnifiedError first
  const unifiedError = ErrorUtilsHandling.isUnifiedError(error)
    ? error
    : toUnifiedError(error, context);

  // Convert UnifiedError to BaseErrorInterface
  return ErrorUtilsHandling.toBaseErrorInterface(unifiedError);
}

// Result types integration
export { Result } from "../types/unified_result.ts";

/**
 * Quick start factory for common error types
 */
export const QuickErrorFactory = {
  /**
   * Create configuration file not found error
   */
  configNotFound: (path: string, type: "app" | "user" = "app") =>
    ErrorFactories.configFileNotFound(path, type),

  /**
   * Create configuration parse error
   */
  configParseFailed: (path: string, syntaxError: string, line?: number, column?: number) =>
    ErrorFactories.configParseError(path, syntaxError, line, column),

  /**
   * Create validation error for missing field
   */
  fieldMissing: (field: string, parent?: string) =>
    ErrorFactories.requiredFieldMissing(field, parent),

  /**
   * Create validation error for type mismatch
   */
  typeMismatch: <T>(field: string, expected: string, actual: string, value: T) =>
    ErrorFactories.typeMismatch(field, expected, actual, value),

  /**
   * Create security error for path traversal
   */
  pathTraversal: (path: string, field: string) =>
    ErrorFactories.pathValidationError(path, "PATH_TRAVERSAL", field),

  /**
   * Create unknown error wrapper
   */
  unknown: (error: Error | string, context?: string) => ErrorFactories.unknown(error, context),
};

/**
 * Error handling utilities for common scenarios
 */
/**
 * Handle promise rejections and convert to unified errors
 */
async function handleAsyncImpl<T>(
  promise: Promise<T>,
  context?: string,
): Promise<{ success: true; data: T } | { success: false; error: BaseErrorInterface }> {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (error) {
    // Type-safe error handling
    const baseError = toBaseError(
      error instanceof Error ? error : new Error(String(error)),
      context,
    );
    await unifiedErrorManager.processError(baseError);
    return { success: false, error: baseError };
  }
}

/**
 * Handle synchronous operations and convert to unified errors
 */
function handleSyncImpl<T>(
  operation: () => T,
  context?: string,
): { success: true; data: T } | { success: false; error: BaseErrorInterface } {
  try {
    const data = operation();
    return { success: true, data };
  } catch (error) {
    // Type-safe error handling
    const baseError = toBaseError(
      error instanceof Error ? error : new Error(String(error)),
      context,
    );
    // Note: Sync processing - no await
    unifiedErrorManager.processError(baseError);
    return { success: false, error: baseError };
  }
}

export const ErrorHandlingUtils = {
  handleAsync: handleAsyncImpl,
  handleSync: handleSyncImpl,

  /**
   * Create error boundary for function execution
   */
  withErrorBoundary<T extends readonly unknown[], R>(
    fn: (...args: T) => R,
    context?: string,
  ): (...args: T) => { success: true; data: R } | { success: false; error: BaseErrorInterface } {
    return (...args: T) => {
      return handleSyncImpl(() => fn(...args), context);
    };
  },

  /**
   * Create async error boundary for promise-returning functions
   */
  withAsyncErrorBoundary<T extends readonly unknown[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string,
  ): (
    ...args: T
  ) => Promise<{ success: true; data: R } | { success: false; error: BaseErrorInterface }> {
    return async (...args: T) => {
      return await handleAsyncImpl(fn(...args), context);
    };
  },
};

/**
 * Diagnostic utilities for error analysis
 */
export const ErrorDiagnostics = {
  /**
   * Generate comprehensive error report
   */
  generateReport(): string {
    const report = unifiedErrorManager.getErrorReport();

    const sections = [
      "=== UNIFIED ERROR SYSTEM REPORT ===",
      "",
      "📊 Summary:",
      `  Total Errors: ${report.summary.total}`,
      `  Critical Errors: ${report.summary.bySeverity[ErrorSeverity.CRITICAL] || 0}`,
      `  Recent Errors: ${report.recentErrors.length}`,
      "",
      "📈 Metrics:",
      `  Error Rate (last minute): ${report.metrics.errorRate.toFixed(2)}/sec`,
      "",
      "🗂️ By Category:",
      ...Object.entries(report.summary.byCategory)
        .filter(([_, count]) => (count as number) > 0)
        .map(([category, count]) => `  ${category}: ${count}`),
      "",
      "⚠️ By Severity:",
      ...Object.entries(report.summary.bySeverity)
        .filter(([_, count]) => (count as number) > 0)
        .map(([severity, count]) => `  ${severity}: ${count}`),
      "",
      "🔍 Recent Errors:",
      ...report.recentErrors.slice(-5).map((error) =>
        `  [${error.timestamp.toISOString()}] ${error.code}: ${error.message}`
      ),
    ];

    return sections.join("\n");
  },

  /**
   * Check system health based on error patterns
   */
  checkSystemHealth(): {
    status: "healthy" | "warning" | "critical";
    issues: string[];
    recommendations: string[];
  } {
    const report = unifiedErrorManager.getErrorReport();
    const issues: string[] = [];
    const recommendations: string[] = [];

    let status: "healthy" | "warning" | "critical" = "healthy";

    // Check for critical errors
    const criticalCount = report.summary.bySeverity[ErrorSeverity.CRITICAL] || 0;
    if (criticalCount > 0) {
      status = "critical";
      issues.push(`${criticalCount} critical errors detected`);
      recommendations.push("Investigate critical errors immediately");
    }

    // Check error rate
    const errorRate = report.metrics.errorRate;
    if (errorRate > 10) { // More than 10 errors per second
      status = status === "critical" ? "critical" : "warning";
      issues.push(`High error rate: ${errorRate.toFixed(2)}/sec`);
      recommendations.push("Monitor system performance and error patterns");
    }

    // Check for configuration errors
    const configErrors = report.summary.byCategory[ErrorCategory.CONFIGURATION] || 0;
    if (configErrors > 5) {
      status = status === "critical" ? "critical" : "warning";
      issues.push(`Multiple configuration errors: ${configErrors}`);
      recommendations.push("Review configuration files for issues");
    }

    // Check for path security errors
    const securityErrors = report.summary.byCategory[ErrorCategory.PATH_SECURITY] || 0;
    if (securityErrors > 0) {
      status = "critical";
      issues.push(`Security violations detected: ${securityErrors}`);
      recommendations.push("Review path security violations immediately");
    }

    if (issues.length === 0) {
      issues.push("No issues detected");
      recommendations.push("System is operating normally");
    }

    return { status, issues, recommendations };
  },

  /**
   * Export error data for external analysis
   */
  exportErrorData(format: "json" | "csv" = "json"): string {
    const errors = unifiedErrorManager.getAggregator().getErrors();

    if (format === "csv") {
      const headers = ["timestamp", "code", "category", "severity", "message", "correlationId"];
      const rows = errors.map((error) => [
        error.timestamp.toISOString(),
        error.code,
        error.category,
        error.severity,
        error.message.replace(/,/g, ";"), // Escape commas
        error.correlationId || "",
      ]);

      return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    }

    // JSON format
    return JSON.stringify(
      errors.map((error) => ({
        timestamp: error.timestamp.toISOString(),
        code: error.code,
        category: error.category,
        severity: error.severity,
        message: error.message,
        correlationId: error.correlationId,
        context: error.context,
      })),
      null,
      2,
    );
  },
};

/**
 * Configuration presets for common scenarios
 */
export const ErrorConfigPresets = {
  /**
   * Development configuration - verbose logging, all features enabled
   */
  development: (): ErrorConfiguration => ({
    enableReporting: true,
    enableMetrics: true,
    enableAggregation: true,
    maxErrorHistory: 1000,
    errorRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
    debugMode: true,
  }),

  /**
   * Production configuration - optimized for performance
   */
  production: (): ErrorConfiguration => ({
    enableReporting: true,
    enableMetrics: true,
    enableAggregation: true,
    maxErrorHistory: 500,
    errorRetentionMs: 60 * 60 * 1000, // 1 hour
    debugMode: false,
  }),

  /**
   * Testing configuration - minimal overhead
   */
  testing: (): ErrorConfiguration => ({
    enableReporting: false,
    enableMetrics: false,
    enableAggregation: true,
    maxErrorHistory: 100,
    errorRetentionMs: 5 * 60 * 1000, // 5 minutes
    debugMode: false,
  }),
};

/**
 * Initialize unified error system with preset configuration
 */
export function initializeErrorSystem(
  customConfig?: Partial<ErrorConfiguration>,
  preset: "development" | "production" | "testing" = "production",
): CompleteUnifiedErrorManager {
  const baseConfig = ErrorConfigPresets[preset]();
  const finalConfig = { ...baseConfig, ...customConfig };

  unifiedErrorManager.configure(finalConfig);

  return unifiedErrorManager;
}
