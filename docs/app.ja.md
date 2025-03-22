# アプリケーション設定の概要

アプリケーションの設定ファイル
`breakdown/config/app.yaml` 
を読み込む。相対パス。プロジェクトフォルダからの相対。

# 設定項目
root からyaml形式で記載する。
- working_dir: WorkingDirの設定（必須）
- app_prompt : プロンプトファイルの設定（必須）
  - base_dir : Baseフォルダ
- app_schema : Schemaファイルの設定（必須）
  - base_dir : Baseフォルダ



# 設定項目の詳細
## WorkingDirの設定
設定ファイルに `working_dir: "./.agent/breakdown"` が記載されている。

# 設定項目の項目名ルール
- アプリケーション設定は、定義された項目以外の項目を持つことができない。
- 未定義の項目がある場合は無視される。（YAMLに設定されていても、読み込んだときに項目を削除する）

# 設定読み込み処理の挙動
- アプリケーション設定ファイルが存在しない時、エラーメッセージを出力し、終了する。
- 設定項目の必須が欠けているときは、エラーメッセージを出力し、終了する。

# デフォルト値
デフォルト値はアプリケーション側から求められたら返却するのみ。
このライブラリ内が直接利用するのは、設定ファイルのみ。

- working_dir : "./.agent/breakdown"
- app_prompt : 
  - base_dir : "/breakdown/prompts/app"
- app_schema :
  - base_dir : "/breakdown/schema/app"

