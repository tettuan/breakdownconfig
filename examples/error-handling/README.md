# Error Handling Example

Result型APIとErrorGuardsによるエラーハンドリングを示すサンプルです。

## 既存examplesとの違い

| Example | パターン |
|---------|----------|
| config-example | throw/catch |
| prompt-manager | throw/catch |
| multi-environment | throw/catch |
| **error-handling** | **Result型 (Safe API)** |

## デモ内容

1. **Safe APIによるハッピーパス** — `loadConfigSafe()` / `getConfigSafe()` / `getWorkingDirSafe()`
2. **Result.match / Result.map / Result.unwrapOr** — 関数合成パターン
3. **不正プロファイル名の検出** — `CONFIG_VALIDATION_ERROR`
4. **loadConfig前アクセスの検出** — `CONFIG_NOT_LOADED`
5. **存在しない設定ファイルの検出** — `CONFIG_FILE_NOT_FOUND`
6. **ErrorGuardsによる網羅的分岐** — エラー種別ごとのユーザーメッセージ生成

## ディレクトリ構造

```
error-handling/
├── .agent/
│   └── climpt/
│       └── config/
│           └── app.yml    # アプリケーション設定
├── main.ts
└── README.md
```

## 実行方法

```bash
cd examples/error-handling
deno run --allow-read --allow-env --allow-write main.ts
```
