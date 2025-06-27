# 統合エラー管理システム移行ガイド

## 概要

このガイドでは、ConfigError・ErrorCodeの二重管理からUnifiedError統合システムへの移行について説明します。

## 二重管理問題の解決

### 問題

- **UnifiedError** と **ConfigError** の重複定義
- **ErrorManager** (throw-based) と **Result** (functional) の混在
- **I18nErrorManager** と **UnifiedErrorI18n** の重複実装
- メッセージファイルの分散

### 解決策

- **統合エラー管理クラス** `UnifiedErrorManager` の実装
- **ConfigManager専用エラー** `ConfigManagerErrors` の提供
- **レガシー互換性アダプター** による段階的移行
- **国際化対応** とデバッグ情報分離

## 移行パターン

### 1. 新規コード: UnifiedError + Result型

```typescript
// 推奨: 統合エラーシステム使用
import { ConfigManagerErrors, errorManager } from "./errors/mod.ts";
import { Result } from "./types/unified_result.ts";

function loadConfig(): Result<Config> {
  try {
    // config loading logic
    return Result.ok(config);
  } catch (error) {
    const unifiedError = ConfigManagerErrors.configParseError(
      path,
      error.message,
    );
    return Result.err(unifiedError);
  }
}
```

### 2. レガシーコード移行: アダプター使用

```typescript
// Before: ConfigError使用
import { ConfigError } from "./types/config_result.ts";

function handleConfigError(error: ConfigError) {
  console.error(`Config error: ${error.message}`);
}

// After: アダプター経由でUnifiedError統合
import { errorManager, normalizeError } from "./errors/mod.ts";

function handleAnyError(error: unknown) {
  const unifiedError = normalizeError(error);
  errorManager.logError(unifiedError);
}
```

### 3. 国際化対応

```typescript
// 言語設定
errorManager.setLanguage("ja");

// ユーザー向けメッセージ取得
const userMessage = errorManager.getUserMessage(error);

// デバッグ情報取得
const debugInfo = errorManager.getDebugMessage(error);
```

## Total Function設計への移行

### Total Functionとは

Total Functionは、すべての入力に対して必ず値を返す関数です。例外をスローせず、エラーも戻り値として表現します。

```typescript
// Partial Function（部分関数）
function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}

// Total Function（全関数）
function divide(a: number, b: number): Result<number, DivisionError> {
  if (b === 0) {
    return Result.err({ kind: "DIVISION_BY_ZERO", message: "Cannot divide by zero" });
  }
  return Result.ok(a / b);
}
```

### 移行のメリット

1. **型安全性**: エラーハンドリングの漏れをコンパイル時に検出
2. **明示性**: 関数シグネチャからエラーの可能性が明確
3. **composability**: Result型の関数を安全に組み合わせ可能
4. **テスタビリティ**: 例外のテストより簡潔で確実

### 2. Result Type with UnifiedError

All methods now return `Result<T, UnifiedError>`:

```typescript
// Before
async getConfig(): Promise<MergedConfig> // throws on error

// After
async getConfigSafe(): Promise<Result<MergedConfig, UnifiedError>>
```

### 3. Error Type Mapping

ConfigError types are mapped to UnifiedError:

```typescript
// In ConfigManager.loadAppConfigSafe()
if (error.kind === "fileNotFound") {
  return Result.err(ErrorFactories.configFileNotFound(error.path, "app"));
} else if (error.kind === "parseError") {
  return Result.err(
    ErrorFactories.configParseError(error.path, error.message, error.line, error.column),
  );
} else if (error.kind === "configValidationError") {
  const violations = error.errors.map((e) => ({
    field: e.field,
    value: e.value,
    expectedType: e.expectedType,
    actualType: typeof e.value,
    constraint: e.message,
  }));
  return Result.err(ErrorFactories.configValidationError(error.path, violations));
}
```

## Benefits of Direct UnifiedError Usage

1. **No ErrorManager Dependency**: ConfigManager is decoupled from ErrorManager
2. **Type-Safe Errors**: All errors are type-checked at compile time
3. **No Exceptions**: Error handling is explicit through Result type
4. **Better Testing**: No need for `assertRejects`, just check Result.isErr()
5. **Gradual Migration**: Legacy methods still available for backward compatibility

## Migration Strategy

### Phase 1: Add Safe Methods (Completed)

- Add `*Safe()` methods returning `Result<T, UnifiedError>`
- Keep legacy throwing methods for compatibility

### Phase 2: Update Consumers

- Update code to use safe methods
- Handle Result types explicitly

### Phase 3: Remove Legacy Methods

- Remove throwing methods
- Remove ErrorManager imports

### Phase 4: Remove ErrorManager

- Delete error_manager.ts
- Update all remaining references

## Example: Complete Migration

```typescript
// Using the new Result-based API
const configManager = new ConfigManager(appLoader, userLoader);
const result = await configManager.getConfigSafe();

if (Result.isOk(result)) {
  const config = result.data;
  console.log("Config loaded:", config.working_dir);
} else {
  const error = result.error;

  // Type-safe error handling
  switch (error.kind) {
    case "CONFIG_FILE_NOT_FOUND":
      console.error(`File not found: ${error.path}`);
      break;
    case "CONFIG_PARSE_ERROR":
      console.error(`Parse error at ${error.line}:${error.column}: ${error.syntaxError}`);
      break;
    case "CONFIG_VALIDATION_ERROR":
      console.error(`Validation failed with ${error.violations.length} errors`);
      error.violations.forEach((v) => {
        console.error(`  - ${v.field}: expected ${v.expectedType}, got ${v.actualType}`);
      });
      break;
    default:
      console.error(`Unexpected error: ${error.message}`);
  }
}
```

## Conclusion

The migration to UnifiedError provides:

- Complete decoupling from ErrorManager
- Type-safe error handling throughout the application
- Clear migration path for gradual adoption
- Better developer experience with exhaustive error checking
