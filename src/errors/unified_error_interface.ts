/**
 * Unified Error Interface Specification
 *
 * This module defines the complete error interface system for the application,
 * providing type-safe error handling with polymorphism, internationalization,
 * and standardized error codes.
 */

/**
 * Base error severity levels for error categorization
 */
export enum ErrorSeverity {
  /** Informational message - operation can continue */
  INFO = "info",
  /** Warning - potential issue but operation continues */
  WARNING = "warning",
  /** Error - operation failed but application can recover */
  ERROR = "error",
  /** Critical - system-level error requiring immediate attention */
  CRITICAL = "critical",
}

/**
 * Error category classification system
 */
export enum ErrorCategory {
  /** Configuration file related errors */
  CONFIGURATION = "configuration",
  /** Data validation errors */
  VALIDATION = "validation",
  /** File system operation errors */
  FILESYSTEM = "filesystem",
  /** Path validation and security errors */
  PATH_SECURITY = "path_security",
  /** Network/IO related errors */
  NETWORK = "network",
  /** Authentication/authorization errors */
  AUTHENTICATION = "authentication",
  /** Business logic errors */
  BUSINESS_LOGIC = "business_logic",
  /** System/runtime errors */
  SYSTEM = "system",
  /** Unknown/unclassified errors */
  UNKNOWN = "unknown",
}

/**
 * Standardized error codes with hierarchical classification
 * Format: [Category][Severity][Sequence]
 * - Category: 2 letters (CF=Config, VL=Validation, FS=FileSystem, etc.)
 * - Severity: 1 digit (1=Info, 2=Warning, 3=Error, 4=Critical)
 * - Sequence: 3 digits (001-999)
 */
export enum StandardErrorCode {
  // Configuration Errors (CF)
  CF_CONFIG_FILE_NOT_FOUND = "CF3001",
  CF_CONFIG_PARSE_ERROR = "CF3002",
  CF_CONFIG_VALIDATION_ERROR = "CF3003",
  CF_USER_CONFIG_INVALID = "CF2001",
  CF_CONFIG_NOT_LOADED = "CF3004",
  CF_INVALID_PROFILE_NAME = "CF3005",

  // Validation Errors (VL)
  VL_REQUIRED_FIELD_MISSING = "VL3001",
  VL_TYPE_MISMATCH = "VL3002",
  VL_CONSTRAINT_VIOLATION = "VL3003",
  VL_FORMAT_INVALID = "VL3004",

  // File System Errors (FS)
  FS_FILE_NOT_FOUND = "FS3001",
  FS_PERMISSION_DENIED = "FS3002",
  FS_DISK_FULL = "FS4001",
  FS_IO_ERROR = "FS3003",

  // Path Security Errors (PS)
  PS_PATH_TRAVERSAL = "PS4001",
  PS_ABSOLUTE_PATH_FORBIDDEN = "PS3001",
  PS_INVALID_CHARACTERS = "PS3002",
  PS_PATH_TOO_LONG = "PS3003",
  PS_EMPTY_PATH = "PS3004",

  // Network Errors (NW)
  NW_CONNECTION_FAILED = "NW3001",
  NW_TIMEOUT = "NW3002",
  NW_INVALID_URL = "NW3003",

  // Authentication Errors (AU)
  AU_UNAUTHORIZED = "AU3001",
  AU_FORBIDDEN = "AU3002",
  AU_TOKEN_EXPIRED = "AU3003",

  // Business Logic Errors (BL)
  BL_OPERATION_NOT_ALLOWED = "BL3001",
  BL_RESOURCE_CONFLICT = "BL3002",
  BL_PRECONDITION_FAILED = "BL3003",

  // System Errors (SY)
  SY_OUT_OF_MEMORY = "SY4001",
  SY_INTERNAL_ERROR = "SY4002",
  SY_DEPENDENCY_MISSING = "SY3001",

  // Unknown Errors (UN)
  UN_UNKNOWN_ERROR = "UN3001",
}

/**
 * Base error interface with common properties
 */
export interface BaseErrorInterface {
  /** Discriminator for type safety */
  readonly kind: string;
  /** Standardized error code */
  readonly code: StandardErrorCode;
  /** Error category for classification */
  readonly category: ErrorCategory;
  /** Error severity level */
  readonly severity: ErrorSeverity;
  /** Primary error message */
  readonly message: string;
  /** Timestamp when error occurred */
  readonly timestamp: Date;
  /** Optional context information */
  readonly context?: Record<string, unknown>;
  /** Optional cause chain for nested errors */
  readonly cause?: BaseErrorInterface;
  /** Stack trace for debugging */
  readonly stackTrace?: string;
  /** Correlation ID for error tracking */
  readonly correlationId?: string;
}

/**
 * Internationalization support for error messages
 */
export interface ErrorI18nConfig {
  /** Default language code */
  defaultLanguage: string;
  /** Available languages */
  supportedLanguages: string[];
  /** Message templates by language */
  messageTemplates: Record<string, Record<string, string>>;
}

/**
 * Error context builder for structured error information
 */
export interface ErrorContext {
  /** Operation being performed when error occurred */
  operation?: string;
  /** Resource identifier (file path, URL, etc.) */
  resource?: string;
  /** User identifier if applicable */
  userId?: string;
  /** Session identifier if applicable */
  sessionId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Error recovery strategy interface
 */
export interface ErrorRecoveryStrategy {
  /** Strategy name */
  name: string;
  /** Recovery function */
  recover: (error: BaseErrorInterface) => Promise<void | BaseErrorInterface>;
  /** Whether this strategy can handle the error */
  canHandle: (error: BaseErrorInterface) => boolean;
}

/**
 * Error handler interface for polymorphic error processing
 */
export interface ErrorHandler<T extends BaseErrorInterface = BaseErrorInterface> {
  /** Handle specific error type */
  handle(error: T): Promise<void | BaseErrorInterface>;
  /** Check if handler can process this error */
  canHandle(error: BaseErrorInterface): error is T;
  /** Handler priority (higher = more priority) */
  priority: number;
}

/**
 * Error factory interface for creating type-safe errors
 */
export interface ErrorFactory<T extends BaseErrorInterface> {
  /** Create error instance */
  create(params: Omit<T, "timestamp" | "correlationId">): T;
  /** Create error with context */
  createWithContext(
    params: Omit<T, "timestamp" | "correlationId">,
    context: Record<string, unknown>,
  ): T;
  /** Error type identifier */
  readonly errorType: string;
}

/**
 * Error aggregation interface for collecting multiple errors
 */
export interface ErrorAggregator {
  /** Add error to collection */
  addError(error: BaseErrorInterface): void;
  /** Get all errors */
  getErrors(): BaseErrorInterface[];
  /** Get errors by category */
  getErrorsByCategory(category: ErrorCategory): BaseErrorInterface[];
  /** Get errors by severity */
  getErrorsBySeverity(severity: ErrorSeverity): BaseErrorInterface[];
  /** Check if has errors */
  hasErrors(): boolean;
  /** Check if has critical errors */
  hasCriticalErrors(): boolean;
  /** Clear all errors */
  clear(): void;
}

/**
 * Error reporting interface for external systems
 */
export interface ErrorReporter {
  /** Report error to external system */
  report(error: BaseErrorInterface): void;
  /** Batch report multiple errors */
  reportBatch(errors: BaseErrorInterface[]): void;
  /** Configure reporting settings */
  configure(config: Record<string, unknown>): void;
}

/**
 * Error metrics interface for monitoring
 */
export interface ErrorMetrics {
  /** Record error occurrence */
  recordError(error: BaseErrorInterface): void;
  /** Get error count by category */
  getErrorCountByCategory(category: ErrorCategory): number;
  /** Get error count by severity */
  getErrorCountBySeverity(severity: ErrorSeverity): number;
  /** Get error rate per time period */
  getErrorRate(periodMs: number): number;
  /** Reset metrics */
  reset(): void;
}

/**
 * Unified error manager interface
 */
export interface UnifiedErrorManager {
  /** Register error handler */
  registerHandler<T extends BaseErrorInterface>(handler: ErrorHandler<T>): void;
  /** Register error factory */
  registerFactory<T extends BaseErrorInterface>(factory: ErrorFactory<T>): void;
  /** Process error through registered handlers */
  processError(error: BaseErrorInterface): Promise<void>;
  /** Create error using registered factories */
  createError<T extends BaseErrorInterface>(errorType: string, params: unknown): T;
  /** Get error aggregator */
  getAggregator(): ErrorAggregator;
  /** Get error reporter */
  getReporter(): ErrorReporter;
  /** Get error metrics */
  getMetrics(): ErrorMetrics;
  /** Configure internationalization */
  configureI18n(config: ErrorI18nConfig): void;
  /** Get localized error message */
  getLocalizedMessage(error: BaseErrorInterface, language?: string): string;
}

/**
 * Error transformation interface for converting between error types
 */
export interface ErrorTransformer {
  /** Transform error to different type */
  transform<From extends BaseErrorInterface, To extends BaseErrorInterface>(
    error: From,
    targetType: string,
  ): To;
  /** Check if transformation is supported */
  canTransform(fromType: string, toType: string): boolean;
}

/**
 * Error serialization interface for persistence and transmission
 */
export interface ErrorSerializer {
  /** Serialize error to JSON */
  serialize(error: BaseErrorInterface): string;
  /** Deserialize error from JSON */
  deserialize(json: string): BaseErrorInterface;
  /** Serialize error to binary format */
  serializeToBinary(error: BaseErrorInterface): Uint8Array;
  /** Deserialize error from binary format */
  deserializeFromBinary(data: Uint8Array): BaseErrorInterface;
}

/**
 * Error validation interface for ensuring error integrity
 */
export interface ErrorValidator {
  /** Validate error structure */
  validate(error: BaseErrorInterface): boolean;
  /** Get validation errors */
  getValidationErrors(error: BaseErrorInterface): string[];
  /** Check if error is well-formed */
  isWellFormed(error: BaseErrorInterface): boolean;
}

/**
 * Complete unified error interface specification
 */
export interface UnifiedErrorInterface extends BaseErrorInterface {
  /** Error aggregator for collecting related errors */
  aggregator?: ErrorAggregator;
  /** Recovery strategies for error handling */
  recoveryStrategies?: ErrorRecoveryStrategy[];
  /** Internationalization configuration */
  i18nConfig?: ErrorI18nConfig;
  /** Error transformations available */
  transformations?: string[];
  /** Serialization metadata */
  serializationMetadata?: Record<string, unknown>;
}

/**
 * Error lifecycle hooks
 */
export interface ErrorLifecycleHooks {
  /** Called before error processing */
  beforeProcess?(error: BaseErrorInterface): Promise<void>;
  /** Called after error processing */
  afterProcess?(error: BaseErrorInterface): Promise<void>;
  /** Called when error is created */
  onCreate?(error: BaseErrorInterface): Promise<void>;
  /** Called when error is handled */
  onHandle?(error: BaseErrorInterface): Promise<void>;
  /** Called when error is reported */
  onReport?(error: BaseErrorInterface): Promise<void>;
}

/**
 * Error configuration interface
 */
export interface ErrorConfiguration {
  /** Enable/disable error reporting */
  enableReporting: boolean;
  /** Enable/disable error metrics */
  enableMetrics: boolean;
  /** Enable/disable error aggregation */
  enableAggregation: boolean;
  /** Maximum error history size */
  maxErrorHistory: number;
  /** Error retention period in milliseconds */
  errorRetentionMs: number;
  /** Debug mode for detailed error information */
  debugMode: boolean;
  /** Custom error handlers */
  customHandlers?: ErrorHandler[];
  /** Lifecycle hooks */
  lifecycleHooks?: ErrorLifecycleHooks;
}
