# 全域性（Totality）によるコード改善

## 目的
部分関数を全域関数に変換し、型システムを活用してバグに強いコード設計を実現する。

## 基本原則

### 1. 状態を明示的に表現する
- Discriminated Unionで全ての可能な状態を列挙
- 「正常」「エラー」「未初期化」などの状態を型で区別
- インデックスシグネチャの使用を最小限に抑制

### 2. エラーを値として扱う
- 例外による制御フローを避ける
- `Result<T, E>`パターンの採用
- エラーの種類を具体的に型定義

### 3. 入力値の妥当性を型で保証する
- Smart Constructorパターンの活用
- 不正な値の生成を不可能にする
- バリデーション済みの値を型で表現

## 実装指針

### Result型の導入
```typescript
type Result<T, E> = 
  | { success: true; data: T }
  | { success: false; error: E };
```

### エラー型の具体化
```typescript
type SpecificError = 
  | { kind: "fileNotFound"; path: string }
  | { kind: "parseError"; line: number; message: string }
  | { kind: "validationError"; field: string; expected: string };
```

### Smart Constructorの実装
```typescript
class ValidatedValue {
  private constructor(private value: T) {}
  
  static create(input: unknown): Result<ValidatedValue, ValidationError> {
    // バリデーションロジック
    if (isValid(input)) {
      return { success: true, data: new ValidatedValue(input) };
    }
    return { success: false, error: createValidationError(input) };
  }
}
```

## 改善対象の特定

### 危険なパターン
1. `as Type`による強制型変換
2. 例外を無視した空の値返却
3. `any`や`unknown`の多用
4. 戻り値が`undefined`になりうる関数

### 改善すべき関数
1. 戻り値が条件によって異なる型になる関数
2. エラー時に`null`や`undefined`を返す関数
3. 副作用により状態が変化する関数
4. 入力値のバリデーションが不十分な関数

## 段階的改善手順

### Phase 1: 型定義の改善
1. エラー型をDiscriminated Unionで定義
2. Result型を導入
3. 既存の関数の戻り値型を調査

### Phase 2: 関数の全域化
1. 部分関数を特定
2. 戻り値をResult型に変更
3. エラーハンドリングを明示的に実装

### Phase 3: 呼び出し側の対応
1. Result型を適切に処理するコードに変更
2. パターンマッチングによる分岐処理
3. エラーの適切な伝播

## 品質確認項目

### 型安全性
- [ ] 型アサーション（`as`）の使用を最小化
- [ ] 全ての分岐で適切な型が返される
- [ ] コンパイル時に不正な状態を検出可能

### 網羅性
- [ ] switch文でdefaultケースが不要
- [ ] 全てのエラーケースが明示的に処理
- [ ] 未定義動作が存在しない

### 可読性
- [ ] 関数の責務が明確
- [ ] エラーメッセージが具体的
- [ ] 状態の遷移が追跡可能

## 適用範囲
- 設定ファイルの読み込み処理
- データのバリデーション
- 外部APIとの通信
- ファイルシステムの操作
- 任意の失敗する可能性がある処理

## 実装時の注意点
1. 既存のテストケースを維持しながら段階的に変更
2. 型エラーを解決してからロジックの変更を実施
3. エラーメッセージは利用者にとって有用な情報を含める
4. パフォーマンスへの影響を最小限に抑制

この指示書に従い、部分関数を全域関数に変換することで、型システムによる静的検証が可能な堅牢なコードベースを構築する。
