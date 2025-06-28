# BreakdownConfig Error Specification (Compact Version)

## Overview
Type-safe error design based on totality principles. Eliminates runtime exceptions through Discriminated Union + Result types.

## Error Type Definitions

```typescript
// Unified Error Types (11 total)
type UnifiedError = 
  | ConfigFileNotFoundError     // ERR1001/1003: File not found
  | ConfigParseError           // ERR1002: Parse failure
  | ConfigValidationError      // ERR1002: Validation failure  
  | UserConfigInvalidError     // ERR1004: Invalid user config
  | PathValidationError        // ERR1007-1009: Path validation failure
  | ConfigNotLoadedError       // ERR1010: Not initialized
  | InvalidProfileNameError    // ERR4001: Invalid profile name
  | RequiredFieldMissingError  // ERR1005: Required field missing
  | TypeMismatchError         // ERR1006: Type mismatch
  | FileSystemError           // System error
  | UnknownError              // ERR9999: Unknown error

// Common fields: kind, message, timestamp
interface BaseError {
  kind: string
  message: string
  timestamp: Date
}

// Path-related
type PathErrorReason = "PATH_TRAVERSAL" | "ABSOLUTE_PATH_NOT_ALLOWED" | "INVALID_CHARACTERS" | "PATH_TOO_LONG" | "EMPTY_PATH"

// Validation violations
interface ValidationViolation {
  field: string
  value: unknown
  expectedType: string
  actualType: string
  constraint?: string
}
```

## Error Factories

```typescript
export const ErrorFactories = {
  configFileNotFound: (path: string, configType: "app" | "user") => ({
    kind: "CONFIG_FILE_NOT_FOUND", path, configType,
    message: `${configType === "app" ? "ERR1001" : "ERR1003"}: Config not found: ${path}`,
    timestamp: new Date()
  }),
  configParseError: (path: string, syntaxError: string) => ({
    kind: "CONFIG_PARSE_ERROR", path, syntaxError,
    message: `ERR1002: Parse failed ${path}: ${syntaxError}`,
    timestamp: new Date()
  }),
  pathValidationError: (path: string, reason: PathErrorReason, field: string) => ({
    kind: "PATH_VALIDATION_ERROR", path, reason, affectedField: field,
    message: `Path validation failed '${field}': ${reason}`,
    timestamp: new Date()
  })
  // ...other factories
}

export const ErrorGuards = {
  isConfigFileNotFound: (e: UnifiedError): e is ConfigFileNotFoundError => e.kind === "CONFIG_FILE_NOT_FOUND",
  isConfigParseError: (e: UnifiedError): e is ConfigParseError => e.kind === "CONFIG_PARSE_ERROR",
  isPathValidationError: (e: UnifiedError): e is PathValidationError => e.kind === "PATH_VALIDATION_ERROR"
  // ...other guards
} as const
```

## Processing Patterns

### Result Type
```typescript
type Result<T, E> = { ok: true; data: T } | { ok: false; error: E }

const result: Result<Config, UnifiedError> = await loadConfig()
if (!result.ok) {
  // Total function with exhaustive handling (no default)
  switch (result.error.kind) {
    case "CONFIG_FILE_NOT_FOUND": /* handle */ break
    case "CONFIG_PARSE_ERROR": /* handle */ break
    // All 11 cases covered
  }
}
```

## Error Code Mapping Table

| Legacy | Standard Code | Severity | Description |
|--------|---------------|----------|-------------|
| ERR1001 | CF_CONFIG_FILE_NOT_FOUND | ERROR | App config not found |
| ERR1002 | CF_CONFIG_PARSE_ERROR | ERROR | Config parse failure |
| ERR1003 | CF_CONFIG_FILE_NOT_FOUND | WARN | User config not found |
| ERR1004 | CF_USER_CONFIG_INVALID | WARN | User config invalid |
| ERR1005 | VL_REQUIRED_FIELD_MISSING | ERROR | Required field missing |
| ERR1006 | VL_TYPE_MISMATCH | ERROR | Type mismatch |
| ERR1007-1009 | PS_PATH_VALIDATION | ERROR | Path validation failure |
| ERR1010 | CF_CONFIG_NOT_LOADED | ERROR | Not initialized |
| ERR4001 | CF_INVALID_PROFILE_NAME | ERROR | Invalid profile name |
| ERR9999 | UN_UNKNOWN_ERROR | CRITICAL | Unknown error |

## Recovery Strategies
- **Automatic**: User config→default values, path normalization
- **Manual**: File creation request, show correction points

## Design Principles
✅ Discriminated Union (exhaustive types)  
✅ Result type (eliminate exception control flow)  
✅ Smart Constructor (prevent invalid states)  
✅ Switch without default (exhaustive coverage)  
✅ Zero type assertions