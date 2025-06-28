/**
 * Standardized Error Code System
 *
 * Hierarchical error code classification with category-based organization
 * Format: [Category][Severity][Sequence]
 * - Category: 2 letters (CF=Config, VL=Validation, FS=FileSystem, etc.)
 * - Severity: 1 digit (1=Info, 2=Warning, 3=Error, 4=Critical)
 * - Sequence: 3 digits (001-999)
 */

import { ErrorCategory, ErrorSeverity, StandardErrorCode } from "./unified_error_interface.ts";

// Re-export for external use
export { StandardErrorCode };

/**
 * Error code metadata structure
 */
export interface ErrorCodeMetadata {
  /** Error code identifier */
  code: StandardErrorCode;
  /** Error category */
  category: ErrorCategory;
  /** Error severity level */
  severity: ErrorSeverity;
  /** Short description */
  description: string;
  /** Detailed explanation */
  details?: string;
  /** Recovery suggestions */
  recoverySuggestions?: string[];
  /** Related error codes */
  relatedCodes?: StandardErrorCode[];
  /** Documentation URL */
  documentationUrl?: string;
}

/**
 * Comprehensive error code registry with metadata
 */
export const ErrorCodeRegistry: Record<StandardErrorCode, ErrorCodeMetadata> = {
  // Configuration Errors (CF)
  [StandardErrorCode.CF_CONFIG_FILE_NOT_FOUND]: {
    code: StandardErrorCode.CF_CONFIG_FILE_NOT_FOUND,
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.ERROR,
    description: "Configuration file not found",
    details: "The required configuration file could not be located at the specified path",
    recoverySuggestions: [
      "Check if the file path is correct",
      "Verify file permissions",
      "Create the configuration file with default values",
    ],
    relatedCodes: [StandardErrorCode.FS_FILE_NOT_FOUND],
    documentationUrl: "/docs/configuration/file-not-found",
  },

  [StandardErrorCode.CF_CONFIG_PARSE_ERROR]: {
    code: StandardErrorCode.CF_CONFIG_PARSE_ERROR,
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.ERROR,
    description: "Configuration file parsing failed",
    details: "The configuration file contains invalid syntax or structure",
    recoverySuggestions: [
      "Validate YAML/JSON syntax",
      "Check for missing quotes or brackets",
      "Use a syntax validator tool",
    ],
    relatedCodes: [StandardErrorCode.VL_FORMAT_INVALID],
    documentationUrl: "/docs/configuration/syntax-errors",
  },

  [StandardErrorCode.CF_CONFIG_VALIDATION_ERROR]: {
    code: StandardErrorCode.CF_CONFIG_VALIDATION_ERROR,
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.ERROR,
    description: "Configuration validation failed",
    details: "The configuration file structure or values do not meet the required schema",
    recoverySuggestions: [
      "Check required fields are present",
      "Verify field types match expectations",
      "Review configuration schema documentation",
    ],
    relatedCodes: [StandardErrorCode.VL_REQUIRED_FIELD_MISSING, StandardErrorCode.VL_TYPE_MISMATCH],
    documentationUrl: "/docs/configuration/validation",
  },

  [StandardErrorCode.CF_USER_CONFIG_INVALID]: {
    code: StandardErrorCode.CF_USER_CONFIG_INVALID,
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.WARNING,
    description: "User configuration is invalid",
    details: "User-specific configuration has issues but application can continue with defaults",
    recoverySuggestions: [
      "Fix user configuration file",
      "Remove invalid configuration entries",
      "Reset to default configuration",
    ],
    relatedCodes: [StandardErrorCode.CF_CONFIG_PARSE_ERROR],
    documentationUrl: "/docs/configuration/user-config",
  },

  [StandardErrorCode.CF_CONFIG_NOT_LOADED]: {
    code: StandardErrorCode.CF_CONFIG_NOT_LOADED,
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.ERROR,
    description: "Configuration not loaded before use",
    details: "Attempted to access configuration values before initialization",
    recoverySuggestions: [
      "Call loadConfig() before accessing configuration",
      "Check initialization sequence",
      "Verify configuration loading in startup process",
    ],
    relatedCodes: [StandardErrorCode.BL_PRECONDITION_FAILED],
    documentationUrl: "/docs/configuration/initialization",
  },

  [StandardErrorCode.CF_INVALID_PROFILE_NAME]: {
    code: StandardErrorCode.CF_INVALID_PROFILE_NAME,
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.ERROR,
    description: "Invalid profile name",
    details: "Profile name does not match the required pattern",
    recoverySuggestions: [
      "Use alphanumeric characters and hyphens only",
      "Follow naming conventions",
      "Check examples of valid names",
    ],
    relatedCodes: [StandardErrorCode.VL_FORMAT_INVALID],
    documentationUrl: "/docs/configuration/naming-conventions",
  },

  // Validation Errors (VL)
  [StandardErrorCode.VL_REQUIRED_FIELD_MISSING]: {
    code: StandardErrorCode.VL_REQUIRED_FIELD_MISSING,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.ERROR,
    description: "Required field is missing",
    details: "A mandatory field is not present in the data structure",
    recoverySuggestions: [
      "Add the missing required field",
      "Check field name spelling",
      "Review required fields documentation",
    ],
    relatedCodes: [StandardErrorCode.CF_CONFIG_VALIDATION_ERROR],
    documentationUrl: "/docs/validation/required-fields",
  },

  [StandardErrorCode.VL_TYPE_MISMATCH]: {
    code: StandardErrorCode.VL_TYPE_MISMATCH,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.ERROR,
    description: "Type mismatch detected",
    details: "The provided value type does not match the expected type",
    recoverySuggestions: [
      "Convert value to expected type",
      "Check type specifications",
      "Validate input data format",
    ],
    relatedCodes: [StandardErrorCode.CF_CONFIG_VALIDATION_ERROR],
    documentationUrl: "/docs/validation/type-checking",
  },

  [StandardErrorCode.VL_CONSTRAINT_VIOLATION]: {
    code: StandardErrorCode.VL_CONSTRAINT_VIOLATION,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.ERROR,
    description: "Validation constraint violated",
    details: "The value does not meet the specified constraints (min/max, pattern, etc.)",
    recoverySuggestions: [
      "Adjust value to meet constraints",
      "Check constraint specifications",
      "Review allowed value ranges",
    ],
    relatedCodes: [StandardErrorCode.VL_FORMAT_INVALID],
    documentationUrl: "/docs/validation/constraints",
  },

  [StandardErrorCode.VL_FORMAT_INVALID]: {
    code: StandardErrorCode.VL_FORMAT_INVALID,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.ERROR,
    description: "Invalid format detected",
    details: "The data format does not match the expected pattern or structure",
    recoverySuggestions: [
      "Check format specifications",
      "Use format validation tools",
      "Review format examples",
    ],
    relatedCodes: [StandardErrorCode.CF_CONFIG_PARSE_ERROR],
    documentationUrl: "/docs/validation/formats",
  },

  // File System Errors (FS)
  [StandardErrorCode.FS_FILE_NOT_FOUND]: {
    code: StandardErrorCode.FS_FILE_NOT_FOUND,
    category: ErrorCategory.FILESYSTEM,
    severity: ErrorSeverity.ERROR,
    description: "File not found",
    details: "The specified file does not exist at the given path",
    recoverySuggestions: [
      "Verify file path is correct",
      "Check if file was moved or deleted",
      "Create the file if it should exist",
    ],
    relatedCodes: [StandardErrorCode.CF_CONFIG_FILE_NOT_FOUND],
    documentationUrl: "/docs/filesystem/file-not-found",
  },

  [StandardErrorCode.FS_PERMISSION_DENIED]: {
    code: StandardErrorCode.FS_PERMISSION_DENIED,
    category: ErrorCategory.FILESYSTEM,
    severity: ErrorSeverity.ERROR,
    description: "File system permission denied",
    details: "Insufficient permissions to access the file or directory",
    recoverySuggestions: [
      "Check file permissions",
      "Run with appropriate privileges",
      "Contact system administrator",
    ],
    relatedCodes: [StandardErrorCode.AU_FORBIDDEN],
    documentationUrl: "/docs/filesystem/permissions",
  },

  [StandardErrorCode.FS_DISK_FULL]: {
    code: StandardErrorCode.FS_DISK_FULL,
    category: ErrorCategory.FILESYSTEM,
    severity: ErrorSeverity.CRITICAL,
    description: "Disk space exhausted",
    details: "Insufficient disk space to complete the operation",
    recoverySuggestions: [
      "Free up disk space",
      "Move files to another location",
      "Contact system administrator",
    ],
    relatedCodes: [StandardErrorCode.SY_INTERNAL_ERROR],
    documentationUrl: "/docs/filesystem/disk-space",
  },

  [StandardErrorCode.FS_IO_ERROR]: {
    code: StandardErrorCode.FS_IO_ERROR,
    category: ErrorCategory.FILESYSTEM,
    severity: ErrorSeverity.ERROR,
    description: "File system I/O error",
    details: "General input/output error during file system operation",
    recoverySuggestions: [
      "Retry the operation",
      "Check disk health",
      "Verify network connectivity for remote files",
    ],
    relatedCodes: [StandardErrorCode.NW_CONNECTION_FAILED],
    documentationUrl: "/docs/filesystem/io-errors",
  },

  // Path Security Errors (PS)
  [StandardErrorCode.PS_PATH_TRAVERSAL]: {
    code: StandardErrorCode.PS_PATH_TRAVERSAL,
    category: ErrorCategory.PATH_SECURITY,
    severity: ErrorSeverity.CRITICAL,
    description: "Path traversal attack detected",
    details: "The path contains directory traversal sequences that could access unauthorized files",
    recoverySuggestions: [
      "Remove path traversal sequences (../, etc.)",
      "Use relative paths only",
      "Implement path sanitization",
    ],
    relatedCodes: [StandardErrorCode.AU_FORBIDDEN],
    documentationUrl: "/docs/security/path-traversal",
  },

  [StandardErrorCode.PS_ABSOLUTE_PATH_FORBIDDEN]: {
    code: StandardErrorCode.PS_ABSOLUTE_PATH_FORBIDDEN,
    category: ErrorCategory.PATH_SECURITY,
    severity: ErrorSeverity.ERROR,
    description: "Absolute path not allowed",
    details: "Absolute paths are forbidden in this context for security reasons",
    recoverySuggestions: [
      "Use relative paths instead",
      "Check path configuration policies",
      "Review security requirements",
    ],
    relatedCodes: [StandardErrorCode.PS_PATH_TRAVERSAL],
    documentationUrl: "/docs/security/path-restrictions",
  },

  [StandardErrorCode.PS_INVALID_CHARACTERS]: {
    code: StandardErrorCode.PS_INVALID_CHARACTERS,
    category: ErrorCategory.PATH_SECURITY,
    severity: ErrorSeverity.ERROR,
    description: "Invalid characters in path",
    details: "The path contains characters that are not allowed",
    recoverySuggestions: [
      "Remove or replace invalid characters",
      "Use only alphanumeric characters and standard separators",
      "Check character encoding",
    ],
    relatedCodes: [StandardErrorCode.VL_FORMAT_INVALID],
    documentationUrl: "/docs/security/path-characters",
  },

  [StandardErrorCode.PS_PATH_TOO_LONG]: {
    code: StandardErrorCode.PS_PATH_TOO_LONG,
    category: ErrorCategory.PATH_SECURITY,
    severity: ErrorSeverity.ERROR,
    description: "Path length exceeds maximum allowed",
    details: "The file path is longer than the system or application limit",
    recoverySuggestions: [
      "Shorten the path",
      "Use shorter directory or file names",
      "Move files to a location with shorter path",
    ],
    relatedCodes: [StandardErrorCode.VL_CONSTRAINT_VIOLATION],
    documentationUrl: "/docs/security/path-length",
  },

  [StandardErrorCode.PS_EMPTY_PATH]: {
    code: StandardErrorCode.PS_EMPTY_PATH,
    category: ErrorCategory.PATH_SECURITY,
    severity: ErrorSeverity.ERROR,
    description: "Empty path not allowed",
    details: "Path cannot be empty or contain only whitespace",
    recoverySuggestions: [
      "Provide a valid path",
      "Check path input validation",
      "Use default path if appropriate",
    ],
    relatedCodes: [StandardErrorCode.VL_REQUIRED_FIELD_MISSING],
    documentationUrl: "/docs/security/path-validation",
  },

  // Network Errors (NW)
  [StandardErrorCode.NW_CONNECTION_FAILED]: {
    code: StandardErrorCode.NW_CONNECTION_FAILED,
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.ERROR,
    description: "Network connection failed",
    details: "Unable to establish connection to the remote server",
    recoverySuggestions: [
      "Check network connectivity",
      "Verify server address",
      "Check firewall settings",
    ],
    relatedCodes: [StandardErrorCode.NW_TIMEOUT],
    documentationUrl: "/docs/network/connection-issues",
  },

  [StandardErrorCode.NW_TIMEOUT]: {
    code: StandardErrorCode.NW_TIMEOUT,
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.ERROR,
    description: "Network operation timeout",
    details: "The network operation did not complete within the specified time limit",
    recoverySuggestions: [
      "Increase timeout value",
      "Check network speed",
      "Retry the operation",
    ],
    relatedCodes: [StandardErrorCode.NW_CONNECTION_FAILED],
    documentationUrl: "/docs/network/timeouts",
  },

  [StandardErrorCode.NW_INVALID_URL]: {
    code: StandardErrorCode.NW_INVALID_URL,
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.ERROR,
    description: "Invalid URL format",
    details: "The provided URL does not conform to valid URL syntax",
    recoverySuggestions: [
      "Check URL format",
      "Ensure protocol is specified (http/https)",
      "Validate URL syntax",
    ],
    relatedCodes: [StandardErrorCode.VL_FORMAT_INVALID],
    documentationUrl: "/docs/network/url-format",
  },

  // Authentication Errors (AU)
  [StandardErrorCode.AU_UNAUTHORIZED]: {
    code: StandardErrorCode.AU_UNAUTHORIZED,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.ERROR,
    description: "Authentication required",
    details: "The operation requires authentication but no valid credentials were provided",
    recoverySuggestions: [
      "Provide valid credentials",
      "Check authentication configuration",
      "Verify user account status",
    ],
    relatedCodes: [StandardErrorCode.AU_TOKEN_EXPIRED],
    documentationUrl: "/docs/authentication/unauthorized",
  },

  [StandardErrorCode.AU_FORBIDDEN]: {
    code: StandardErrorCode.AU_FORBIDDEN,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.ERROR,
    description: "Access forbidden",
    details: "The authenticated user does not have permission to perform this operation",
    recoverySuggestions: [
      "Check user permissions",
      "Contact administrator for access",
      "Verify role assignments",
    ],
    relatedCodes: [StandardErrorCode.FS_PERMISSION_DENIED],
    documentationUrl: "/docs/authentication/forbidden",
  },

  [StandardErrorCode.AU_TOKEN_EXPIRED]: {
    code: StandardErrorCode.AU_TOKEN_EXPIRED,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.ERROR,
    description: "Authentication token expired",
    details: "The authentication token has expired and needs to be renewed",
    recoverySuggestions: [
      "Refresh authentication token",
      "Re-authenticate",
      "Check token expiration settings",
    ],
    relatedCodes: [StandardErrorCode.AU_UNAUTHORIZED],
    documentationUrl: "/docs/authentication/token-expiry",
  },

  // Business Logic Errors (BL)
  [StandardErrorCode.BL_OPERATION_NOT_ALLOWED]: {
    code: StandardErrorCode.BL_OPERATION_NOT_ALLOWED,
    category: ErrorCategory.BUSINESS_LOGIC,
    severity: ErrorSeverity.ERROR,
    description: "Operation not allowed",
    details: "The requested operation is not permitted in the current context or state",
    recoverySuggestions: [
      "Check operation prerequisites",
      "Verify current system state",
      "Review business rules",
    ],
    relatedCodes: [StandardErrorCode.BL_PRECONDITION_FAILED],
    documentationUrl: "/docs/business-logic/operations",
  },

  [StandardErrorCode.BL_RESOURCE_CONFLICT]: {
    code: StandardErrorCode.BL_RESOURCE_CONFLICT,
    category: ErrorCategory.BUSINESS_LOGIC,
    severity: ErrorSeverity.ERROR,
    description: "Resource conflict detected",
    details: "The operation conflicts with the current state of the resource",
    recoverySuggestions: [
      "Refresh resource state",
      "Resolve conflicts manually",
      "Retry with updated data",
    ],
    relatedCodes: [StandardErrorCode.BL_PRECONDITION_FAILED],
    documentationUrl: "/docs/business-logic/conflicts",
  },

  [StandardErrorCode.BL_PRECONDITION_FAILED]: {
    code: StandardErrorCode.BL_PRECONDITION_FAILED,
    category: ErrorCategory.BUSINESS_LOGIC,
    severity: ErrorSeverity.ERROR,
    description: "Precondition not met",
    details: "The required preconditions for the operation are not satisfied",
    recoverySuggestions: [
      "Ensure preconditions are met",
      "Check operation sequence",
      "Verify system state",
    ],
    relatedCodes: [StandardErrorCode.CF_CONFIG_NOT_LOADED],
    documentationUrl: "/docs/business-logic/preconditions",
  },

  // System Errors (SY)
  [StandardErrorCode.SY_OUT_OF_MEMORY]: {
    code: StandardErrorCode.SY_OUT_OF_MEMORY,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.CRITICAL,
    description: "Out of memory",
    details: "The system has run out of available memory",
    recoverySuggestions: [
      "Increase available memory",
      "Optimize memory usage",
      "Restart the application",
    ],
    relatedCodes: [StandardErrorCode.SY_INTERNAL_ERROR],
    documentationUrl: "/docs/system/memory-issues",
  },

  [StandardErrorCode.SY_INTERNAL_ERROR]: {
    code: StandardErrorCode.SY_INTERNAL_ERROR,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.CRITICAL,
    description: "Internal system error",
    details: "An unexpected internal error occurred in the system",
    recoverySuggestions: [
      "Check system logs",
      "Restart the application",
      "Contact technical support",
    ],
    relatedCodes: [StandardErrorCode.UN_UNKNOWN_ERROR],
    documentationUrl: "/docs/system/internal-errors",
  },

  [StandardErrorCode.SY_DEPENDENCY_MISSING]: {
    code: StandardErrorCode.SY_DEPENDENCY_MISSING,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.ERROR,
    description: "Required dependency missing",
    details: "A required system dependency or component is not available",
    recoverySuggestions: [
      "Install missing dependencies",
      "Check system requirements",
      "Verify installation completeness",
    ],
    relatedCodes: [StandardErrorCode.SY_INTERNAL_ERROR],
    documentationUrl: "/docs/system/dependencies",
  },

  // Unknown Errors (UN)
  [StandardErrorCode.UN_UNKNOWN_ERROR]: {
    code: StandardErrorCode.UN_UNKNOWN_ERROR,
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.ERROR,
    description: "Unknown error occurred",
    details: "An error occurred that could not be classified or identified",
    recoverySuggestions: [
      "Check logs for more details",
      "Retry the operation",
      "Report the error with context",
    ],
    relatedCodes: [StandardErrorCode.SY_INTERNAL_ERROR],
    documentationUrl: "/docs/troubleshooting/unknown-errors",
  },
};

/**
 * Utility functions for error code operations
 */
export class ErrorCodeUtils {
  /**
   * Get error metadata by code
   */
  static getMetadata(code: StandardErrorCode): ErrorCodeMetadata | undefined {
    return ErrorCodeRegistry[code];
  }

  /**
   * Get errors by category
   */
  static getErrorsByCategory(category: ErrorCategory): ErrorCodeMetadata[] {
    return Object.values(ErrorCodeRegistry).filter((meta) => meta.category === category);
  }

  /**
   * Get errors by severity
   */
  static getErrorsBySeverity(severity: ErrorSeverity): ErrorCodeMetadata[] {
    return Object.values(ErrorCodeRegistry).filter((meta) => meta.severity === severity);
  }

  /**
   * Check if error code exists
   */
  static isValidCode(code: string): code is StandardErrorCode {
    return code in ErrorCodeRegistry;
  }

  /**
   * Parse error code components
   */
  static parseErrorCode(code: StandardErrorCode): {
    category: string;
    severity: number;
    sequence: number;
  } | null {
    const match = code.match(/^([A-Z]{2})(\d)(\d{3})$/);
    if (!match) return null;

    return {
      category: match[1],
      severity: parseInt(match[2]),
      sequence: parseInt(match[3]),
    };
  }

  /**
   * Get recovery suggestions for error code
   */
  static getRecoverySuggestions(code: StandardErrorCode): string[] {
    const metadata = this.getMetadata(code);
    return metadata?.recoverySuggestions || [];
  }

  /**
   * Get related error codes
   */
  static getRelatedCodes(code: StandardErrorCode): StandardErrorCode[] {
    const metadata = this.getMetadata(code);
    return metadata?.relatedCodes || [];
  }

  /**
   * Generate error report
   */
  static generateErrorReport(code: StandardErrorCode): string {
    const metadata = this.getMetadata(code);
    if (!metadata) return `Unknown error code: ${code}`;

    const report = [
      `Error Code: ${code}`,
      `Category: ${metadata.category}`,
      `Severity: ${metadata.severity}`,
      `Description: ${metadata.description}`,
    ];

    if (metadata.details) {
      report.push(`Details: ${metadata.details}`);
    }

    if (metadata.recoverySuggestions?.length) {
      report.push(`Recovery Suggestions:`);
      metadata.recoverySuggestions.forEach((suggestion, index) => {
        report.push(`  ${index + 1}. ${suggestion}`);
      });
    }

    if (metadata.relatedCodes?.length) {
      report.push(`Related Codes: ${metadata.relatedCodes.join(", ")}`);
    }

    if (metadata.documentationUrl) {
      report.push(`Documentation: ${metadata.documentationUrl}`);
    }

    return report.join("\n");
  }
}
