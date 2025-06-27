/**
 * Unified Error System - Final Export Module
 *
 * This module provides the complete export interface for the unified error system,
 * consolidating all components into a coherent, production-ready error handling solution.
 */

// Import main components
import {
  CompleteUnifiedErrorManager,
  ErrorUtils,
  unifiedErrorManager,
} from "./unified_error_implementation.ts";

// Export only the key interfaces and types (no duplicate exports)
export type {
  BaseErrorInterface,
  ErrorCategory,
  ErrorSeverity,
  StandardErrorCode,
} from "./unified_error_interface.ts";

export type {
  ConfigFileNotFoundError,
  ConfigParseError,
  ConfigValidationError,
  InvalidProfileNameError,
  RequiredFieldMissingError,
  TypeMismatchError,
  UnknownError,
  FileSystemError,
  PathValidationError,
  UnifiedError,
  ValidationViolation,
  PathErrorReason,
} from "./unified_errors.ts";

// Export main functionality
export { ErrorFactories, ErrorGuards } from "./unified_errors.ts";
export { unifiedErrorManager, ErrorUtils };

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
export {
  ErrorCodeRegistry,
  ErrorCodeUtils,
} from "./standardized_error_codes.ts";

export type {
  ErrorCodeMetadata,
} from "./standardized_error_codes.ts";

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

// Import unified error types
import { UnifiedError } from "./unified_errors.ts";

export { convertLegacyError, ErrorCodeMapping, isErrorCode } from "./error_code_mapping.ts";

// Import ErrorFactories for use in utility functions
import { ErrorFactories } from "./unified_errors.ts";
import { BaseErrorInterface, ErrorCategory, ErrorSeverity, StandardErrorCode, ErrorConfiguration } from "./unified_error_interface.ts";
import { unifiedErrorManager } from "./unified_error_implementation.ts";

// Helper function to convert any error to unified error
function toUnifiedError(error: unknown, context?: string): BaseErrorInterface {
  if (error && typeof error === "object" && "kind" in error) {
    return error as BaseErrorInterface;
  }

  // Convert to UnknownError
  const unknownError = ErrorFactories.unknown(error, context);
  return {
    ...unknownError,
    code: StandardErrorCode.UN_UNKNOWN_ERROR,
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.ERROR,
  } as BaseErrorInterface;
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
  fieldMissing: (field: string, parent?: string) => ErrorFactories.requiredFieldMissing(field, parent),

  /**
   * Create validation error for type mismatch
   */
  typeMismatch: (field: string, expected: string, actual: string, value: unknown) =>
    ErrorFactories.typeMismatch(field, expected, actual, value),

  /**
   * Create security error for path traversal
   */
  pathTraversal: (path: string, field: string) => ErrorFactories.pathValidationError(path, "PATH_TRAVERSAL", field),

  /**
   * Create unknown error wrapper
   */
  unknown: (error: unknown, context?: string) => ErrorFactories.unknown(error, context),
};

/**
 * Error handling utilities for common scenarios
 */
export const ErrorHandlingUtils = {
  /**
   * Handle promise rejections and convert to unified errors
   */
  async handleAsync<T>(
    promise: Promise<T>,
    context?: string,
  ): Promise<{ success: true; data: T } | { success: false; error: BaseErrorInterface }> {
    try {
      const data = await promise;
      return { success: true, data };
    } catch (error) {
      const unifiedError = toUnifiedError(error, context);
      await unifiedErrorManager.processError(unifiedError);
      return { success: false, error: unifiedError };
    }
  },

  /**
   * Handle synchronous operations and convert to unified errors
   */
  handleSync<T>(
    operation: () => T,
    context?: string,
  ): { success: true; data: T } | { success: false; error: BaseErrorInterface } {
    try {
      const data = operation();
      return { success: true, data };
    } catch (error) {
      const unifiedError = toUnifiedError(error, context);
      // Note: Sync processing - no await
      unifiedErrorManager.processError(unifiedError);
      return { success: false, error: unifiedError };
    }
  },

  /**
   * Create error boundary for function execution
   */
  withErrorBoundary<T extends any[], R>(
    fn: (...args: T) => R,
    context?: string,
  ): (...args: T) => { success: true; data: R } | { success: false; error: BaseErrorInterface } {
    return (...args: T) => {
      return this.handleSync(() => fn(...args), context);
    };
  },

  /**
   * Create async error boundary for promise-returning functions
   */
  withAsyncErrorBoundary<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string,
  ): (
    ...args: T
  ) => Promise<{ success: true; data: R } | { success: false; error: BaseErrorInterface }> {
    return async (...args: T) => {
      return await this.handleAsync(fn(...args), context);
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
  preset: "development" | "production" | "testing" = "production",
  customConfig?: Partial<ErrorConfiguration>,
): CompleteUnifiedErrorManager {
  const baseConfig = ErrorConfigPresets[preset]();
  const finalConfig = { ...baseConfig, ...customConfig };

  unifiedErrorManager.configure(finalConfig);

  console.log(`🚀 Unified Error System initialized with ${preset} preset`);

  return unifiedErrorManager;
}
