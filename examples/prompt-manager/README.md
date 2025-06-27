# Prompt Manager Example

このサンプルは、breakdownconfigライブラリを使用したプロンプトとスキーマファイルの管理方法を示します。

## 機能

- プロンプトとスキーマファイルの管理
- アプリケーション設定とユーザー設定の統合
- ディレクトリ構造の自動生成
- エラーハンドリング
- ログ出力

## ディレクトリ構造

```
prompt-manager/
├── .agent/
│   └── breakdown/
│       └── config/
│           ├── app.yaml    # アプリケーション設定
│           └── user.yaml   # ユーザー設定（オプション）
├── prompts/
│   ├── app/               # アプリケーションプロンプト
│   └── user/              # ユーザープロンプト（オプション）
└── schema/
    ├── app/               # アプリケーションスキーマ
    └── user/              # ユーザースキーマ（オプション）
```

## 設定ファイル

### app.yaml

```yaml
working_dir: ./.agent/breakdown
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

- `--allow-read`: 設定ファイルとプロンプト/スキーマファイルの読み込み
- `--allow-env`: 環境変数の読み込み
- `--allow-write`: ディレクトリの作成

## 出力例

```
=== Prompt Manager Example ===
Working Directory: /path/to/.agent/breakdown
App Prompt Base Directory: /path/to/prompts/app
App Schema Base Directory: /path/to/schema/app
User Prompt Base Directory: /path/to/prompts/user
User Schema Base Directory: /path/to/schema/user
```

## エラーハンドリング

- 設定ファイルが存在しない場合
- パスが無効な場合
- ディレクトリの作成に失敗した場合
- プロンプト/スキーマファイルの読み込みに失敗した場合

## ログ出力

- 設定の読み込み状況
- パスの検証結果
- プロンプト/スキーマファイルの読み込み状況
- エラー情報
