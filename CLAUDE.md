---
description:
globs:
alwaysApply: false
---

Deno + JSR publishプロジェクト。テスト・フィクスチャは `tests/` に配置し、`deno.json` で設定を管理する。

型安全のため、`strict: true` と明示的型定義を使う。コードは `deno fmt` / `deno lint` に準拠する。

push前に `scripts/local_ci.sh` を通す。main/develop への直接pushは禁止。

# Skills

| Skill | 用途 |
|-------|------|
| `/local-ci` | CI実行・エラー対処 |
| `/run-tests` | 個別テスト実行 |
| `/fix-checklist` | 根本原因特定→修正 |
| `/add-logger` | テストにログ実装を追加 |
| `/check-logger` | ログ出力の検証・デバッグ実行 |
| `/branch-management` | ブランチ戦略・PR作成 |
| `/release-procedure` | リリースフロー |
| `/bump-version` | バージョン更新 |
| `/update-docs` | ドキュメント更新判断 |
| `/update-changelog` | CHANGELOG記録 |
| `/docs-consistency` | ドキュメント整合性検証 |
| `/refactoring` | 構造変更の安全手順 |
| `/absolute-path-checker` | 絶対パス混入防止 |
| `/ci-troubleshooting` | CIエラー解決 |
| `/workflow` | タスク委任・進行管理 |

# 仕様の矛盾

テストと実装の矛盾でループする場合、`docs/priority.md` で優先度を確認し、記載がなければ `tmp/conflict_of_specifications.md` に問題を記述する。

# テストでのデバッグログ

実行プロセスのデバッグには BreakdownLogger を用いる。テストファイル作成時は `/add-logger` スキルを参照し、検証時は `/check-logger` を使う。以下を守る。

- `LOG_LEVEL=debug LOG_KEY=<対象キー>` で実行し、処理の流れを追えるようにする
- テスト対象の関数呼び出し前後に `logger.debug()` でステップを記録する
- 期待値と実際の値の両方をログに出し、失敗時の原因特定を容易にする

# コメント

テストが通った時のみコメントを書く。

# コンテキスト管理

複雑なタスクでは必ず team / sub-agent を使い、main の Token をクリーンに保つこと。
