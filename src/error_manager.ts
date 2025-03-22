export enum ErrorCode {
  // 設定ファイル関連 (1000番台)
  APP_CONFIG_NOT_FOUND = "ERR1001",
  APP_CONFIG_INVALID = "ERR1002",
  USER_CONFIG_INVALID = "ERR1003",
  
  // 必須項目関連 (2000番台)
  REQUIRED_FIELD_MISSING = "ERR2001",
  INVALID_FIELD_TYPE = "ERR2002",
  
  // パス検証関連 (3000番台)
  INVALID_PATH_FORMAT = "ERR3001",
  PATH_TRAVERSAL_DETECTED = "ERR3002",
  ABSOLUTE_PATH_NOT_ALLOWED = "ERR3003",
  
  // その他 (9000番台)
  UNKNOWN_ERROR = "ERR9999"
}

export class ErrorManager {
  private static errorMessages: Map<ErrorCode, string> = new Map([
    [ErrorCode.APP_CONFIG_NOT_FOUND, "Application configuration file not found"],
    [ErrorCode.APP_CONFIG_INVALID, "Invalid application configuration"],
    [ErrorCode.USER_CONFIG_INVALID, "Invalid user configuration"],
    [ErrorCode.REQUIRED_FIELD_MISSING, "Required field is missing"],
    [ErrorCode.INVALID_FIELD_TYPE, "Invalid field type"],
    [ErrorCode.INVALID_PATH_FORMAT, "Invalid path format"],
    [ErrorCode.PATH_TRAVERSAL_DETECTED, "Path traversal detected"],
    [ErrorCode.ABSOLUTE_PATH_NOT_ALLOWED, "Absolute path is not allowed"],
    [ErrorCode.UNKNOWN_ERROR, "Unknown error occurred"]
  ]);

  static throwError(code: ErrorCode, details?: string): never {
    const message = this.errorMessages.get(code) || "Unknown error";
    throw new Error(`${code}: ${message}${details ? ` - ${details}` : ""}`);
  }

  static logWarning(code: ErrorCode, details?: string): void {
    const message = this.errorMessages.get(code) || "Unknown warning";
    console.warn(`Warning - ${code}: ${message}${details ? ` - ${details}` : ""}`);
  }
} 