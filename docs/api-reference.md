# BreakdownConfig API Reference

## Overview

BreakdownConfig は型安全なResult型を採用し、Total Function設計に基づいたエラーハンドリングを提供します。

## Core Types

### Result<T, E>

すべてのAPIはResult型を返し、成功と失敗を明示的に表現します。

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

統一されたエラー型により、型安全なエラーハンドリングが可能です。

```typescript
type UnifiedError =
  | ConfigFileNotFoundError
  | ConfigParseError
  | ConfigValidationError
  | PathValidationError
  | UnknownError;
// ... その他のエラー型
```

## Main APIs

### ConfigManager

設定の読み込みと管理を行うメインクラスです。

#### Constructor

```typescript
constructor(
  appConfigLoader: AppConfigLoader,
  userConfigLoader: UserConfigLoader
)
```

#### Methods

##### getConfig()

設定を読み込み、マージした結果を返します。

```typescript
async getConfig(): Promise<Result<MergedConfig, UnifiedError>>
```

**使用例:**

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

静的メソッドによる簡便なアクセスを提供します。

#### loadConfig()

デフォルトローダーを使用して設定を読み込みます。

```typescript
static async loadConfig(): Promise<Result<MergedConfig, UnifiedError>>
```

**使用例:**

```typescript
const result = await BreakdownConfig.loadConfig();

Result.map(result, (config) => {
  console.log("Loaded config:", config);
  return config;
});
```

### Error Handling

#### errorManager

統合エラー管理システムを提供します。

```typescript
// エラーメッセージの取得（国際化対応）
errorManager.getUserMessage(error: UnifiedError, language?: SupportedLanguage): string

// デバッグ情報の取得
errorManager.getDebugMessage(error: UnifiedError): string

// エラーログ出力
errorManager.logError(error: UnifiedError, severity?: ErrorSeverity): void
```

**使用例:**

```typescript
// 日本語でエラーメッセージを取得
errorManager.setLanguage("ja");
const message = errorManager.getUserMessage(error);

// エラー詳細情報を取得
const details = errorManager.getErrorDetails(error);
console.log("Title:", details.userFacing.title);
console.log("Suggestion:", details.userFacing.suggestion);
```

## Loader APIs

### AppConfigLoader

アプリケーション設定を読み込むローダーです。

```typescript
class AppConfigLoader extends SafeConfigLoader<AppConfig> {
  async loadSafe(): Promise<Result<AppConfig, ConfigError>>;
}
```

### UserConfigLoader

ユーザー設定を読み込むローダーです。

```typescript
class UserConfigLoader extends SafeConfigLoader<UserConfig> {
  async loadSafe(): Promise<Result<UserConfig | null, ConfigError>>;
}
```

## Utility Functions

### Result Helper Functions

Result型を操作するためのヘルパー関数群です。

```typescript
// 成功結果の作成
Result.ok<T>(data: T): Success<T>

// 失敗結果の作成
Result.err<E>(error: E): Failure<E>

// 型ガード
Result.isOk<T, E>(result: Result<T, E>): result is Success<T>
Result.isErr<T, E>(result: Result<T, E>): result is Failure<E>

// マッピング
Result.map<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E>
Result.mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F>

// チェイン操作
Result.flatMap<T, U, E>(result: Result<T, E>, fn: (data: T) => Result<U, E>): Result<U, E>

// デフォルト値
Result.unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T

// 複数Result統合
Result.all<T, E>(results: Result<T, E>[]): Result<T[], E>
```

### Error Factory Functions

型安全なエラー生成関数です。

```typescript
// ConfigManager専用エラー
ConfigManagerErrors.configFileNotFound(path: string, configType: "app" | "user"): UnifiedError
ConfigManagerErrors.configParseError(path: string, syntaxError: string): UnifiedError
ConfigManagerErrors.configValidationError(path: string, fieldErrors: ValidationError[]): UnifiedError
ConfigManagerErrors.pathValidationError(path: string, reason: PathErrorReason): UnifiedError
```

## Type Definitions

### MergedConfig

マージされた設定の型定義です。

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

各種エラーの詳細型定義です。

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
   errorManager.setLanguage("ja"); // 日本語
   const userMessage = errorManager.getUserMessage(error);
   ```
