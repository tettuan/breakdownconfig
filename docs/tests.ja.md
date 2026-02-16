# テスト戦略

## テストの階層構造

テストは以下の階層別に定義し、段階的にテストを実行する：

### 0. Architecture テスト
- **配置**: 実装と同じ階層に `*_test.ts` の名前で対応
- **目的**: アーキテクチャレベルの設計原則と制約の検証
- **対象**: モジュール依存関係、レイヤー分離、設計パターンの遵守

### 1. Structure テスト  
- **配置**: 実装と同じ階層に `*_test.ts` の名前で対応
- **目的**: データ構造とインターフェースの整合性検証
- **対象**: 型定義、設定スキーマ、API契約

### 2. Units テスト
- **配置**: 実装と同じ階層に `*_test.ts` の名前で対応
- **目的**: 個別関数・メソッドの動作検証
- **対象**: 基本機能、エッジケース、エラーハンドリング

### 3. Integrated テスト
- **配置**: `tests/3.integrated/` 配下
- **目的**: 複数コンポーネント間の連携動作検証
- **対象**: モジュール間の結合、設定の統合処理

### 4. E2E テスト
- **配置**: `tests/4.e2e/` 配下  
- **目的**: エンドユーザーシナリオでの全体動作検証
- **対象**: 実際の使用ケース、ワークフロー全体

## テスト実行原則

- テスト専用のWorkingディレクトリは不要
- fixtureも本番と同様の設定を用いること
  - リスクなし：このライブラリ単体では動作しない。読み込んだアプリケーションの設定を上書きもしない
  - 本稼働重視：設定値という重要な値を扱うため、本番での動作を保証する
- 階層順序でのテスト実行により、問題の早期発見と効率的なデバッグを実現

## テストでのログ出力

- テストコードではBreakdownLoggerを使用してデバッグ情報を出力する
- テスト環境ではDEBUGレベルのログを出力可能
- テストのセットアップとクリーンアップでログ出力を行う
- エラーケースのテストでは、エラーメッセージの検証も行う

### BreakdownLoggerデバッグ

#### 基本形式
```typescript
import { BreakdownLogger } from "@tettuan/breakdownlogger";
const logger = new BreakdownLogger();

// テスト段階: setup → execution → verification → cleanup
logger.debug("Test started", { testName, context });
logger.error("Test failed", { error, expectedValue, actualValue });
```

#### KEY設定によるデバッグ目的の分類
ログ出力時にデバッグの目的を明確にするため、コンストラクタでKEYを指定：

```typescript
// データフロー追跡
const dataflowLogger = new BreakdownLogger("dataflow");
dataflowLogger.debug("Config loading started", { workingDir });
dataflowLogger.debug("Values transformed", { before, after });

// セキュリティ検証
const securityLogger = new BreakdownLogger("security");
securityLogger.debug("File permissions checked", { path, mode });
securityLogger.debug("Access validation", { user, resource });

// ステップバイステップ処理
const stepLogger = new BreakdownLogger("stepbystep");
stepLogger.debug("Phase 1 completed", { phase: "initialization" });
stepLogger.debug("Processing item", { index, total });

// エラー詳細
const errorLogger = new BreakdownLogger("error");
errorLogger.error("Validation failed", { field, expected, actual });
```

#### 実行制御
```bash
# 基本: LOG_LEVEL={debug|info|warn|error}
LOG_LEVEL=debug deno test --allow-env --allow-write --allow-read

# 目的別フィルタ: LOG_KEY="目的名1,目的名2"
LOG_LEVEL=debug LOG_KEY="dataflow" deno test          # データフロー追跡
LOG_LEVEL=debug LOG_KEY="security" deno test          # セキュリティ検証
LOG_LEVEL=debug LOG_KEY="stepbystep" deno test        # ステップ追跡
LOG_LEVEL=debug LOG_KEY="dataflow,security" deno test # 複数目的

# 出力長: LOG_LENGTH={S|L|W} (Short=160文字, Long=300文字, Whole=無制限, デフォルト=80文字)
LOG_LEVEL=debug LOG_LENGTH=L deno test

# CI: DEBUG=true
DEBUG=true LOG_KEY="error" scripts/local_ci.sh
```

#### トラブルシューティング公式
```
1. scripts/local_ci.sh (概要把握)
2. DEBUG=true scripts/local_ci.sh (詳細確認)  
3. LOG_LEVEL=debug deno test {file} (個別実行)
4. ログ出力から問題特定
```
