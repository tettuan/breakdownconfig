---
name: check-logger
description: Verify and run BreakdownLogger debug output. Use when debugging test failures, running tests with LOG_KEY, or when user says 'ログ確認', 'デバッグ実行', 'LOG_KEY', 'LOG_LEVEL'.
---

BreakdownLogger の出力を検証・実行する手順。

## 1. 環境変数

| 変数 | 値 | 用途 |
|------|---|------|
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` | 出力閾値 |
| `LOG_KEY` | カンマ区切り | キーでフィルタ（例: `loader,validator`） |
| `LOG_LENGTH` | `S`=160, `L`=300, `W`=無制限 | 出力長（デフォルト80） |

## 2. 実行コマンド

```bash
# 特定モジュールをデバッグ
LOG_LEVEL=debug LOG_KEY="loader" deno test tests/3.integrated/config_loading_integration_test.ts --allow-env --allow-write --allow-read

# 複数モジュールを同時追跡
LOG_LEVEL=debug LOG_KEY="manager,loader" deno test --allow-env --allow-write --allow-read

# 全出力（キーフィルタなし、出力長無制限）
LOG_LEVEL=debug LOG_LENGTH=W deno test --allow-env --allow-write --allow-read
```

## 3. デバッグシナリオ別 KEY 指定

| 問題 | 使用する LOG_KEY | 確認すること |
|------|----------------|-------------|
| 設定ファイルが読まれない | `loader` | ファイルパス・パース結果 |
| マージ結果が期待と違う | `manager` | マージ入力・優先順位・出力 |
| Public APIの戻り値が不正 | `config` | 生成された設定・アクセス結果 |
| バリデーションが通らない | `validator` | 適用ルール・拒否理由 |
| パスが解決できない | `path` | baseDir・resolved・存在チェック |
| キャッシュから古い値が返る | `cache` | hit/miss・無効化タイミング |
| エラーメッセージが不正 | `error` | エラーコード・i18n・伝播 |
| テスト環境が壊れている | `setup` | フィクスチャ・一時ディレクトリ |

## 4. 検証チェックリスト

テストファイルの logger 実装を検証する際の確認項目:

- [ ] LOG_KEY が対象モジュールに対応しているか（`/add-logger` の命名規則表を参照）
- [ ] `config` と `manager` が正しく使い分けられているか
- [ ] 関数呼び出し前後に `logger.debug()` があるか
- [ ] 期待値と実際の値の両方がログに含まれているか
- [ ] テスト対象外のモジュールの KEY を使っていないか
- [ ] `LOG_LEVEL=debug LOG_KEY=<key>` で実行して出力が確認できるか

## 5. 出力の読み方

```
[2025-02-17T10:30:00.000Z] [DEBUG] [manager] merge inputs {"appConfig":{"key":"app_value"},"userConfig":{"key":"user_value"}}
[2025-02-17T10:30:00.001Z] [DEBUG] [manager] merge result {"expected":"user_value","actual":"user_value"}
```

- タイムスタンプで処理順序を追う
- `[KEY]` でモジュール層を特定する
- JSON data で具体的な値を確認する
