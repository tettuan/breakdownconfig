---
name: add-logger
description: Add BreakdownLogger to test code. Use when creating test files, adding debug logging to existing tests, or when user says 'ログ追加', 'logger追加', 'デバッグログ'.
---

テストファイルに BreakdownLogger を追加する手順。本番コード（`src/`）での使用は禁止。

## 1. Import

```typescript
import { BreakdownLogger } from "@tettuan/breakdownlogger";
```

## 2. Logger生成（LOG_KEY を付与）

```typescript
const logger = new BreakdownLogger("loader");
```

KEY はテスト対象モジュールに対応させる（後述の命名規則を参照）。

## 3. API

| メソッド | 表示条件 |
|---------|---------|
| `debug(msg, data?)` | `LOG_LEVEL=debug` |
| `info(msg, data?)` | デフォルト以上 |
| `warn(msg, data?)` | `LOG_LEVEL=warn` 以上 |
| `error(msg, data?)` | 常時（stderr） |

## 4. 型

```typescript
import { LogLevel, LogLength, type LogEntry } from "@tettuan/breakdownlogger";
```

| 型 | 値 |
|---|---|
| `LogLevel` | `DEBUG=0`, `INFO=1`, `WARN=2`, `ERROR=3` |
| `LogLength` | `DEFAULT`=80, `SHORT`=160, `LONG`=300, `WHOLE`=無制限 |
| `LogEntry` | `{ timestamp, level, key, message, data? }` |

## 5. LOG_KEY 命名規則

src/ のモジュール境界に1対1で対応させる。テスト対象の層を KEY で特定できるようにする。

| KEY | src/ モジュール | デバッグ対象 |
|-----|---------------|------------|
| `config` | `breakdown_config.ts` | Public API: 設定の生成・構造・アクセス |
| `manager` | `config_manager.ts` | 内部制御: 初期化・マージ戦略・リロード |
| `loader` | `loaders/` | ファイルI/O: 読み込み・パース・形式検出 |
| `validator` | `validators/` | 検証: スキーマ・制約・拒否理由 |
| `error` | `errors/`, `error_manager.ts` | エラー: 生成・i18n・伝播チェーン |
| `path` | `utils/path_resolver.ts`, `utils/valid_path.ts` | パス: 解決・探索・存在確認 |
| `cache` | `utils/config_cache.ts`, `utils/error_cache.ts` | キャッシュ: ヒット/ミス・TTL・無効化 |
| `setup` | テストのsetup/teardown | テスト環境: フィクスチャ・一時ディレクトリ |

**config vs manager の使い分け**: `BreakdownConfig` クラスのテストには `config`、`ConfigManager` のテストには `manager` を使う。問題が公開APIにあるか内部制御にあるかを切り分けるため。

## 6. 実装パターン

```typescript
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { BreakdownLogger } from "@tettuan/breakdownlogger";

describe("ConfigManager merge", () => {
  const logger = new BreakdownLogger("manager");

  it("should merge user config over app defaults", () => {
    const appConfig = { key: "app_value" };
    const userConfig = { key: "user_value" };
    logger.debug("merge inputs", { appConfig, userConfig });

    const result = mergeConfigs(appConfig, userConfig);
    logger.debug("merge result", { expected: "user_value", actual: result.key });

    assertEquals(result.key, "user_value");
  });
});
```

要点:
- 関数呼び出し前に入力値をログ
- 関数呼び出し後に期待値と実際の値の両方をログ
- 失敗時の原因特定を容易にする
