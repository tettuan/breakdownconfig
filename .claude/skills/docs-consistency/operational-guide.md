# Docs Consistency Operational Guide

docs-distributionを例に、各フェーズの具体的な出力と手順を示す。

## Phase 1 出力例 — intent memo

```markdown
# tmp/docs-review/docs-distribution-intent.md
What: JSRベースのバージョン管理ドキュメントのローカルインストール
Why: オフライン参照・AIコンテキスト投入・バージョン管理
Design decisions: manifest.json管理、3出力モード(preserve/flatten/single)、meta.jsonからバージョン自動検出
Users need to know: インストールコマンド・オプション、フィルタ(category/lang)、出力モードの違い
```

## Phase 2 出力例 — implementation memo

```markdown
# tmp/docs-review/docs-distribution-implementation.md
Files: src/docs/mod.ts, src/docs/cli.ts
Public API: install(options): Promise<Result>, list(): Promise<Manifest>
Defaults: output="./climpt-docs", mode="preserve"
Edge cases: ネットワークエラー→リトライ、既存ファイル→preserve
```

## 調査コマンド

```bash
ls docs/internal/                                      # Phase 1: 設計docs
grep -r "install\|list" src/docs/ --include="*.ts" -l  # Phase 2: 実装
grep -A 20 "Documentation" README.md                   # Phase 3: 現行docs
deno task verify-docs                                  # Phase 5: 検証
deno task generate-docs-manifest                       # ファイル追加・削除時
```

## 配布範囲

| 配布対象 | 除外 |
|---------|------|
| `docs/guides/en/`, `docs/internal/`, top-level `docs/*.md` | `docs/guides/ja/`, `docs/reference/`, `*.ja.md` |

## 言語ルール

`*.md` は英語必須（JSR配布対象）、`*.ja.md` は日本語（配布対象外）。日本語のみの `.md` → `.ja.md` にリネーム → 英語版作成 → `deno task generate-docs-manifest`。

## メモ後処理

低価値→削除。PR有用→引用。設計記録→`docs/internal/changes/` に昇格。
