# BreakdownConfig エラー仕様書（圧縮版）

## 概要
全域性原則による型安全エラー設計。Discriminated Union + Result型で実行時例外を排除。

## エラー型定義

```typescript
// 統合エラー型（全11種）
type UnifiedError = 
  | ConfigFileNotFoundError     // ERR1001/1003: ファイル不存在
  | ConfigParseError           // ERR1002: 解析失敗
  | ConfigValidationError      // ERR1002: 検証失敗  
  | UserConfigInvalidError     // ERR1004: ユーザー設定無効
  | PathValidationError        // ERR1007-1009: パス検証失敗
  | ConfigNotLoadedError       // ERR1010: 未初期化
  | InvalidProfileNameError    // ERR4001: プロファイル名無効
  | RequiredFieldMissingError  // ERR1005: 必須フィールド不存在
  | TypeMismatchError         // ERR1006: 型不一致
  | FileSystemError           // システムエラー
  | UnknownError              // ERR9999: 未知エラー

// 共通フィールド: kind, message, timestamp
interface BaseError {
  kind: string
  message: string
  timestamp: Date
}

// パス関連
type PathErrorReason = "PATH_TRAVERSAL" | "ABSOLUTE_PATH_NOT_ALLOWED" | "INVALID_CHARACTERS" | "PATH_TOO_LONG" | "EMPTY_PATH"

// 検証違反
interface ValidationViolation {
  field: string
  value: unknown
  expectedType: string
  actualType: string
  constraint?: string
}
```

## エラーファクトリ

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
  // ...他のファクトリ
}

export const ErrorGuards = {
  isConfigFileNotFound: (e: UnifiedError): e is ConfigFileNotFoundError => e.kind === "CONFIG_FILE_NOT_FOUND",
  isConfigParseError: (e: UnifiedError): e is ConfigParseError => e.kind === "CONFIG_PARSE_ERROR",
  isPathValidationError: (e: UnifiedError): e is PathValidationError => e.kind === "PATH_VALIDATION_ERROR"
  // ...他のガード
} as const
```

## 処理パターン

### Result型
```typescript
type Result<T, E> = { ok: true; data: T } | { ok: false; error: E }

const result: Result<Config, UnifiedError> = await loadConfig()
if (!result.ok) {
  // 全域関数で網羅的処理（defaultなし）
  switch (result.error.kind) {
    case "CONFIG_FILE_NOT_FOUND": /* 処理 */ break
    case "CONFIG_PARSE_ERROR": /* 処理 */ break
    // 全11ケース網羅
  }
}
```

## エラーコード対応表

| レガシー | 標準コード | 重要度 | 説明 |
|---------|-----------|-------|------|
| ERR1001 | CF_CONFIG_FILE_NOT_FOUND | ERROR | アプリ設定不存在 |
| ERR1002 | CF_CONFIG_PARSE_ERROR | ERROR | 設定解析失敗 |
| ERR1003 | CF_CONFIG_FILE_NOT_FOUND | WARN | ユーザー設定不存在 |
| ERR1004 | CF_USER_CONFIG_INVALID | WARN | ユーザー設定無効 |
| ERR1005 | VL_REQUIRED_FIELD_MISSING | ERROR | 必須フィールド不存在 |
| ERR1006 | VL_TYPE_MISMATCH | ERROR | 型不一致 |
| ERR1007-1009 | PS_PATH_VALIDATION | ERROR | パス検証失敗 |
| ERR1010 | CF_CONFIG_NOT_LOADED | ERROR | 未初期化 |
| ERR4001 | CF_INVALID_PROFILE_NAME | ERROR | プロファイル名無効 |
| ERR9999 | UN_UNKNOWN_ERROR | CRITICAL | 未知エラー |

## 復旧戦略
- **自動**: ユーザー設定→デフォルト値、パス正規化
- **手動**: ファイル作成要求、修正箇所提示

## 設計原則
✅ Discriminated Union（網羅的型）  
✅ Result型（例外制御フロー排除）  
✅ Smart Constructor（不正状態防止）  
✅ switch文default不要（全ケース網羅）  
✅ 型アサーション使用量ゼロ
