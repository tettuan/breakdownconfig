# Examples

このディレクトリには、breakdownconfigライブラリの使用例が含まれています。

## サンプルアプリケーション

### config-example
基本的な設定ファイルの読み込みと使用方法を示すサンプルです。
- アプリケーション設定の読み込み
- パスの検証と解決
- エラーハンドリング
- ログ出力

詳細は [config-example/README.md](./config-example/README.md) を参照してください。

### prompt-manager
マルチプロンプト管理アプリケーション。
プロンプトファイルとスキーマファイルを、アプリケーション設定とユーザー設定で管理するサンプルです。
- アプリケーション設定とユーザー設定の統合
- ディレクトリ構造の自動生成
- パスの検証と解決
- エラーハンドリング
- ログ出力

詳細は [prompt-manager/README.md](./prompt-manager/README.md) を参照してください。

## 実行方法

各サンプルは以下のコマンドで実行できます：

```bash
# config-example
deno run --allow-read --allow-env --allow-write examples/config-example/main.ts

# prompt-manager
deno run --allow-read --allow-env --allow-write examples/prompt-manager/main.ts
```

## 共通の機能

各サンプルでは以下の機能を実装しています：

1. **設定の読み込み**
   - アプリケーション設定の読み込み
   - ユーザー設定の読み込み（オプション）
   - 設定値の統合

2. **パスの検証と解決**
   - URL APIを使用したパスの解決
   - ディレクトリトラバーサル対策
   - 相対パスの解決

3. **エラーハンドリング**
   - 設定ファイルの存在確認
   - パスの検証
   - エラーメッセージの構造化

4. **ログ出力**
   - 構造化ログの出力
   - ログレベルの制御
   - 環境変数による設定 