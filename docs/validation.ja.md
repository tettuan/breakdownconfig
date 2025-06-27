# 設定ファイルのバリデーション
`docs/index.ja.md` および `docs/glosarry.ja.md` を事前理解してから読むこと。

## アプリケーション設定ファイルのバリデーション

- 必須項目と事前定義項目が指定されている
- 項目定義を、BreakdowonConfig 自体が知っている
- 知っている情報に基づいて、BreakdowonConfig自身だけでバリデーションする
- 値は評価しない（PATHが存在するか、ファイルが存在するか、読み込めるか、など。形式チェックのみ行う）


## ユーザー設定ファイルのバリデーション

評価実行Interface: 
- 設定を評価するための、型定義を受け取る
- 設定をバリデーションするための、初期ノードを指定する。
- 例:
  ```ts
  const c = new BreakdownConfig("profilename")
  // 成功時: { ok: true; data: ValidatedConfig }
  // 失敗時: { ok: false; error: ValidationError }
  validated = c.validate(node: 'params.two', ConfigParamsType);
  ```

  ```profilename-user.yml
  params:
    two:
      demonstrativeType:
        pattern: "^(to|summary|defect|find)$"
      layerType:
        pattern: "^(project|issue|task|bugs)$"
  ```

  ```ts
  interface ConfigParamsType {
    demonstrativeType: {
      pattern: string;
    };
    layerType: {
      pattern: string;
    };
  }
  ```

### 型定義エラーを返す
型定義エラーは、 BreakdownConfig に定義されたエラー型を使う。

エラー定義は、`docs/index.ja.md` や `docs/glosarry.ja.md` を参照する。


# バリデーションの方法

基本的に、型定義に基づいて行う。


## PATHバリデーション
- ファイルPATHやファイル名の記述は、全域性原則を取り入れて、PATHパターンを網羅した型定義を行う
  - 相対パス、ファイルパス、ディレクトリパス、絶対パス、カレント表記
- パス種別ごとに異なる処理ロジックを適用するため、`kind`による分類を行う
  - `relative_*`: CWDとの結合処理が必要
  - `current_directory`: CWDそのものを使用（結合不要）
  - `absolute`: CWD結合不要、そのまま使用

```typescript
type PathType = 
  | { kind: 'relative_file'; path: string }      // './file.txt', '../dir/file.txt'
  | { kind: 'relative_directory'; path: string } // './dir', '../dir'
  | { kind: 'current_directory'; path: '.' | './' }
  | { kind: 'absolute'; path: string }           // '/absolute/path'
```

# バリデーション項目

渡された型定義に基づき、以下を評価する。型定義通りに評価する。

- YAML構文の妥当性
- 必須項目の存在確認
- パス文字列の形式チェック（相対パス/絶対パスの記法）
- 設定値の型チェック（string, number, boolean等）

# バリデーション実行タイミング

BreakdownConfig を利用するアプリケーションが、呼び出したとき。
呼ばれなければバリデーションはされない。


