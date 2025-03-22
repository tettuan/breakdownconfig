# Prompt Manager

マルチプロンプト管理アプリケーションのサンプルです。
breakdownconfigライブラリを使用して、プロンプトファイルとスキーマファイルを管理します。

## 機能
- プロンプトファイルの管理
- スキーマファイルの管理
- アプリケーション設定とユーザー設定の統合
- パス安全性の検証

## ディレクトリ構造
```
.
├── src/
│   ├── prompt_manager.ts  # プロンプト管理クラス
│   └── schema_manager.ts  # スキーマ管理クラス
├── config/
│   ├── app.yml           # アプリケーション設定
│   └── user.yml          # ユーザー設定
├── prompts/
│   ├── app/             # アプリケーションのデフォルトプロンプト
│   │   └── default.txt
│   └── user/            # ユーザーカスタマイズプロンプト
│       └── custom.txt
└── schema/
    ├── app/             # アプリケーションのデフォルトスキーマ
    │   └── default.json
    └── user/            # ユーザーカスタマイズスキーマ
        └── custom.json
```

## 使用方法

### 1. 初期化
```typescript
import { BreakdownConfig } from "@tettuan/breakdownconfig";
import { PromptManager } from "./src/prompt_manager";

const config = new BreakdownConfig();
const promptManager = new PromptManager(config);
```

### 2. プロンプトの取得
```typescript
// デフォルトプロンプトの取得
const defaultPrompt = await promptManager.getPrompt("default");

// カスタムプロンプトの取得
const customPrompt = await promptManager.getPrompt("custom");
```

### 3. スキーマの取得
```typescript
// デフォルトスキーマの取得
const defaultSchema = await promptManager.getSchema("default");

// カスタムスキーマの取得
const customSchema = await promptManager.getSchema("custom");
```

## 設定ファイル

### アプリケーション設定 (app.yml)
```yaml
working_dir: "./.manager"
app_prompt:
  base_dir: "./prompts/app"
app_schema:
  base_dir: "./schema/app"
```

### ユーザー設定 (user.yml)
```yaml
app_prompt:
  base_dir: "./prompts/user"
app_schema:
  base_dir: "./schema/user"
```

## エラーハンドリング
- 設定ファイルが存在しない場合のエラー処理
- パス検証エラーの処理
- ファイルアクセス権限エラーの処理

## テスト
このサンプルアプリケーションは、breakdownconfigのテストケースとしても機能します。
実際の利用シナリオに基づいたテストを提供します。 