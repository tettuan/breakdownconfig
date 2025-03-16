# アプリケーション設定の概要

アプリケーションの設定ファイル
`/breakdown/config/app.json` 
を読み込む。

# 設定項目
root からyaml形式で記載する。
- working_dir: WorkingDirの設定（必須）
- app_prompt : プロンプトファイルの設定（必須）
  - base_dir : Baseフォルダ
- app_schema : Schemaファイルの設定（必須）
  - base_dir : Baseフォルダ



# 設定項目の詳細
## WorkingDirの設定
設定ファイルに `{"working_dir": "./.agent/breakdown"}` が記載されている。


# 設定読み込み処理の挙動
- アプリケーションの設定ファイルが存在しない時、エラーメッセージを出力する。
- 設定項目の必須が欠けているときは、エラーメッセージを出力する。

