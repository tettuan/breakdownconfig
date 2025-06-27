# Phase 5 統合テストシナリオ設計

## 概要

Phase 4完了後のtotal function設計に基づく統合テストとE2Eテストシナリオ。全域関数による型安全性を検証し、実際のワークフローをエンドツーエンドで検証する。

## テスト戦略

### 1. 統合テストレベルの分類

#### 1.1 コンポーネント統合テスト

- ConfigManager + Loaders統合
- Validators + ErrorHandling統合
- PathValidator + FileSystem統合

#### 1.2 システム統合テスト

- 完全なconfigロードワークフロー
- エラーハンドリング統合検証
- パフォーマンス検証

#### 1.3 E2Eテスト

- 実際のユーザーシナリオ再現
- CLI操作シミュレーション
- 複数環境での動作検証

## 統合テストシナリオ

### シナリオ1: 正常フロー統合テスト

```typescript
// tests/integration/happy_path_integration_test.ts
// 目的: 全コンポーネントが連携してconfig読み込みが成功する流れを検証
describe("Happy Path Integration", () => {
  test("should load and merge app and user configs successfully", async () => {
    // Given: 有効なapp.ymlとuser.ymlが存在
    // When: ConfigManagerでロード実行
    // Then: ValidatedConfigが正しく生成される
  });
});
```

### シナリオ2: エラーハンドリング統合テスト

```typescript
// tests/integration/error_handling_integration_test.ts
// 目的: エラーが適切に伝播し、UnifiedErrorとして統一されることを検証
describe("Error Handling Integration", () => {
  test("should propagate parse errors through the entire stack", async () => {
    // Given: 不正なYAML
    // When: 読み込み実行
    // Then: CONFIG_PARSE_ERRORとして統一エラーが返される
  });
});
```

### シナリオ3: パス検証統合テスト

```typescript
// tests/integration/path_validation_integration_test.ts
// 目的: PathValidatorとファイルシステム操作の統合検証
describe("Path Validation Integration", () => {
  test("should validate paths and prevent directory traversal", async () => {
    // Given: path traversal攻撃を含むconfig
    // When: ロード実行
    // Then: PATH_VALIDATION_ERRORが返される
  });
});
```

## E2Eテストシナリオ

### E2Eシナリオ1: 初回セットアップワークフロー

```typescript
// tests/e2e/initial_setup_workflow_test.ts
describe("Initial Setup Workflow", () => {
  test("should handle first time user setup", async () => {
    // 1. 空のディレクトリから開始
    // 2. app.ymlの自動生成または検出
    // 3. user.ymlの作成または検出
    // 4. 設定の読み込みと検証
    // 5. 動作確認
  });
});
```

### E2Eシナリオ2: 設定変更ワークフロー

```typescript
// tests/e2e/config_change_workflow_test.ts
describe("Config Change Workflow", () => {
  test("should handle config updates and validation", async () => {
    // 1. 既存の設定でシステム起動
    // 2. user.ymlの変更
    // 3. 設定の再読み込み
    // 4. 変更の反映確認
    // 5. バリデーション確認
  });
});
```

### E2Eシナリオ3: エラー回復ワークフロー

```typescript
// tests/e2e/error_recovery_workflow_test.ts
describe("Error Recovery Workflow", () => {
  test("should recover from config errors gracefully", async () => {
    // 1. 正常な状態から開始
    // 2. configファイルを破損
    // 3. エラーの検出と報告
    // 4. configの修復
    // 5. 正常状態への復帰
  });
});
```

## テストデータ戦略

### 統合テスト用テストデータ

```typescript
// tests/integration/test_data/
export const integrationTestData = {
  validConfigs: {
    minimal: {/* 最小限の有効なconfig */},
    complete: {/* 全項目を含む有効なconfig */},
    withCustomFields: {/* カスタムフィールドを含むconfig */},
  },
  invalidConfigs: {
    malformedYaml: "invalid: yaml: content",
    missingRequired: {/* 必須フィールドが欠けているconfig */},
    invalidPaths: {/* 不正なパスを含むconfig */},
  },
  scenarios: {
    pathTraversal: {/* パストラバーサル攻撃のテストデータ */},
    largeSizeConfig: {/* 大きなサイズのconfig */},
    unicodeContent: {/* Unicode文字を含むconfig */},
  },
};
```

## テスト実行戦略

### 実行順序

1. **ユニットテスト** - 既存の15ファイルでコンポーネント単体検証
2. **統合テスト** - コンポーネント間の連携検証
3. **E2Eテスト** - 実際のワークフロー検証
4. **パフォーマンステスト** - 負荷・速度検証

### CI/CD統合

```bash
# scripts/integration_test.sh
#!/bin/bash
# Phase 5統合テスト実行スクリプト

echo "Phase 5: Integration Testing"

# 1. 統合テスト実行
deno test tests/integration/ --allow-env --allow-write --allow-read

# 2. E2Eテスト実行  
deno test tests/e2e/ --allow-env --allow-write --allow-read --allow-net

# 3. パフォーマンステスト
deno test tests/performance/ --allow-env --allow-write --allow-read

echo "Integration testing completed"
```

## 品質ゲート

### 統合テストの成功基準

- [ ] 全正常フローが型安全に実行される
- [ ] 全エラーケースでUnifiedErrorが適切に生成される
- [ ] メモリリークが発生しない
- [ ] パフォーマンス要件を満たす

### E2Eテストの成功基準

- [ ] 実際のユーザーシナリオが完全に動作する
- [ ] エラー状態からの回復が可能
- [ ] 複数環境での一貫した動作
- [ ] セキュリティ要件を満たす

## 次フェーズへの準備

Phase 5完了後は以下を準備：

- 本番環境デプロイメント検証
- ユーザー受入テスト準備
- ドキュメント最終更新
- リリースノート作成
