# docs-consistency skill

実装とドキュメントの整合性を検証するスキル。

## 関連スキルとのフロー

```
機能実装 → update-docs → docs-consistency → release-procedure
```

## 自動検証

```bash
deno task verify-docs                  # 全チェック
deno task verify-docs cli|readme|manifest|agents  # 個別チェック
deno task generate-docs-manifest       # ファイル追加・削除後に再生成
```
