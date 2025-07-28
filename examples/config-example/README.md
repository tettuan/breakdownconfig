# Configuration Example

このサンプルは、breakdownconfigライブラリを使用した基本的な設定ファイルの読み込みと使用方法を示します。

## 機能

- アプリケーション設定の読み込み
- パスの検証と解決
- エラーハンドリング
- ログ出力

## ディレクトリ構造

```
config-example/
├── .agent/
│   └── breakdown/
│       └── config/
│           ├── app.yaml    # アプリケーション設定
│           └── user.yaml   # ユーザー設定（オプション）
├── prompts/
│   └── app/               # アプリケーションプロンプト
└── schema/
    └── app/               # アプリケーションスキーマ
```

## 設定ファイル

### app.yaml

```yaml
working_dir: ./.agent/clipmt
app_prompt:
  base_dir: ./prompts/app
app_schema:
  base_dir: ./schema/app
```

### user.yaml（オプション）

```yaml
app_prompt:
  base_dir: ./prompts/user
app_schema:
  base_dir: ./schema/user
```

## 実行方法

```bash
deno run --allow-read --allow-env --allow-write main.ts
```

## 必要な権限

- `--allow-read`: 設定ファイルの読み込み
- `--allow-env`: 環境変数の読み込み
- `--allow-write`: ディレクトリの作成

## 出力例

```
=== Configuration Example ===
Working Directory: /path/to/.agent/clipmt
App Prompt Base Directory: /path/to/prompts/app
App Schema Base Directory: /path/to/schema/app
```

## エラーハンドリング

- 設定ファイルが存在しない場合
- パスが無効な場合
- ディレクトリの作成に失敗した場合

## ログ出力

- 設定の読み込み状況
- パスの検証結果
- エラー情報
