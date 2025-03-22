export enum ErrorCode {
  // 設定ファイル関連 (1000番台)
  APP_CONFIG_NOT_FOUND = "ERR1001",
  APP_CONFIG_INVALID = "ERR1002",
  USER_CONFIG_NOT_FOUND = "ERR1003",
  USER_CONFIG_INVALID = "ERR1004",
  CONFIG_NOT_LOADED = "ERR1010",

  // 必須項目関連 (2000番台)
  REQUIRED_FIELD_MISSING = "ERR1005",
  INVALID_FIELD_TYPE = "ERR1006",

  // パス検証関連 (3000番台)
  INVALID_PATH_FORMAT = "ERR1007",
  PATH_TRAVERSAL_DETECTED = "ERR1008",
  ABSOLUTE_PATH_NOT_ALLOWED = "ERR1009",

  // その他 (9000番台)
  UNKNOWN_ERROR = "ERR9999",
}

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
    [ErrorCode.UNKNOWN_ERROR, "Unknown error occurred"],
  ]);

  /**
   * Throws an error with a standardized format
   * @param code - Error code from ErrorCode enum
   * @param message - Main error message
   * @param details - Optional details about the error
   */
  static throwError(code: ErrorCode, message: string): never {
    throw new Error(`${code}: ${message}`);
  }

  static logWarning(code: ErrorCode, details?: string): void {
    const message = this.errorMessages.get(code) || "Unknown warning";
    console.warn(`Warning - ${code}: ${message}${details ? ` - ${details}` : ""}`);
  }
}
