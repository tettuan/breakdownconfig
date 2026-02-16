---
name: breakdown-logger
description: Guide for using BreakdownLogger in test code. Use when writing tests, debugging test failures, or when user mentions 'logger', 'BreakdownLogger', 'LOG_LEVEL', 'LOG_KEY', 'LOG_LENGTH'.
---

テストコードでのみデバッグ出力するため、`@tettuan/breakdownlogger@^1.1.3` の BreakdownLogger を使う。本番コード（`src/`）での使用は禁止。

## API

```typescript
import { BreakdownLogger } from "@tettuan/breakdownlogger";
const logger = new BreakdownLogger(key?: string);
```

| メソッド | 表示条件 |
|---------|---------|
| `debug(msg, data?)` | `LOG_LEVEL=debug` |
| `info(msg, data?)` | デフォルト以上 |
| `warn(msg, data?)` | `LOG_LEVEL=warn` 以上 |
| `error(msg, data?)` | 常時（stderr） |
| `log(level, msg, data?)` | level に従う |

## 型

```typescript
import { LogLevel, LogLength, type LogEntry } from "@tettuan/breakdownlogger";
```

| 型 | 値 |
|---|---|
| `LogLevel` | `DEBUG=0`, `INFO=1`, `WARN=2`, `ERROR=3` |
| `LogLength` | `DEFAULT`=80, `SHORT`=160, `LONG`=300, `WHOLE`=無制限 |
| `LogEntry` | `{ timestamp, level, key, message, data? }` |

## 環境変数

| 変数 | 値 | 用途 |
|------|---|------|
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` | 出力閾値 |
| `LOG_KEY` | カンマ区切り | キーでフィルタ（例: `loader,validator`） |
| `LOG_LENGTH` | `S`=160, `L`=300, `W`=無制限 | 出力長（デフォルト80） |

## LOG_KEY 命名規則

src/ のモジュール境界に対応させ、デバッグ時に問題の層を特定する。

| KEY | 対象モジュール | デバッグ用途 |
|-----|--------------|------------|
| `config` | `breakdown_config.ts`, `config_manager.ts` | 設定の生成・マージ・取得の追跡 |
| `loader` | `loaders/` | ファイル読み込み・パース失敗の特定 |
| `validator` | `validators/` | バリデーションルール・拒否理由の確認 |
| `error` | `errors/` | エラー生成・変換・伝播の追跡 |
| `path` | `utils/path_resolver.ts`, `utils/valid_path.ts` | パス解決・ディレクトリ探索の確認 |
| `cache` | `utils/config_cache.ts`, `utils/error_cache.ts` | キャッシュのヒット・ミス・無効化 |
| `setup` | テストのsetup/teardown | テスト環境構築・破棄の確認 |

使い方:

```typescript
// テストファイル内で、デバッグ対象の層に応じたkeyを付与する
const logger = new BreakdownLogger("loader");
logger.debug("config file loaded", { path, content });

const pathLogger = new BreakdownLogger("path");
pathLogger.debug("resolved working dir", { baseDir, resolved });
```

```bash
# 設定読み込み問題を調査
LOG_LEVEL=debug LOG_KEY="loader" deno test tests/3.integrated/config_loading_integration_test.ts --allow-env --allow-write --allow-read

# パス解決とバリデーションを同時に追跡
LOG_LEVEL=debug LOG_KEY="path,validator" deno test --allow-env --allow-write --allow-read

# 全出力（キーフィルタなし、出力長無制限）
LOG_LEVEL=debug LOG_LENGTH=W deno test --allow-env --allow-write --allow-read
```
