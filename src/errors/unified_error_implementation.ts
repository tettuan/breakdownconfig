/**
 * Unified Error Interface Implementation
 *
 * This module provides the complete implementation of the unified error interface,
 * integrating all components: polymorphic system, i18n, standardized codes,
 * and advanced error management capabilities.
 */

import {
  BaseErrorInterface,
  ErrorAggregator,
  ErrorCategory,
  ErrorConfiguration,
  ErrorI18nConfig,
  ErrorLifecycleHooks,
  ErrorMetrics,
  ErrorRecoveryStrategy,
  ErrorReporter,
  ErrorSerializer,
  ErrorSeverity,
  ErrorTransformer,
  ErrorValidator,
  StandardErrorCode,
  UnifiedErrorManager,
} from "./unified_error_interface.ts";

import {
  AbstractError,
  createError,
  ErrorChainBuilder,
  makeErrorVisitable,
  PolymorphicErrorFactoryRegistry,
  PolymorphicErrorHandlerRegistry,
} from "./polymorphic_error_system.ts";

import {
  enhancedI18n,
  EnhancedI18nManager,
  ErrorMessageUtils,
  MessageContext,
  MessageParams,
  SupportedLanguage,
} from "./enhanced_i18n_system.ts";

import { ErrorCodeRegistry, ErrorCodeUtils } from "./standardized_error_codes.ts";
import { UnifiedError } from "./unified_errors.ts";

/**
 * Production-ready error aggregator implementation
 */
export class ProductionErrorAggregator implements ErrorAggregator {
  private errors: BaseErrorInterface[] = [];
  private maxErrors: number = 1000;

  constructor(maxErrors = 1000) {
    this.maxErrors = maxErrors;
  }

  addError(error: BaseErrorInterface): void {
    this.errors.push(error);

    // Prevent memory leaks by limiting error history
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  getErrors(): BaseErrorInterface[] {
    return [...this.errors];
  }

  getErrorsByCategory(category: ErrorCategory): BaseErrorInterface[] {
    return this.errors.filter((error) => error.category === category);
  }

  getErrorsBySeverity(severity: ErrorSeverity): BaseErrorInterface[] {
    return this.errors.filter((error) => error.severity === severity);
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  hasCriticalErrors(): boolean {
    return this.errors.some((error) => error.severity === ErrorSeverity.CRITICAL);
  }

  clear(): void {
    this.errors.length = 0;
  }

  /**
   * Get error summary statistics
   */
  getErrorSummary(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    mostRecent: BaseErrorInterface | null;
  } {
    const byCategory = {} as Record<ErrorCategory, number>;
    const bySeverity = {} as Record<ErrorSeverity, number>;

    // Initialize counters
    Object.values(ErrorCategory).forEach((cat) => (byCategory as Record<string, unknown>)[cat] = 0);
    Object.values(ErrorSeverity).forEach((sev) => (bySeverity as Record<string, unknown>)[sev] = 0);

    // Count errors
    this.errors.forEach((error) => {
      byCategory[error.category]++;
      bySeverity[error.severity]++;
    });

    return {
      total: this.errors.length,
      byCategory,
      bySeverity,
      mostRecent: this.errors[this.errors.length - 1] || null,
    };
  }
}

/**
 * Console-based error reporter for development
 */
export class ConsoleErrorReporter implements ErrorReporter {
  private config: { enableColors: boolean; verboseMode: boolean } = {
    enableColors: true,
    verboseMode: false,
  };

  async report(error: BaseErrorInterface): Promise<void> {
    const severity = error.severity;
    const message = this.formatErrorMessage(error);

    switch (severity) {
      case ErrorSeverity.CRITICAL:
        console.error(`🔥 CRITICAL: ${message}`);
        break;
      case ErrorSeverity.ERROR:
        console.error(`❌ ERROR: ${message}`);
        break;
      case ErrorSeverity.WARNING:
        console.warn(`⚠️  WARNING: ${message}`);
        break;
      case ErrorSeverity.INFO:
        console.info(`ℹ️  INFO: ${message}`);
        break;
    }

    if (this.config.verboseMode) {
      console.debug(JSON.stringify(error, null, 2));
    }
  }

  async reportBatch(errors: BaseErrorInterface[]): Promise<void> {
    console.group(`📊 Error Batch Report (${errors.length} errors)`);

    for (const error of errors) {
      await this.report(error);
    }

    console.groupEnd();
  }

  configure(config: Record<string, unknown>): void {
    if (typeof config.enableColors === "boolean") {
      this.config.enableColors = config.enableColors;
    }
    if (typeof config.verboseMode === "boolean") {
      this.config.verboseMode = config.verboseMode;
    }
  }

  private formatErrorMessage(error: BaseErrorInterface): string {
    const userFriendly = ErrorMessageUtils.createUserFriendlyMessage(error);
    const timestamp = error.timestamp.toISOString();
    return `[${timestamp}] ${error.code}: ${userFriendly}`;
  }
}

/**
 * Simple in-memory error metrics collector
 */
export class MemoryErrorMetrics implements ErrorMetrics {
  private errorCounts: Map<string, number> = new Map();
  private errorTimestamps: Date[] = [];
  private maxHistorySize = 10000;

  recordError(error: BaseErrorInterface): void {
    // Count by category
    const categoryKey = `category:${error.category}`;
    this.errorCounts.set(categoryKey, (this.errorCounts.get(categoryKey) || 0) + 1);

    // Count by severity
    const severityKey = `severity:${error.severity}`;
    this.errorCounts.set(severityKey, (this.errorCounts.get(severityKey) || 0) + 1);

    // Count by code
    const codeKey = `code:${error.code}`;
    this.errorCounts.set(codeKey, (this.errorCounts.get(codeKey) || 0) + 1);

    // Track timestamps for rate calculation
    this.errorTimestamps.push(error.timestamp);

    // Limit memory usage
    if (this.errorTimestamps.length > this.maxHistorySize) {
      this.errorTimestamps = this.errorTimestamps.slice(-this.maxHistorySize);
    }
  }

  getErrorCountByCategory(category: ErrorCategory): number {
    return this.errorCounts.get(`category:${category}`) || 0;
  }

  getErrorCountBySeverity(severity: ErrorSeverity): number {
    return this.errorCounts.get(`severity:${severity}`) || 0;
  }

  getErrorRate(periodMs: number): number {
    const cutoff = new Date(Date.now() - periodMs);
    const recentErrors = this.errorTimestamps.filter((ts) => ts >= cutoff);
    return recentErrors.length / (periodMs / 1000); // errors per second
  }

  reset(): void {
    this.errorCounts.clear();
    this.errorTimestamps.length = 0;
  }

  /**
   * Get all collected metrics
   */
  getAllMetrics(): {
    totalErrors: number;
    categoryCounts: Record<ErrorCategory, number>;
    severityCounts: Record<ErrorSeverity, number>;
    codeCounts: Record<StandardErrorCode, number>;
    errorRate: number;
  } {
    const categoryCounts = {} as Record<ErrorCategory, number>;
    const severityCounts = {} as Record<ErrorSeverity, number>;
    const codeCounts = {} as Record<StandardErrorCode, number>;

    // Initialize counters
    Object.values(ErrorCategory).forEach((cat) =>
      (categoryCounts as Record<string, unknown>)[cat] = 0
    );
    Object.values(ErrorSeverity).forEach((sev) =>
      (severityCounts as Record<string, unknown>)[sev] = 0
    );
    Object.values(StandardErrorCode).forEach((code) =>
      (codeCounts as Record<string, unknown>)[code] = 0
    );

    // Fill with actual counts
    this.errorCounts.forEach((count, key) => {
      if (key.startsWith("category:")) {
        const category = key.replace("category:", "") as ErrorCategory;
        (categoryCounts as Record<string, unknown>)[category] = count;
      } else if (key.startsWith("severity:")) {
        const severity = key.replace("severity:", "") as ErrorSeverity;
        (severityCounts as Record<string, unknown>)[severity] = count;
      } else if (key.startsWith("code:")) {
        const code = key.replace("code:", "") as StandardErrorCode;
        (codeCounts as Record<string, unknown>)[code] = count;
      }
    });

    return {
      totalErrors: this.errorTimestamps.length,
      categoryCounts,
      severityCounts,
      codeCounts,
      errorRate: this.getErrorRate(60000), // last minute
    };
  }
}

/**
 * JSON-based error serializer
 */
export class JsonErrorSerializer implements ErrorSerializer {
  serialize(error: BaseErrorInterface): string {
    return JSON.stringify(
      {
        kind: error.kind,
        code: error.code,
        category: error.category,
        severity: error.severity,
        message: error.message,
        timestamp: error.timestamp.toISOString(),
        context: error.context,
        cause: error.cause ? this.serializeCause(error.cause) : undefined,
        correlationId: error.correlationId,
        stackTrace: error.stackTrace,
      },
      null,
      2,
    );
  }

  deserialize(json: string): BaseErrorInterface {
    const data = JSON.parse(json);

    // Recreate the error using factory if available
    try {
      return createError.unknown(new Error(data.message), data.kind);
    } catch {
      // Fallback to basic error structure
      return {
        kind: data.kind || "UNKNOWN_ERROR",
        code: data.code || StandardErrorCode.UN_UNKNOWN_ERROR,
        category: data.category || ErrorCategory.UNKNOWN,
        severity: data.severity || ErrorSeverity.ERROR,
        message: data.message || "Unknown error",
        timestamp: new Date(data.timestamp),
        context: data.context,
        cause: data.cause ? this.deserialize(JSON.stringify(data.cause)) : undefined,
        correlationId: data.correlationId,
        stackTrace: data.stackTrace,
      };
    }
  }

  serializeToBinary(error: BaseErrorInterface): Uint8Array {
    const json = this.serialize(error);
    return new TextEncoder().encode(json);
  }

  deserializeFromBinary(data: Uint8Array): BaseErrorInterface {
    const json = new TextDecoder().decode(data);
    return this.deserialize(json);
  }

  private serializeCause(cause: BaseErrorInterface): unknown {
    return {
      kind: cause.kind,
      code: cause.code,
      message: cause.message,
      timestamp: cause.timestamp.toISOString(),
      correlationId: cause.correlationId,
    };
  }
}

/**
 * Basic error validator
 */
export class BasicErrorValidator implements ErrorValidator {
  validate(error: BaseErrorInterface): boolean {
    const errors = this.getValidationErrors(error);
    return errors.length === 0;
  }

  getValidationErrors(error: BaseErrorInterface): string[] {
    const errors: string[] = [];

    if (!error.kind) errors.push("Missing required field: kind");
    if (!error.code) errors.push("Missing required field: code");
    if (!error.category) errors.push("Missing required field: category");
    if (!error.severity) errors.push("Missing required field: severity");
    if (!error.message) errors.push("Missing required field: message");
    if (!error.timestamp) errors.push("Missing required field: timestamp");

    // Validate enum values
    if (error.category && !Object.values(ErrorCategory).includes(error.category)) {
      errors.push(`Invalid category: ${error.category}`);
    }

    if (error.severity && !Object.values(ErrorSeverity).includes(error.severity)) {
      errors.push(`Invalid severity: ${error.severity}`);
    }

    if (error.code && !Object.values(StandardErrorCode).includes(error.code)) {
      errors.push(`Invalid error code: ${error.code}`);
    }

    // Validate timestamp
    if (error.timestamp && !(error.timestamp instanceof Date)) {
      errors.push("Timestamp must be a Date object");
    }

    return errors;
  }

  isWellFormed(error: BaseErrorInterface): boolean {
    return this.validate(error) &&
      error.message.length > 0 &&
      error.correlationId !== undefined;
  }
}

/**
 * Complete unified error manager implementation
 */
export class CompleteUnifiedErrorManager implements UnifiedErrorManager {
  private handlerRegistry = new PolymorphicErrorHandlerRegistry();
  private factoryRegistry = new PolymorphicErrorFactoryRegistry();
  private aggregator = new ProductionErrorAggregator();
  private reporter = new ConsoleErrorReporter();
  private metrics = new MemoryErrorMetrics();
  private serializer = new JsonErrorSerializer();
  private validator = new BasicErrorValidator();
  private i18nManager = enhancedI18n;
  private config: ErrorConfiguration;
  private lifecycleHooks?: ErrorLifecycleHooks;

  constructor(config?: Partial<ErrorConfiguration>) {
    this.config = {
      enableReporting: true,
      enableMetrics: true,
      enableAggregation: true,
      maxErrorHistory: 1000,
      errorRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
      debugMode: false,
      ...config,
    };

    this.lifecycleHooks = config?.lifecycleHooks;
    this.initializeDefaultFactories();
  }

  private initializeDefaultFactories(): void {
    // Register default error factories
    this.factoryRegistry.registerFactory("CONFIG_FILE_NOT_FOUND", {
      errorType: "CONFIG_FILE_NOT_FOUND",
      create: (params: any) =>
        createError.configFileNotFound(
          params.path,
          params.configType,
          params.searchedLocations,
        ),
      createWithContext: (params: any, context: any) => {
        const error = createError.configFileNotFound(
          params.path,
          params.configType,
          params.searchedLocations,
        );
        return { ...error, context };
      },
    });

    // Add more factories as needed...
  }

  registerHandler(handler: any): void {
    this.handlerRegistry.registerHandler(handler.errorType || "global", handler);
  }

  registerFactory(factory: any): void {
    this.factoryRegistry.registerFactory(factory.errorType, factory);
  }

  async processError(error: BaseErrorInterface): Promise<void> {
    try {
      // Lifecycle hook: before processing
      await this.lifecycleHooks?.beforeProcess?.(error);

      // Validate error
      if (!this.validator.validate(error)) {
        console.warn("Invalid error object:", this.validator.getValidationErrors(error));
      }

      // Aggregate error
      if (this.config.enableAggregation) {
        this.aggregator.addError(error);
      }

      // Record metrics
      if (this.config.enableMetrics) {
        this.metrics.recordError(error);
      }

      // Handle error
      const result = await this.handlerRegistry.handleError(error);

      // Report error if not handled
      if (this.config.enableReporting && result !== undefined) {
        await this.reporter.report(result as BaseErrorInterface);
      }

      // Lifecycle hook: after processing
      await this.lifecycleHooks?.afterProcess?.(error);
    } catch (processingError) {
      console.error("Error during error processing:", processingError);

      // Fallback reporting
      if (this.config.enableReporting) {
        await this.reporter.report(error);
      }
    }
  }

  createError<T extends BaseErrorInterface>(errorType: string, params: unknown): T {
    return this.factoryRegistry.createError<T>(errorType, params);
  }

  getAggregator(): ErrorAggregator {
    return this.aggregator;
  }

  getReporter(): ErrorReporter {
    return this.reporter;
  }

  getMetrics(): ErrorMetrics {
    return this.metrics;
  }

  configureI18n(config: ErrorI18nConfig): void {
    // Configure the i18n manager
    this.i18nManager.setLanguage(config.defaultLanguage as SupportedLanguage);
    // Register additional language bundles if provided
  }

  getLocalizedMessage(error: BaseErrorInterface, language?: string): string {
    const context: MessageContext = {
      language: language as SupportedLanguage,
      params: error.context as MessageParams,
    };
    return this.i18nManager.getErrorMessage(error, context);
  }

  /**
   * Get comprehensive error report
   */
  getErrorReport(): {
    summary: any;
    metrics: any;
    recentErrors: BaseErrorInterface[];
  } {
    return {
      summary: this.aggregator.getErrorSummary(),
      metrics: this.metrics.getAllMetrics(),
      recentErrors: this.aggregator.getErrors().slice(-10),
    };
  }

  /**
   * Clear all error data
   */
  clearAll(): void {
    this.aggregator.clear();
    this.metrics.reset();
  }

  /**
   * Configure error management settings
   */
  configure(config: Partial<ErrorConfiguration>): void {
    this.config = { ...this.config, ...config };

    if (config.customHandlers) {
      config.customHandlers.forEach((handler) => this.registerHandler(handler));
    }

    if (config.lifecycleHooks) {
      this.lifecycleHooks = config.lifecycleHooks;
    }
  }
}

/**
 * Singleton instance for global use
 */
export const unifiedErrorManager = new CompleteUnifiedErrorManager({
  enableReporting: true,
  enableMetrics: true,
  enableAggregation: true,
  debugMode: false,
});

/**
 * Convenience functions for common error operations
 */
export const ErrorUtils = {
  /**
   * Create and process error in one call
   */
  async createAndProcess<T extends BaseErrorInterface>(
    errorType: string,
    params: unknown,
  ): Promise<T> {
    const error = unifiedErrorManager.createError<T>(errorType, params);
    await unifiedErrorManager.processError(error);
    return error;
  },

  /**
   * Convert any error to unified error
   */
  toUnifiedError(error: unknown, context?: string): BaseErrorInterface {
    if (error && typeof error === "object" && "kind" in error) {
      return error as BaseErrorInterface;
    }

    return createError.unknown(error, context);
  },

  /**
   * Create error chain from multiple errors
   */
  createErrorChain(...errors: BaseErrorInterface[]): BaseErrorInterface | null {
    const builder = new ErrorChainBuilder();
    errors.forEach((error) => builder.addError(error));
    return builder.buildChain();
  },

  /**
   * Make error visitable for visitor pattern
   */
  makeVisitable: makeErrorVisitable,

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: BaseErrorInterface, language?: SupportedLanguage): string {
    return ErrorMessageUtils.createUserFriendlyMessage(error, { language });
  },

  /**
   * Get technical error details
   */
  getTechnicalDetails(error: BaseErrorInterface): string {
    return ErrorMessageUtils.createTechnicalMessage(error);
  },
};

// Note: Classes are exported individually above, no need for re-export block

// Export specific error types for backward compatibility
export type ConfigurationError = UnifiedError & {
  kind: "CONFIG_FILE_NOT_FOUND" | "CONFIG_PARSE_ERROR" | "CONFIG_NOT_LOADED";
};
export type ValidationError = UnifiedError & {
  kind: "CONFIG_VALIDATION_ERROR" | "TYPE_MISMATCH" | "REQUIRED_FIELD_MISSING";
};
export type PathSecurityError = UnifiedError & { kind: "PATH_VALIDATION_ERROR" };
export type SystemError = UnifiedError & { kind: "FILE_SYSTEM_ERROR" | "UNKNOWN_ERROR" };
export type ConfigFileNotFoundError = UnifiedError & { kind: "CONFIG_FILE_NOT_FOUND" };
