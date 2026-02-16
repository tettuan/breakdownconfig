# 概要

このアプリケーションは、Denoのライブラリである。
https://jsr.io/@tettuan/breakdownconfig に登録する。

## 目的1: 設定ファイルの統合管理システムの提供

第三者アプリケーションが複数の設定ファイル（アプリ設定・ユーザー設定）を簡単に統合して利用できる環境を提供する。

### 目的2: 標準とユーザー設定の2段階設定の提供

利用者は、アプリケーションのデフォルト設定とユーザーごとのカスタム設定を分けて管理でき、システムはユーザー設定を優先した統合後の設定を提供する。

#### 目的3: 設定ファイル管理の開発を不要にする

利用者は、設定ファイルを用意し、BreakdownConfigを用いるだけで設定を安全に取得できる。
設定ファイルの読み込み処理を開発する必要がなくなる。

##### 目的4: 堅牢なエラー処理とバリデーションの実装

設定ファイルの管理そのものを堅牢にする。
エラー定義を種類毎に明確化し、利用者がエラーを理解できる状態を作る。
ユーザー設定ファイルは項目を事前定義せず自由度を持たせる。代わりに設定へのバリデーション機能を提供し、堅牢にする。

利用者
- [A] BreakdownConfigを利用するアプリケーション
- [B] Aを利用する実ユーザー
に対し、A向けに A-a.柔軟な設定の許容、A-b.バリデーション機能の提供を行う。Aから型定義をもらい設定を検証する。
Bは、A-aによって設定しやすく、かつA-bにより誤りに気づく。

## Usage

breakdownconfig を 第三者アプリケーションが import すると、設定ファイルの読み込み処理を行うことができる。

### アプリケーション利用者のUssage

- デフォルト設定はアプリ設定を用いる
- ユーザーごとに設定を切り替える場合は、ユーザー設定を設ける
- ユーザー設定は、アプリ設定の `working_dir` 項目で設定されたディレクトリに存在する

### アプリケーションからの読み込み

```typescript
import { BreakdownConfig } from "@tettuan/breakdownconfig";
```

### アプリケーションでの利用例

```typescript
// デフォルトプロファイルの使用
let config = new BreakdownConfig();

// 名前付きプロファイルの使用
let prodConfig = new BreakdownConfig("production");

// カスタムベースディレクトリの指定
let customConfig = new BreakdownConfig(undefined, "/path/to/project");

// 名前付きプロファイル + カスタムベースディレクトリの組み合わせ
let envConfig = new BreakdownConfig("staging", "/path/to/project");
```

### クラス名

**BreakdownConfig**

## 設定ファイルの読み込みフロー

BreakdownConfigは以下の順序で設定ファイルの読み込み処理を実行する：

1. **初期化時のプロファイル識別**: コンストラクタで設定プロファイル名（デフォルト or 名前付き）を判定
2. **ベースディレクトリの決定**: コンストラクタの第2引数で指定されたベースディレクトリ、または現在の作業ディレクトリを特定
3. **アプリケーション設定ファイルの読み込み**: `{ベースディレクトリ}/.agent/climpt/config/app.yml` または `{ベースディレクトリ}/.agent/climpt/config/{プロファイルプレフィックス}-app.yml` を必須ファイルとして読み込み
4. **working_dirの特定**: アプリケーション設定ファイルから `working_dir` の値を取得してユーザー設定ファイルの基準パスを決定
5. **ユーザー設定ファイルの読み込み**: `{working_dir}/.agent/climpt/config/user.yml` または `{working_dir}/.agent/climpt/config/{プロファイルプレフィックス}-user.yml` をオプションファイルとして読み込み
6. **設定値の統合**: アプリケーション設定ファイルを基準として、ユーザー設定ファイルの値で同一キーを上書き統合
7. **統合結果の提供**: 最終的な設定オブジェクトをアプリケーションに返却

## 設定ファイルの種類

設定ファイルの種類は以下の通りである：

### デフォルトプロファイル

1. **アプリケーション設定ファイル（app.yml）**: アプリケーションのデフォルト設定
2. **ユーザー設定ファイル（user.yml）**: ユーザーによるカスタマイズ設定

### 名前付きプロファイル

1. **アプリケーション設定ファイル（{プロファイルプレフィックス}-app.yml）**: 名前付きプロファイルのアプリケーション設定
2. **ユーザー設定ファイル（{プロファイルプレフィックス}-user.yml）**: 名前付きプロファイルのユーザー設定

BreakdownConfig は指定された設定プロファイル名に基づいて、対応するアプリケーション設定ファイルとユーザー設定ファイルの組み合わせを読み込み、統合する。

### 名前付きプロファイルの要件と仕様

#### 目的

- 同一アプリケーション内で複数の設定プロファイルを管理
- 環境別設定（development, staging, production）の実現
- 機能別設定の分離管理

#### 名前付きプロファイルの読み込み方法

**基本的な使用方法**：

```typescript
// デフォルトプロファイルの読み込み（従来通り）
let config = new BreakdownConfig();
// → {ベースディレクトリ}/.agent/climpt/config/app.yml と {working_dir}/.agent/climpt/config/user.yml を読み込み

// 名前付きプロファイルの読み込み
let devConfig = new BreakdownConfig("development");
// → {ベースディレクトリ}/.agent/climpt/config/development-app.yml と {working_dir}/.agent/climpt/config/development-user.yml を読み込み

let prodConfig = new BreakdownConfig("production");
// → {ベースディレクトリ}/.agent/climpt/config/production-app.yml と {working_dir}/.agent/climpt/config/production-user.yml を読み込み
```

#### ファイル命名規則

| 設定プロファイル名         | アプリケーション設定ファイル    | ユーザー設定ファイル                           |
| -------------------- | --------------------- | ---------------------------------------------- |
| 未指定（デフォルトプロファイル） | `{ベースディレクトリ}/.agent/climpt/config/app.yml`             | `{working_dir}/.agent/climpt/config/user.yml`             |
| "development"        | `{ベースディレクトリ}/.agent/climpt/config/development-app.yml` | `{working_dir}/.agent/climpt/config/development-user.yml` |
| "production"         | `{ベースディレクトリ}/.agent/climpt/config/production-app.yml`  | `{working_dir}/.agent/climpt/config/production-user.yml`  |
| "{任意の名前}"           | `{ベースディレクトリ}/.agent/climpt/config/{任意の名前}-app.yml`    | `{working_dir}/.agent/climpt/config/{任意の名前}-user.yml`    |

#### 抽象化レベルでの解釈

**設定プロファイル識別子の概念**：

- **未指定時**: デフォルトプロファイル（プロファイルプレフィックスなし）として扱う
- **指定時**: 名前付きプロファイル（指定文字列をプロファイルプレフィックスとする）として扱う
- **プロファイルプレフィックス適用ルール**: `{プロファイルプレフィックス}-{type}.yml` の形式で両ファイルに一貫適用

この設計により、設定ファイルの命名と読み込みロジックを統一的に管理でき、新しい設定プロファイルの追加が容易になる。

BreakdownConfig は2種類の設定ファイルを読み込み、統合する。

例えば、

```typescript
// デフォルトプロファイルの場合
let config = new BreakdownConfig();
// → {ベースディレクトリ}/.agent/climpt/config/app.yml と {working_dir}/.agent/climpt/config/user.yml を読み込み

// 名前付きプロファイルの場合
let devConfig = new BreakdownConfig("development");
// → {ベースディレクトリ}/.agent/climpt/config/development-app.yml と {working_dir}/.agent/climpt/config/development-user.yml を読み込み
```

と宣言した config は、指定された設定プロファイルのアプリケーション設定ファイルを読み込み、その後対応するユーザー設定ファイルを読み込む。
設定値は、アプリケーション設定ファイルよりもユーザー設定ファイルを優先する。（アプリケーション設定値をユーザー設定値で上書きする）

### 設定ごとの仕様説明

以下のファイルに記載されている。

- `./app.ja.md` : アプリケーション設定ファイルについて記載されている。
- `./user.ja.md` : ユーザー設定ファイルについて記載されている。

# 設定ファイルの読み込み

## デフォルトプロファイルの読み込み

1. **アプリケーション設定ファイル（app.yml）**

- パス `{ベースディレクトリ}/.agent/climpt/config/app.yml` から読み込み
- 必須。省略できない。
- 設定ファイルが存在しない場合はエラーで終了する。
- `working_dir` 設定がユーザー設定ファイルの起点ディレクトリとなる。

2. **ユーザー設定ファイル（user.yml）**

- パス `{working_dir}/.agent/climpt/config/user.yml` から読み込み
- 存在がなくても正常処理とする。（warning出力を行うのみ）
- 設定値を読み込み、同一キーのアプリケーション設定値を上書きする。
  - ユーザー設定ファイルは必要な設定のみ記述できる。全ての項目が任意である。

## 名前付きプロファイルの読み込み

1. **アプリケーション設定ファイル（{プロファイルプレフィックス}-app.yml）**

- パス `{ベースディレクトリ}/.agent/climpt/config/{プロファイルプレフィックス}-app.yml` から読み込み
- 必須。省略できない。
- 設定ファイルが存在しない場合はエラーで終了する。
- `working_dir` 設定がユーザー設定ファイルの起点ディレクトリとなる。
- プロファイルプレフィックスはコンストラクタで指定された設定プロファイル名を使用。

2. **ユーザー設定ファイル（{プロファイルプレフィックス}-user.yml）**

- パス `{working_dir}/.agent/climpt/config/{プロファイルプレフィックス}-user.yml` から読み込み
- 存在がなくても正常処理とする。（warning出力を行うのみ）
- 設定値を読み込み、同一キーのアプリケーション設定値を上書きする。
  - ユーザー設定ファイルは必要な設定のみ記述できる。全ての項目が任意である。

## 設定プロファイルの選択ルール

- **未指定時**: デフォルトプロファイル（{ベースディレクトリ}/.agent/climpt/config/app.yml, {working_dir}/.agent/climpt/config/user.yml）を使用
- **指定時**: 指定されたプロファイルプレフィックスを持つ名前付きプロファイル（{ベースディレクトリ}/.agent/climpt/config/{プロファイルプレフィックス}-app.yml, {working_dir}/.agent/climpt/config/{プロファイルプレフィックス}-user.yml）を使用
- **プロファイルプレフィックス制約**: 英数字とハイフンのみ使用可能（例：development, prod-v2）

## 設定ファイルの作成責任

- `new BreakdownConfig()` または `new BreakdownConfig("{プロファイル名}")` したアプリケーションが責任を持って初期ファイル作成する。
  - アプリケーションが必要な設定値を知るために、BreakdownConfigはデフォルト値を返すことはできる（ファイルは作成しない）。
  - 名前付きプロファイルの場合も同様に、アプリケーション側で対応する設定ファイルを作成する責任を持つ。

## 設定値の統合責任

- このライブラリが担う。
- 複数の設定ファイルを順序よく読み込み、値を上書き統合する。

# テスト

`./tests.ja.md` を参照すること。

# エラー処理

- エラーメッセージは、システムとテストで共有できるよう一元化したエラーメッセージ管理を行う。

# バリデーション

設定ファイルの読み込み時に、設定ファイルのバリデーションを行う。

- ディレクトリの存在確認
- パスの形式チェック

設定ファイルを読み込んだのちに、設定ファイルの値をバリデーションする。
（設定値の種類を事前把握できている項目のみ。）

- 設定されたディレクトリの存在確認
- パスの形式チェック

## アプリケーション側へのバリデーションインターフェイスの提供

- ディレクトリ（PATH）の検証インターフェイス
  - 設定値がディレクトリ記述として正しいか？
- ファイルの存在の検証インターフェイス
  - 設定値に基づくファイルが存在するか？

# BreakdownLogger

- テストコードのみデバッグする。
- 公開対象のライブラリのコードは、テストを通じてデバッグされる。
  - 公開用のコードのデバッグが必要な場合、必要なデバッグのためのテストコードを追加する。

## ログ出力の仕様

- エラー管理（ErrorManager）でログ出力を行う
- ログレベル（値が大きいほど重要度が高い）:
  - DEBUG (0): デバッグ情報（テスト環境のみ）
  - INFO (1): 通常の情報（デフォルト）
  - WARN (2): 警告情報
  - ERROR (3): エラー情報（常に表示、stderr出力）
- ログ出力は構造化データとして出力される（LogEntry: timestamp, key, level, message, data）
- 環境変数による制御:
  - `LOG_LEVEL`: 重要度の閾値 (`debug`, `info`, `warn`, `error`)
  - `LOG_KEY`: ロガーキーでフィルタ (カンマ区切り、例: `dataflow,security`)
  - `LOG_LENGTH`: 出力長 (`S`=160文字, `L`=300文字, `W`=無制限, デフォルト=80文字)
