# AI時代のコード品質戦略：全域性（Totality）によるバグに強いコード設計

## 概要

この記事は、関数の**全域性（Totality）**という概念を導入し、型システムを活用してバグを未然に防ぐ堅牢なコードを設計する手法について論じている。特にAIによるコード生成が普及する中で、レビュアーの負担を軽減し、コードの品質を自動的に担保する仕組みとして、型による設計が重要であると主張している。

---

## 1. 問題提起：部分関数（Partial Function）

多くのバグは、関数が「ありえない入力値」を想定せずに実装されていることに起因する。取りうる全ての入力パターンの一部に対してしか正しく動作しない関数を**部分関数**と呼ぶ。

### 例：不完全な割引計算の実装

割引には「パーセント割引」と「固定額割引」の2種類が存在すると仮定する。

```typescript
// 悪い例：仕様上ありえない状態を型として表現できてしまう
interface Discount {
  rate?: number;         // パーセント割引率
  upperLimit?: number;   // 上限額
  fixedAmount?: number;  // 固定割引額
}

const getDiscountAmount = (subtotal: number, discount: Discount): number => {
  // rateプロパティがあればパーセント割引と解釈
  if (discount.rate !== undefined) {
    return Math.min(
      subtotal,
      discount.upperLimit ?? Infinity,
      subtotal * discount.rate,
    );
  }
  // fixedAmountプロパティがあれば固定額割引と解釈
  if (discount.fixedAmount !== undefined) {
    return Math.min(subtotal, discount.fixedAmount);
  }
  // どちらでもない場合、関数は値を返せずエラーを引き起こす（部分関数）
}

// この型定義では、以下のような不正な値が許容されてしまう
const illegal1: Discount = {}; // 割引方法が不明
const illegal2: Discount = { rate: 0.1, fixedAmount: 1000 }; // 2つの割引方法が混在
```

この実装の問題点は、`Discount`型が「仕様上ありえない状態」（例：割引方法が未指定、両方の割引が混在）を表現できてしまうことにある。その結果、`getDiscountAmount`関数は、呼び出し側が「正しい形の`Discount`オブジェクトを渡す」という暗黙の前提に依存しており、自己完結していない。

---

## 2. 解決策：全域関数（Total Function）とDiscriminated Union

この問題を解決するためには、関数を**全域関数**（全ての入力パターンで正しく定義されている関数）にする必要がある。そのための最も強力な手法が **Discriminated Union（判別可能なユニオン型）**である。

これは、状態を**直和型（Sum Type）**で表現し、不正な状態を型レベルで排除するアプローチである。

### 実装例：Discriminated Unionによる改善

各割引タイプを明確に別の型として定義し、それらを `|`（Union）で結合する。`kind`のような共通のプロパティ（discriminator）で、どの型かを判別できるようにするのが特徴である。

```typescript
// 各割引タイプを明確に定義
interface PercentageDiscount {
  kind: "percentage"; // 型を判別するためのタグ
  rate: number;
  upperLimit: number;
}

interface FixedDiscount {
  kind: "fixed"; // 型を判別するためのタグ
  fixedAmount: number;
}

// 2つの割引タイプを結合した「直和型」
type Discount = PercentageDiscount | FixedDiscount;

// 全域関数として実装
const getDiscountAmount = (subtotal: number, discount: Discount): number => {
  switch (discount.kind) { // `kind`プロパティで分岐する
    case "percentage":
      // このブロック内では、discountはPercentageDiscount型として推論される
      return Math.min(subtotal, discount.upperLimit, subtotal * discount.rate);

    case "fixed":
      // このブロック内では、discountはFixedDiscount型として推論される
      return Math.min(discount.fixedAmount, subtotal);
  }
  // switch文が全てのケースを網羅していることをコンパイラがチェックする。
  // 将来、新しい割引（例: TimeSaleDiscount）が追加された場合、
  // このswitch文にcaseを追加しない限りコンパイルエラーとなり、修正漏れを防げる。
};
```

### メリット

1.  **不正な状態の排除**: 「パーセント割引と固定額割引のプロパティが混在する」といった不正なオブジェクトは、型定義上作成不可能になる。
2.  **網羅性のチェック**: `switch`文で分岐する際、コンパイラが全てのパターンを網羅しているかチェックしてくれる。将来、`Discount`型に新しい種類を追加したときに、関連する処理の修正漏れを防ぐことができる。
3.  **高い可読性**: データ構造がビジネスルールをそのまま反映するため、コードが自己説明的になる。

---

## 3. 型で表現しきれないルールのための「Smart Constructor」

「割引率は0以上1未満」のような、型だけでは表現しきれないビジネスルールも存在する。このような値のバリデーションには、**Smart Constructor**というデザインパターンが有効である。

これは、クラスのコンストラクタを`private`にし、代わりにバリデーションロジックを持つ静的なファクトリメソッド経由でのみインスタンスを生成させる手法である。

### 実装例：値の範囲を保証する型

```typescript
class Ratio {
  // privateなプロパティで、他のオブジェクトと区別される「Nominal Type」を実現
  #__nominal: unknown;
  // コンストラクタをprivateにして、直接のインスタンス化を禁止
  private constructor(readonly value: number) {}

  // バリデーションを行い、成功した場合のみインスタンスを返す静的メソッド
  static create(value: number): Ratio | null {
    const isValid = 0 < value && value < 1;
    return isValid ? new Ratio(value) : null;
  }
}

// 使用例
const validRatio = Ratio.create(0.1); // Ratioのインスタンスが返る
const invalidRatio = Ratio.create(1.5); // nullが返る

// Ratio型の値を受け取る関数は、その値が常に 0 < value < 1 を満たすと保証される
function applyRatio(ratio: Ratio) {
  // この関数内ではバリデーション不要
  console.log(ratio.value);
}
```

このパターンにより、`Ratio`型の値は常に有効であることが保証され、関数間で値を引き回す際に都度バリデーションを行う必要がなくなる。

---

## まとめ：実装への応用

-   **関数の責務を明確化する**: 関数が扱うデータの状態を洗い出し、ありえない状態を排除するように型を設計する。
-   **状態の分岐は`if`ではなくDiscriminated Unionで表現する**: `type A = { kind: 'A', ... } | { kind: 'B', ... }`のように、データの種類をタグで明示し、`switch`文で網羅的に処理する。これにより、ロジックの追加・変更時の修正漏れをコンパイラに検知させることができる。
-   **値のバリデーションはSmart Constructorに集約する**: 不正な値を持つインスタンスの生成を防ぎ、型によって値の正しさを保証する。

これらの手法を用いることで、型システムを最大限に活用し、自己完結的でバグに強く、変更容易性の高いコードを実装できる。
