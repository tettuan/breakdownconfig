# BreakdownConfig API Reference

## Overview

BreakdownConfig adopts type-safe Result types and provides error handling based on Total Function design.

## Core Types

### Result<T, E>

All APIs return Result type, explicitly expressing success and failure.

```typescript
type Result<T, E = UnifiedError> = Success<T> | Failure<E>;

type Success<T> = {
  readonly success: true;
  readonly data: T;
};

type Failure<E> = {
  readonly success: false;
  readonly error: E;
};
```

### UnifiedError

Unified error type enables type-safe error handling.

```typescript
type UnifiedError =
  | ConfigFileNotFoundError
  | ConfigParseError
  | ConfigValidationError
  | PathValidationError
  | UnknownError;
// ... other error types
```

## Main APIs

### ConfigManager

Main class for loading and managing configurations.

#### Constructor

```typescript
constructor(
  appConfigLoader: AppConfigLoader,
  userConfigLoader: UserConfigLoader
)
```

#### Methods

##### getConfig()

Loads and merges configurations, returning the result.

```typescript
async getConfig(): Promise<Result<MergedConfig, UnifiedError>>
```

**Usage example:**

```typescript
const configManager = new ConfigManager(appLoader, userLoader);
const result = await configManager.getConfig();

if (Result.isOk(result)) {
  const config = result.data;
  console.log("Working directory:", config.working_dir);
} else {
  const error = result.error;
  errorManager.logError(error);
}
```

### BreakdownConfig (Static API)

Provides convenient access through static methods.

#### loadConfig()

Loads configuration using default loaders.

```typescript
static async loadConfig(): Promise<Result<MergedConfig, UnifiedError>>
```

**Usage example:**

```typescript
const result = await BreakdownConfig.loadConfig();

Result.map(result, (config) => {
  console.log("Loaded config:", config);
  return config;
});
```

### Error Handling

#### errorManager

Provides integrated error management system.

```typescript
// Get error message (internationalization support)
errorManager.getUserMessage(error: UnifiedError, language?: SupportedLanguage): string

// Get debug information
errorManager.getDebugMessage(error: UnifiedError): string

// Output error log
errorManager.logError(error: UnifiedError, severity?: ErrorSeverity): void
```

**Usage example:**

```typescript
// Get error message in Japanese
errorManager.setLanguage("ja");
const message = errorManager.getUserMessage(error);

// Get error details
const details = errorManager.getErrorDetails(error);
console.log("Title:", details.userFacing.title);
console.log("Suggestion:", details.userFacing.suggestion);
```

## Loader APIs

### AppConfigLoader

Loader for application configuration.

```typescript
class AppConfigLoader extends SafeConfigLoader<AppConfig> {
  async loadSafe(): Promise<Result<AppConfig, ConfigError>>;
}
```

### UserConfigLoader

Loader for user configuration.

```typescript
class UserConfigLoader extends SafeConfigLoader<UserConfig> {
  async loadSafe(): Promise<Result<UserConfig | null, ConfigError>>;
}
```

## Utility Functions

### Result Helper Functions

Helper functions for manipulating Result types.

```typescript
// Create success result
Result.ok<T>(data: T): Success<T>

// Create failure result
Result.err<E>(error: E): Failure<E>

// Type guards
Result.isOk<T, E>(result: Result<T, E>): result is Success<T>
Result.isErr<T, E>(result: Result<T, E>): result is Failure<E>

// Mapping
Result.map<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E>
Result.mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F>

// Chain operations
Result.flatMap<T, U, E>(result: Result<T, E>, fn: (data: T) => Result<U, E>): Result<U, E>

// Default values
Result.unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T

// Combine multiple Results
Result.all<T, E>(results: Result<T, E>[]): Result<T[], E>
```

### Error Factory Functions

Type-safe error generation functions.

```typescript
// ConfigManager-specific errors
ConfigManagerErrors.configFileNotFound(path: string, configType: "app" | "user"): UnifiedError
ConfigManagerErrors.configParseError(path: string, syntaxError: string): UnifiedError
ConfigManagerErrors.configValidationError(path: string, fieldErrors: ValidationError[]): UnifiedError
ConfigManagerErrors.pathValidationError(path: string, reason: PathErrorReason): UnifiedError
```

## Type Definitions

### MergedConfig

Type definition for merged configuration.

```typescript
interface MergedConfig {
  working_dir: string;
  app_prompt: {
    base_dir: string;
    [key: string]: unknown;
  };
  app_schema: {
    base_dir: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
```

### ConfigError Types

Detailed type definitions for various errors.

```typescript
interface ConfigFileNotFoundError {
  readonly kind: "CONFIG_FILE_NOT_FOUND";
  readonly path: string;
  readonly configType: "app" | "user";
  readonly searchedLocations?: string[];
  readonly message: string;
  readonly timestamp: Date;
}

interface ConfigParseError {
  readonly kind: "CONFIG_PARSE_ERROR";
  readonly path: string;
  readonly line?: number;
  readonly column?: number;
  readonly syntaxError: string;
  readonly message: string;
  readonly timestamp: Date;
}

interface ConfigValidationError {
  readonly kind: "CONFIG_VALIDATION_ERROR";
  readonly path: string;
  readonly violations: ValidationViolation[];
  readonly message: string;
  readonly timestamp: Date;
}
```

## Migration from Legacy API

### From Throwing Functions to Result Type

```typescript
// Legacy (throw-based)
try {
  const config = await configManager.loadConfig();
  console.log(config.working_dir);
} catch (error) {
  console.error("Error:", error.message);
}

// New (Result-based)
const result = await configManager.getConfig();
if (Result.isOk(result)) {
  console.log(result.data.working_dir);
} else {
  errorManager.logError(result.error);
}
```

### From ErrorManager to UnifiedErrorManager

```typescript
// Legacy
import { ErrorCode, ErrorManager } from "./error_manager.ts";
ErrorManager.throwError(ErrorCode.APP_CONFIG_NOT_FOUND, "Not found");

// New
import { ConfigManagerErrors, errorManager } from "./errors/mod.ts";
const error = ConfigManagerErrors.configFileNotFound(path, "app");
return Result.err(error);
```

## Best Practices

1. **Always handle both success and error cases**
   ```typescript
   const result = await loadConfig();
   if (Result.isOk(result)) {
     // Handle success
   } else {
     // Handle error explicitly
   }
   ```

2. **Use type guards for specific error handling**
   ```typescript
   if (ErrorGuards.isConfigFileNotFound(error)) {
     // Handle file not found specifically
   }
   ```

3. **Leverage Result helper functions**
   ```typescript
   // Chain operations safely
   const workingDir = Result.map(result, (config) => config.working_dir);

   // Provide defaults
   const config = Result.unwrapOr(result, defaultConfig);
   ```

4. **Set appropriate language for error messages**
   ```typescript
   errorManager.setLanguage("ja"); // Japanese
   const userMessage = errorManager.getUserMessage(error);
   ```