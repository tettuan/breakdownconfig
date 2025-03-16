# 概要
このアプリケーションは、Denoのライブラリである。
https://deno.land/x に登録する。

## Usage
breakdownconfig を 第三者アプリケーションが import すると、設定ファイルの読み込み処理を行うことができる。

### アプリケーションからの読み込み
`import BraekdownConfig from "https://deno.land/x/breakdownconfig/mod.ts";


### アプリケーションでの利用例

```typescript
let config = new BraekdownConfig();
```

### クラス名
**BreakdownConfig** 


## 設定ファイルの種類
設定ファルの種類は2つあり、
1. アプリケーションのデフォルト設定
2. アプリケーションインストール後のユーザー設定
の2つである。

BraekdownConfig は2種類の設定ファイルを読み込み、統合する。

例えば、
```typescript
let config = new BraekdownConfig();
```
と宣言した config は、 アプリケーションの設定ファイルを読み込み、その後ユーザー設定ファイルを読み込む。
アプリケーション設定よりもユーザー設定を優先する。

### 読み込み処理のドキュメント参照
以下のファイルに記載されている。
- `app.ja.md` : アプリケーションデフォルト設定ファイルについて記載されている。
- `user.ja.md` : ユーザー設定ファイルについて記載されている。

