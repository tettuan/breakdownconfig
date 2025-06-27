# 既存テストへのエッジケースパターン適用提案

## 概要

エッジケーステストで得られた知見を既存テストに適用し、テストカバレッジと堅牢性を向上させるための具体的な改善提案。

## 1. 境界値テストパターンの適用

### 対象テスト

- `tests/config/validation_test.ts`
- `tests/config/path_test.ts`

### 改善提案

```typescript
// 空文字列境界値テスト追加
it("should handle empty string in required fields", async () => {
  const config = {
    working_dir: "", // 境界値
    app_prompt: { base_dir: "" }, // 境界値
    app_schema: { base_dir: "" }, // 境界値
  };

  const result = await validateConfig(config);
  assertConfigValidationError(result, undefined, 3); // 3つの違反
});

// パス長制限テスト
it("should reject paths exceeding system limits", async () => {
  const longPath = "a".repeat(300); // Windows MAX_PATH超過
  const result = await validatePath(longPath);
  assertPathValidationError(result, "PATH_TOO_LONG");
});
```

## 2. 型推論エッジケースの適用

### 対象テスト

- `tests/functional/result_operations_test.ts`
- `tests/error_handling_patterns_test.ts`

### 改善提案

```typescript
// Discriminated Union型の網羅的テスト
describe("Error type discrimination", () => {
  it("should narrow error types correctly", () => {
    const errors: UnifiedError[] = [
      ErrorFactories.configFileNotFound("/path", "app"),
      ErrorFactories.configValidationError("/path", []),
      ErrorFactories.pathValidationError("/path", "PATH_TRAVERSAL", "field"),
    ];

    errors.forEach((error) => {
      // Type guard による型の絞り込み
      if (ErrorGuards.isConfigFileNotFound(error)) {
        assertExists(error.searchedLocations);
      } else if (ErrorGuards.isConfigValidationError(error)) {
        assertExists(error.violations);
      } else if (ErrorGuards.isPathValidationError(error)) {
        assertExists(error.affectedField);
      }
    });
  });
});

// 条件型を使った高度な型変換テスト
type ErrorToMessage<E extends UnifiedError> = E extends { violations: any[] } ? "Validation failed"
  : E extends { path: string } ? "Path error"
  : "Unknown error";
```

## 3. コンパイル時保証パターンの適用

### 対象テスト

- `tests/config/error_test.ts`
- `tests/err1002/*_test.ts`

### 改善提案

```typescript
// never型による網羅性チェック
function assertExhaustive(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}

it("should handle all error kinds exhaustively", () => {
  function getErrorSeverity(error: UnifiedError): number {
    switch (error.kind) {
      case "CONFIG_FILE_NOT_FOUND":
        return 1;
      case "CONFIG_PARSE_ERROR":
        return 2;
      case "CONFIG_VALIDATION_ERROR":
        return 3;
      // ... 全てのケースを列挙
      default:
        return assertExhaustive(error); // 漏れがあればコンパイルエラー
    }
  }
});

// const assertionsによる不変性テスト
const ERROR_PRIORITIES = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
} as const;

type ErrorPriority = keyof typeof ERROR_PRIORITIES;
```

## 4. 非同期エッジケースの適用

### 対象テスト

- `tests/integration/error_handling_integration_test.ts`
- `tests/basic/config_loader_test.ts`

### 改善提案

```typescript
// Promise→Result変換でのエラーハンドリング
it("should handle async errors gracefully", async () => {
  const results = await Promise.all([
    UnifiedResult.fromPromise(Promise.resolve("success")),
    UnifiedResult.fromPromise(Promise.reject(new Error("failure"))),
    UnifiedResult.fromPromise(Promise.reject("non-error rejection")),
  ]);

  assertEquals(results[0].success, true);
  assertEquals(results[1].success, false);
  assertEquals(results[2].success, false);

  // エラーの型を確認
  if (!results[1].success) {
    assertEquals(results[1].error.kind, "UNKNOWN_ERROR");
  }
});
```

## 5. メモリ・パフォーマンスエッジケース

### 対象テスト

- すべての統合テスト

### 改善提案

```typescript
// 大量エラーチェーンのパフォーマンステスト
it("should handle error chains efficiently", () => {
  const start = Date.now();
  let result = UnifiedResult.ok<number, UnifiedError>(0);

  // 1000回のmap操作
  for (let i = 0; i < 1000; i++) {
    result = UnifiedResult.map(result, (n) => n + 1);
  }

  const elapsed = Date.now() - start;
  assertEquals(elapsed < 100, true); // 100ms以内で完了

  if (result.success) {
    assertEquals(result.data, 1000);
  }
});

// 循環参照の検出
it("should detect circular references", () => {
  const circular: any = { name: "test" };
  circular.self = circular;

  const result = UnifiedResult.err(
    ErrorFactories.unknown(circular),
  );

  // JSON.stringifyでエラーにならないことを確認
  assertThrows(() => JSON.stringify(result.error));
});
```

## 6. 実装優先順位

1. **高優先度**: 境界値テストの追加（validation_test.ts, path_test.ts）
2. **中優先度**: 型推論テストの強化（result_operations_test.ts）
3. **低優先度**: パフォーマンステストの追加（統合テスト）

## まとめ

エッジケーステストで開発した以下のパターンを既存テストに適用することで、より堅牢なテストスイートを構築できます：

- 境界値テスト（空文字列、最大長、特殊文字）
- 型推論テスト（Discriminated Union、条件型）
- コンパイル時保証（never型、const assertions）
- 非同期エラーハンドリング
- パフォーマンス・メモリ使用量テスト

これらの改善により、実運用環境で発生する可能性のあるエッジケースをより確実にカバーできます。
