/**
 * Polymorphic Error System with Optimized Type Hierarchy
 *
 * This module implements an advanced polymorphic error handling system
 * with optimized type hierarchies, method dispatch, and extensibility.
 */

import {
  BaseErrorInterface,
  ErrorAggregator,
  ErrorCategory,
  ErrorFactory,
  ErrorHandler,
  ErrorMetrics,
  ErrorReporter,
  ErrorSerializer,
  ErrorSeverity,
  ErrorTransformer,
  ErrorValidator,
  StandardErrorCode,
} from "./unified_error_interface.ts";

/**
 * Abstract base error class implementing common functionality
 */
export abstract class AbstractError implements BaseErrorInterface {
  abstract readonly kind: string;
  abstract readonly code: StandardErrorCode;
  abstract readonly category: ErrorCategory;
  abstract readonly severity: ErrorSeverity;

  readonly timestamp: Date;
  readonly correlationId: string;
  readonly stackTrace?: string;

  constructor(
    public readonly message: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: BaseErrorInterface,
  ) {
    this.timestamp = new Date();
    this.correlationId = this.generateCorrelationId();
    this.stackTrace = new Error().stack;
  }

  /**
   * Generate unique correlation ID for error tracking
   */
  private generateCorrelationId(): string {
    return `${this.kind}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get formatted error message
   */
  abstract getFormattedMessage(): string;

  /**
   * Get error details for debugging
   */
  getDebugInfo(): Record<string, unknown> {
    return {
      kind: this.kind,
      code: this.code,
      category: this.category,
      severity: this.severity,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      context: this.context,
      cause: this.cause
        ? {
          kind: this.cause.kind,
          message: this.cause.message,
          code: this.cause.code,
        }
        : undefined,
      stackTrace: this.stackTrace,
    };
  }

  /**
   * Check if error is recoverable
   */
  abstract isRecoverable(): boolean;

  /**
   * Get recovery suggestions
   */
  abstract getRecoverySuggestions(): string[];

  /**
   * Convert to JSON representation
   */
  toJSON(): Record<string, unknown> {
    return this.getDebugInfo();
  }

  /**
   * String representation
   */
  toString(): string {
    return `${this.code}: ${this.getFormattedMessage()}`;
  }
}

/**
 * Configuration error hierarchy
 */
export abstract class ConfigurationError extends AbstractError {
  readonly category = ErrorCategory.CONFIGURATION;

  constructor(
    message: string,
    public readonly path: string,
    context?: Record<string, unknown>,
    cause?: BaseErrorInterface,
  ) {
    super(message, { ...context, path }, cause);
  }

  getFormattedMessage(): string {
    return `Configuration error at '${this.path}': ${this.message}`;
  }
}

export class ConfigFileNotFoundError extends ConfigurationError {
  readonly kind = "CONFIG_FILE_NOT_FOUND";
  readonly code = StandardErrorCode.CF_CONFIG_FILE_NOT_FOUND;
  readonly severity = ErrorSeverity.ERROR;

  constructor(
    path: string,
    public readonly configType: "app" | "user",
    public readonly searchedLocations?: string[],
    context?: Record<string, unknown>,
  ) {
    super(
      `${configType} configuration file not found`,
      path,
      { ...context, configType, searchedLocations },
    );
  }

  override isRecoverable(): boolean {
    return this.configType === "user"; // User config is optional
  }

  getRecoverySuggestions(): string[] {
    const suggestions = [
      `Check if the file exists at: ${this.path}`,
      "Verify file permissions",
      "Check the file path is correct",
    ];

    if (this.searchedLocations?.length) {
      suggestions.push(`Searched locations: ${this.searchedLocations.join(", ")}`);
    }

    if (this.configType === "user") {
      suggestions.push("User configuration is optional - will use defaults");
    } else {
      suggestions.push("Create the configuration file with default values");
    }

    return suggestions;
  }
}

export class ConfigParseError extends ConfigurationError {
  readonly kind = "CONFIG_PARSE_ERROR";
  readonly code = StandardErrorCode.CF_CONFIG_PARSE_ERROR;
  readonly severity = ErrorSeverity.ERROR;

  constructor(
    path: string,
    public readonly syntaxError: string,
    public readonly line?: number,
    public readonly column?: number,
    context?: Record<string, unknown>,
  ) {
    super(
      `Failed to parse configuration file: ${syntaxError}`,
      path,
      { ...context, syntaxError, line, column },
    );
  }

  override isRecoverable(): boolean {
    return false; // Parse errors require manual fix
  }

  getRecoverySuggestions(): string[] {
    const suggestions = [
      "Check YAML/JSON syntax",
      "Verify quotes and brackets are properly closed",
      "Use a syntax validator tool",
    ];

    if (this.line && this.column) {
      suggestions.unshift(`Check syntax at line ${this.line}, column ${this.column}`);
    }

    return suggestions;
  }

  override getFormattedMessage(): string {
    let message = super.getFormattedMessage();
    if (this.line && this.column) {
      message += ` (line ${this.line}, column ${this.column})`;
    }
    return message;
  }
}

/**
 * Validation error hierarchy
 */
export abstract class ValidationError extends AbstractError {
  readonly category = ErrorCategory.VALIDATION;

  constructor(
    message: string,
    public readonly field: string,
    context?: Record<string, unknown>,
    cause?: BaseErrorInterface,
  ) {
    super(message, { ...context, field }, cause);
  }

  getFormattedMessage(): string {
    return `Validation error for field '${this.field}': ${this.message}`;
  }
}

export class RequiredFieldMissingError extends ValidationError {
  readonly kind = "REQUIRED_FIELD_MISSING";
  readonly code = StandardErrorCode.VL_REQUIRED_FIELD_MISSING;
  readonly severity = ErrorSeverity.ERROR;

  constructor(
    field: string,
    public readonly parentObject?: string,
    public readonly availableFields: string[] = [],
    context?: Record<string, unknown>,
  ) {
    super(
      `Required field is missing`,
      field,
      { ...context, parentObject, availableFields },
    );
  }

  override isRecoverable(): boolean {
    return true; // Can provide default value or prompt user
  }

  getRecoverySuggestions(): string[] {
    const suggestions = [
      `Add the required field: ${this.field}`,
      "Check field name spelling",
    ];

    if (this.parentObject) {
      suggestions.push(`Field should be in object: ${this.parentObject}`);
    }

    if (this.availableFields.length > 0) {
      suggestions.push(`Available fields: ${this.availableFields.join(", ")}`);
    }

    return suggestions;
  }

  override getFormattedMessage(): string {
    let message = super.getFormattedMessage();
    if (this.parentObject) {
      message += ` in ${this.parentObject}`;
    }
    return message;
  }
}

export class TypeMismatchError extends ValidationError {
  readonly kind = "TYPE_MISMATCH";
  readonly code = StandardErrorCode.VL_TYPE_MISMATCH;
  readonly severity = ErrorSeverity.ERROR;

  constructor(
    field: string,
    public readonly expectedType: string,
    public readonly actualType: string,
    public readonly value: unknown,
    context?: Record<string, unknown>,
  ) {
    super(
      `Expected ${expectedType}, got ${actualType}`,
      field,
      { ...context, expectedType, actualType, value },
    );
  }

  override isRecoverable(): boolean {
    return true; // Can attempt type conversion
  }

  getRecoverySuggestions(): string[] {
    return [
      `Convert value to ${this.expectedType}`,
      `Current value: ${JSON.stringify(this.value)}`,
      `Expected type: ${this.expectedType}`,
      `Actual type: ${this.actualType}`,
    ];
  }
}

/**
 * Path security error hierarchy
 */
export abstract class PathSecurityError extends AbstractError {
  readonly category = ErrorCategory.PATH_SECURITY;

  constructor(
    message: string,
    public readonly path: string,
    public readonly affectedField: string,
    context?: Record<string, unknown>,
    cause?: BaseErrorInterface,
  ) {
    super(message, { ...context, path, affectedField }, cause);
  }

  getFormattedMessage(): string {
    return `Path security violation in field '${this.affectedField}': ${this.message}`;
  }
}

export class PathTraversalError extends PathSecurityError {
  readonly kind = "PATH_TRAVERSAL";
  readonly code = StandardErrorCode.PS_PATH_TRAVERSAL;
  readonly severity = ErrorSeverity.CRITICAL;

  constructor(
    path: string,
    affectedField: string,
    context?: Record<string, unknown>,
  ) {
    super(
      `Path traversal detected: ${path}`,
      path,
      affectedField,
      context,
    );
  }

  override isRecoverable(): boolean {
    return false; // Security violation - not recoverable
  }

  getRecoverySuggestions(): string[] {
    return [
      "Remove path traversal sequences (../, etc.)",
      "Use only relative paths within allowed directories",
      "Contact security team if this was unexpected",
    ];
  }
}

/**
 * System error hierarchy
 */
export abstract class SystemError extends AbstractError {
  readonly category = ErrorCategory.SYSTEM;
  readonly severity = ErrorSeverity.CRITICAL;

  override isRecoverable(): boolean {
    return false; // System errors typically require intervention
  }
}

export class UnknownError extends SystemError {
  readonly kind = "UNKNOWN_ERROR";
  readonly code = StandardErrorCode.UN_UNKNOWN_ERROR;
  override readonly severity = ErrorSeverity.CRITICAL;

  constructor(
    public readonly originalError: unknown,
    context?: string,
    additionalContext?: Record<string, unknown>,
  ) {
    super(
      `Unknown error occurred: ${
        originalError instanceof Error ? originalError.message : String(originalError)
      }`,
      { ...additionalContext, context, originalError },
    );
  }

  getFormattedMessage(): string {
    const contextStr = this.context?.context ? ` in ${this.context.context}` : "";
    return `Unknown error${contextStr}: ${this.message}`;
  }

  override isRecoverable(): boolean {
    return true; // Unknown errors might be transient
  }

  getRecoverySuggestions(): string[] {
    return [
      "Check application logs for more details",
      "Retry the operation",
      "Contact technical support with correlation ID",
      `Correlation ID: ${this.correlationId}`,
    ];
  }
}

/**
 * Polymorphic error handler registry
 */
export class PolymorphicErrorHandlerRegistry {
  private handlers: Map<string, ErrorHandler[]> = new Map();
  private globalHandlers: ErrorHandler[] = [];

  /**
   * Register error handler for specific error kind
   */
  registerHandler(errorKind: string, handler: ErrorHandler): void {
    if (!this.handlers.has(errorKind)) {
      this.handlers.set(errorKind, []);
    }

    const handlers = this.handlers.get(errorKind)!;
    handlers.push(handler);
    handlers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Register global error handler
   */
  registerGlobalHandler(handler: ErrorHandler): void {
    this.globalHandlers.push(handler);
    this.globalHandlers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Handle error using registered handlers
   */
  async handleError(error: BaseErrorInterface): Promise<void | BaseErrorInterface> {
    // Try specific handlers first
    const kindHandlers = this.handlers.get(error.kind) || [];

    for (const handler of kindHandlers) {
      if (handler.canHandle(error)) {
        try {
          const result = await handler.handle(error);
          if (result === undefined) return; // Successfully handled
          if (result !== error) return result; // Transformed error
        } catch (handlerError) {
          console.warn(`Error handler failed for ${error.kind}:`, handlerError);
        }
      }
    }

    // Try global handlers
    for (const handler of this.globalHandlers) {
      if (handler.canHandle(error)) {
        try {
          const result = await handler.handle(error);
          if (result === undefined) return; // Successfully handled
          if (result !== error) return result; // Transformed error
        } catch (handlerError) {
          console.warn(`Global error handler failed:`, handlerError);
        }
      }
    }

    // Return original error if no handler could process it
    return error;
  }

  /**
   * Get registered handlers for error kind
   */
  getHandlers(errorKind: string): ErrorHandler[] {
    return this.handlers.get(errorKind) || [];
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.globalHandlers.length = 0;
  }
}

/**
 * Error factory registry for polymorphic error creation
 */
export class PolymorphicErrorFactoryRegistry {
  private factories: Map<string, ErrorFactory<BaseErrorInterface>> = new Map();

  /**
   * Register error factory
   */
  registerFactory(errorType: string, factory: ErrorFactory<BaseErrorInterface>): void {
    this.factories.set(errorType, factory);
  }

  /**
   * Create error using registered factory
   */
  createError<T extends BaseErrorInterface>(errorType: string, params: unknown): T {
    const factory = this.factories.get(errorType);
    if (!factory) {
      throw new Error(`No factory registered for error type: ${errorType}`);
    }

    return factory.create(params as Parameters<typeof factory.create>[0]) as T;
  }

  /**
   * Check if factory exists for error type
   */
  hasFactory(errorType: string): boolean {
    return this.factories.has(errorType);
  }

  /**
   * Get all registered error types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.factories.keys());
  }
}

/**
 * Type-safe error visitor pattern implementation
 */
export interface ErrorVisitor<R = void> {
  visitConfigFileNotFound(error: ConfigFileNotFoundError): R;
  visitConfigParseError(error: ConfigParseError): R;
  visitRequiredFieldMissing(error: RequiredFieldMissingError): R;
  visitTypeMismatch(error: TypeMismatchError): R;
  visitPathTraversal(error: PathTraversalError): R;
  visitUnknownError(error: UnknownError): R;
  visitDefault(error: BaseErrorInterface): R;
}

/**
 * Error visitable interface
 */
export interface ErrorVisitable {
  accept<R>(visitor: ErrorVisitor<R>): R;
}

/**
 * Extend errors with visitor pattern support
 */
export function makeErrorVisitable(error: BaseErrorInterface): ErrorVisitable {
  return {
    accept<R>(visitor: ErrorVisitor<R>): R {
      switch (error.kind) {
        case "CONFIG_FILE_NOT_FOUND":
          return visitor.visitConfigFileNotFound(error as ConfigFileNotFoundError);
        case "CONFIG_PARSE_ERROR":
          return visitor.visitConfigParseError(error as ConfigParseError);
        case "REQUIRED_FIELD_MISSING":
          return visitor.visitRequiredFieldMissing(error as RequiredFieldMissingError);
        case "TYPE_MISMATCH":
          return visitor.visitTypeMismatch(error as TypeMismatchError);
        case "PATH_TRAVERSAL":
          return visitor.visitPathTraversal(error as PathTraversalError);
        case "UNKNOWN_ERROR":
          return visitor.visitUnknownError(error as UnknownError);
        default:
          return visitor.visitDefault(error);
      }
    },
  };
}

/**
 * Error chain builder for complex error scenarios
 */
export class ErrorChainBuilder {
  private errors: BaseErrorInterface[] = [];

  /**
   * Add error to chain
   */
  addError(error: BaseErrorInterface): this {
    this.errors.push(error);
    return this;
  }

  /**
   * Build error chain with causality
   */
  buildChain(): BaseErrorInterface | null {
    if (this.errors.length === 0) return null;
    if (this.errors.length === 1) return this.errors[0];

    // Chain errors with cause relationship
    for (let i = 1; i < this.errors.length; i++) {
      const current = this.errors[i];
      const previous = this.errors[i - 1];

      // Create new error with cause if not already set
      if (!current.cause && current instanceof AbstractError) {
        (current as any).cause = previous;
      }
    }

    return this.errors[this.errors.length - 1];
  }

  /**
   * Clear the builder
   */
  clear(): this {
    this.errors.length = 0;
    return this;
  }
}

/**
 * Singleton instances for global use
 */
export const errorHandlerRegistry = new PolymorphicErrorHandlerRegistry();
export const errorFactoryRegistry = new PolymorphicErrorFactoryRegistry();

/**
 * Utility function to create typed error instances
 */
export const createError = {
  configFileNotFound: (path: string, configType: "app" | "user", searchedLocations?: string[]) =>
    new ConfigFileNotFoundError(path, configType, searchedLocations),

  configParseError: (path: string, syntaxError: string, line?: number, column?: number) =>
    new ConfigParseError(path, syntaxError, line, column),

  requiredFieldMissing: (field: string, parentObject?: string, availableFields?: string[]) =>
    new RequiredFieldMissingError(field, parentObject, availableFields),

  typeMismatch: (field: string, expectedType: string, actualType: string, value: unknown) =>
    new TypeMismatchError(field, expectedType, actualType, value),

  pathTraversal: (path: string, affectedField: string) =>
    new PathTraversalError(path, affectedField),

  unknown: (originalError: unknown, context?: string) => new UnknownError(originalError, context),
};
