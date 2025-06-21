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

### multi-environment
複数環境（PRODUCTION、STAGING、DEVELOPMENT）の設定管理を示すサンプルです。
- カスタム設定セット（prefix）による環境別設定
- 環境ごとの設定値の管理
- 環境間の設定比較機能
- 動的な環境切り替え

詳細は [multi-environment/README.md](./multi-environment/README.md) を参照してください。

## 実行方法

各サンプルは以下のコマンドで実行できます：

```bash
# config-example（必ずexamples/config-exampleディレクトリから実行）
cd examples/config-example
deno run --allow-read --allow-env --allow-write main.ts

# prompt-manager（必ずexamples/prompt-managerディレクトリから実行）
cd examples/prompt-manager
deno run --allow-read --allow-env --allow-write main.ts

# multi-environment（必ずexamples/multi-environmentディレクトリから実行）
cd examples/multi-environment
deno run --allow-read --allow-env --allow-write main.ts
```

**重要**: 各exampleは必ず該当ディレクトリに移動してから実行してください。プロジェクトルートから実行するとERR1001エラーが発生します。

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

## 学習ポイント
1. 各exampleは必ず該当ディレクトリから実行する必要がある
2. ユーザー設定がアプリケーション設定を適切に上書きすることを確認
3. 環境別設定（multi-environment）でprefixによる設定切り替えが正常動作
