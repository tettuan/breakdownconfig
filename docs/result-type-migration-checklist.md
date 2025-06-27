# Result型導入に伴うドキュメント更新チェックリスト

## 更新が必要なファイル一覧

### 1. src/error_manager.ts
**現状**: ErrorCode enumとErrorManagerクラスで例外ベースのエラー処理
**更新内容**:
- [ ] 既存のErrorCodeをConfigError型にマッピングする対応表を作成
- [ ] ErrorManager.throwErrorの代替となるResult型生成関数のドキュメント追加
- [ ] 移行期間中の互換性維持方法の説明を追加

### 2. src/loaders/app_config_loader.ts
**現状**: try-catchブロックと例外スロー
**更新内容**:
- [ ] loadConfig()メソッドにResult型返り値のJSDocコメント追加
- [ ] 各エラーケース（ファイル不在、パースエラー、検証エラー）の説明
- [ ] 使用例をResult型パターンマッチングに更新

### 3. src/loaders/user_config_loader.ts
**現状**: 例外ベースのエラー処理
**更新内容**:
- [ ] loadConfig()メソッドのResult型対応コメント
- [ ] ユーザー設定特有のバリデーションエラーの説明
- [ ] デフォルト値の扱いについての説明

### 4. src/config_manager.ts
**現状**: try-catchで複数の設定を統合
**更新内容**:
- [ ] loadConfig()のResult型チェーンの説明
- [ ] 複数のConfigResultを組み合わせる方法の例
- [ ] マージ処理でのエラー伝播の説明

### 5. src/validators/config_validator.ts
**現状**: boolean返り値のバリデーション関数
**更新内容**:
- [ ] バリデーション関数をResult型返り値に変更する際のドキュメント
- [ ] 具体的なValidationErrorの生成例
- [ ] フィールドごとの検証エラーメッセージテンプレート

### 6. src/utils/path_resolver.ts
**現状**: 文字列操作とパス解決
**更新内容**:
- [ ] パス解決失敗時のPathError返り値の説明
- [ ] セキュリティ関連のパスエラー（traversal）の詳細説明

### 7. src/utils/valid_path.ts
**現状**: パスバリデーション（予定）
**更新内容**:
- [ ] ValidPath型のSmart Constructor実装例
- [ ] パスバリデーションルールの文書化
- [ ] 各PathErrorReasonの発生条件

## テストファイルのドキュメント更新

### テストパターンの変更
**現在のパターン**:
```typescript
await assertRejects(
  async () => { await loader.loadConfig(); },
  Error,
  "ERR1002: Invalid configuration"
);
```

**新しいパターン**:
```typescript
const result = await loader.loadConfig();
assert(!result.success);
assertEquals(result.error.kind, "validationError");
assertEquals(result.error.field, "port");
```

### 更新が必要なテストファイル
- [ ] tests/app_config_loader_test.ts
- [ ] tests/user_config_loader_test.ts
- [ ] tests/config_manager_test.ts
- [ ] tests/breakdown_config_test.ts
- [ ] 各テストファイルに新しいアサーションパターンの説明を追加

## README.md の更新内容

### 追加すべきセクション

#### 1. エラーハンドリング
```markdown
## エラーハンドリング

本ライブラリはResult型パターンを採用し、エラーを値として扱います。

### 基本的な使用方法
\`\`\`typescript
const configResult = await breakdownConfig.loadConfig();

if (configResult.success) {
  // 型安全にconfigにアクセス
  const config = configResult.data;
  console.log(config.appConfig.name);
} else {
  // エラーの種類に応じた処理
  switch (configResult.error.kind) {
    case "fileNotFound":
      console.error(`Config file not found: ${configResult.error.path}`);
      break;
    case "validationError":
      console.error(`Invalid ${configResult.error.field}: expected ${configResult.error.expectedType}`);
      break;
    // ... other error cases
  }
}
\`\`\`
```

#### 2. エラー型リファレンス
```markdown
### エラー型

| エラー種別 | 説明 | 主な原因 |
|-----------|------|----------|
| FileNotFoundError | 設定ファイルが見つからない | ファイルパスの誤り、ファイルの不在 |
| ParseError | YAML/JSON構文エラー | 不正な構文、文字エンコーディングの問題 |
| ValidationError | 設定値の検証エラー | 型の不一致、必須フィールドの欠如 |
| PathError | パス関連のエラー | ディレクトリトラバーサル、不正な文字 |
```

#### 3. 移行ガイド
```markdown
### 例外ベースからResult型への移行

既存のコード:
\`\`\`typescript
try {
  const config = await breakdownConfig.loadConfig();
  // use config
} catch (error) {
  console.error("Failed to load config:", error.message);
}
\`\`\`

Result型を使用:
\`\`\`typescript
const configResult = await breakdownConfig.loadConfig();
if (!configResult.success) {
  console.error("Failed to load config:", configResult.error.message);
  return;
}
const config = configResult.data;
// use config
\`\`\`
```

## JSDocコメントの標準フォーマット

### Result型を返す関数
```typescript
/**
 * [関数の概要]
 * 
 * @param paramName - [パラメータの説明]
 * @returns Success<T>: [成功時の返り値の説明]
 * @returns Failure<E>: [失敗時のエラー型と条件]
 * 
 * @example
 * ```ts
 * const result = await functionName(param);
 * if (result.success) {
 *   // handle success
 * } else {
 *   // handle error based on error.kind
 * }
 * ```
 */
```

### エラー型の定義
```typescript
/**
 * [エラーの概要説明]
 * 
 * このエラーは[発生条件]の場合に返されます。
 * 
 * @example
 * ```ts
 * if (error.kind === "errorKind") {
 *   console.log(`Error in ${error.specificField}: ${error.message}`);
 * }
 * ```
 */
```

## 優先順位と実装順序

### Phase 1: 型定義とヘルパー関数（完了済み）
- [x] ConfigResult型の定義 (config_result.ts)
- [x] エラー型の定義
- [x] Resultヘルパー関数

### Phase 2: コアローダーの実装（進行中）
- [x] SafeConfigLoaderの実装
- [ ] 既存ローダーのResult型対応
- [ ] 各ローダーのドキュメント更新

### Phase 3: 統合層の更新
- [ ] ConfigManagerのResult型対応
- [ ] BreakdownConfigのインターフェース更新
- [ ] 公開APIのドキュメント更新

### Phase 4: テストとドキュメント
- [ ] テストケースの更新
- [ ] README.mdの更新
- [ ] 型定義ファイル（.d.ts）の生成

## チェックポイント

### コメントの品質確認
- [ ] すべてのpublic関数にJSDocコメントがある
- [ ] Result型の成功・失敗ケースが明記されている
- [ ] 実用的なコード例が含まれている
- [ ] エラーからの回復方法が示されている

### ドキュメントの整合性
- [ ] 型定義とドキュメントが一致している
- [ ] テストコードと使用例が一致している
- [ ] エラーメッセージが実装と一致している

### ユーザビリティ
- [ ] エラーメッセージが問題解決に役立つ
- [ ] 移行パスが明確に示されている
- [ ] よくある使用パターンがカバーされている