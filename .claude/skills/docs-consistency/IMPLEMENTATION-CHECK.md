# Implementation-to-Docs Verification Details

コンポーネント別にドキュメントと実装の整合性を検証する。

## CLI (`src/cli/`)

CLIフラグとREADMEの一致を確認する。

```bash
grep -r "\.option\|\.flag\|--" src/cli/ --include="*.ts" | grep -oE -- "--[a-z-]+"
grep -oE -- "--[a-z-]+" README.md | sort -u
```

ヘルプテキストソース: `src/cli/args.ts`（定義）、`src/cli/help.ts`（テンプレート）、`mod.ts --help`（出力）

## Agent (`agents/`)

スキーマフィールドとドキュメントの一致を確認する。

```bash
jq -r '.properties | keys[]' agents/schemas/agent.schema.json
grep -oE '\`[a-zA-Z]+\`' agents/README.md | tr -d '`' | sort -u
```

## 多言語ドキュメント (`docs/guides/`)

en/ja のファイル名・コードブロック・見出し数・リンク先が一致することを確認する。

## 自動検証

```bash
deno run -A .claude/skills/docs-consistency/scripts/verify-docs.ts all      # 全検証
deno run -A .claude/skills/docs-consistency/scripts/verify-docs.ts cli      # CLI
deno run -A .claude/skills/docs-consistency/scripts/verify-docs.ts readme   # README同期
deno run -A .claude/skills/docs-consistency/scripts/verify-docs.ts manifest # マニフェスト
```
