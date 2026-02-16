# Delegation Protocol

## Agent Type

| 用途 | Agent Type | 能力 |
|------|-----------|------|
| ファイル探索・コード検索 | Explore | 読み取り専用 |
| 設計比較・アーキテクチャ選択 | Plan | 読み取り専用 |
| 実装・テスト・検証・ファイル編集 | general-purpose | 全ツールアクセス |

## 同一ファイル競合

2つのSub Agentが同一ファイルを編集した場合、指揮者が両方のdiffを読み、手動でマージを判断する。自動結合しない。

## Sub Agent起動テンプレート

プロンプトに以下の4要素を必ず含める。

| 要素 | 例 |
|------|---|
| Goal | 「createCompletionHandlerの全消費者を特定」 |
| Input | 「agents/completion/factory.ts から開始」 |
| Expected output | 「import/呼び出し箇所のfile:lineリスト」 |
| Output path | 「tmp/investigation/consumers.md に出力」 |
