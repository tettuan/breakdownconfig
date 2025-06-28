/**
 * Error codes used throughout the application
 * Organized by category with specific error codes for each type of error
 * @enum {string}
 */
export enum ErrorCode {
  // 設定ファイル関連 (1000番台)
  /** Application configuration file not found */
  APP_CONFIG_NOT_FOUND = "ERR1001",
  /** Invalid application configuration format or content */
  APP_CONFIG_INVALID = "ERR1002",
  /** User configuration file not found */
  USER_CONFIG_NOT_FOUND = "ERR1003",
  /** Invalid user configuration format or content */
  USER_CONFIG_INVALID = "ERR1004",
  /** Configuration not loaded before attempting to access */
  CONFIG_NOT_LOADED = "ERR1010",

  // 必須項目関連 (2000番台)
  /** Required field is missing in configuration */
  REQUIRED_FIELD_MISSING = "ERR1005",
  /** Field type does not match expected type */
  INVALID_FIELD_TYPE = "ERR1006",

  // パス検証関連 (3000番台)
  /** Path format is invalid */
  INVALID_PATH_FORMAT = "ERR1007",
  /** Path traversal attempt detected */
  PATH_TRAVERSAL_DETECTED = "ERR1008",
  /** Absolute path is not allowed */
  ABSOLUTE_PATH_NOT_ALLOWED = "ERR1009",

  // プロファイル関連 (4000番台)
  /** Invalid profile name */
  INVALID_PROFILE_NAME = "ERR4001",

  // その他 (9000番台)
  /** Unknown or unexpected error occurred */
  UNKNOWN_ERROR = "ERR9999",
}

/**
 * Central error management class for handling application errors
 *
 * This class provides standardized error handling with error codes,
 * consistent messaging, and centralized error reporting.
 *
 * @example
 * ```typescript
 * ErrorManager.throwError(ErrorCode.APP_CONFIG_NOT_FOUND, "Config file missing");
 * ErrorManager.logWarning(ErrorCode.USER_CONFIG_INVALID, "Optional config invalid");
 * ```
 */
export class ErrorManager {
  private static errorMessages: Map<ErrorCode, string> = new Map([
    [ErrorCode.APP_CONFIG_NOT_FOUND, "Application configuration file not found"],
    [ErrorCode.APP_CONFIG_INVALID, "Invalid application configuration"],
    [ErrorCode.USER_CONFIG_NOT_FOUND, "User configuration file not found"],
    [ErrorCode.USER_CONFIG_INVALID, "Invalid user configuration"],
    [ErrorCode.CONFIG_NOT_LOADED, "Configuration not loaded"],
    [ErrorCode.REQUIRED_FIELD_MISSING, "Required field is missing"],
    [ErrorCode.INVALID_FIELD_TYPE, "Invalid field type"],
    [ErrorCode.INVALID_PATH_FORMAT, "Invalid path format"],
    [ErrorCode.PATH_TRAVERSAL_DETECTED, "Path traversal detected"],
    [ErrorCode.ABSOLUTE_PATH_NOT_ALLOWED, "Absolute path is not allowed"],
    [ErrorCode.INVALID_PROFILE_NAME, "Invalid profile name"],
    [ErrorCode.UNKNOWN_ERROR, "Unknown error occurred"],
  ]);

  /**
   * Throws an error with a standardized format including error code
   *
   * @param code - Specific error code from ErrorCode enum for categorization
   * @param message - Descriptive error message for the specific situation
   * @throws {Error} Always throws an Error with formatted message including error code
   *
   * @example
   * ```typescript
   * ErrorManager.throwError(
   *   ErrorCode.APP_CONFIG_NOT_FOUND,
   *   "Configuration file 'app.yaml' not found in specified directory"
   * );
   * ```
   */
  static throwError(code: ErrorCode, message: string): never {
    throw new Error(`${code}: ${message}`);
  }

  /**
   * Logs a warning message with standardized formatting
   *
   * @param code - Warning code from ErrorCode enum
   * @param details - Optional additional details about the warning
   *
   * @example
   * ```typescript
   * ErrorManager.logWarning(
   *   ErrorCode.USER_CONFIG_INVALID,
   *   "Using default values instead"
   * );
   * ```
   */
  static logWarning(code: ErrorCode, _details?: string): void {
    const _message = this.errorMessages.get(code) || "Unknown warning";
    // Warning logging removed as per project requirements
  }
}
