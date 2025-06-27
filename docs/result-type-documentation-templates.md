# Result型関数のドキュメントテンプレート

## 概要
このドキュメントは、Result型を使用する関数のコメントテンプレートと、エラー型の説明文案を提供します。

## 関数コメントテンプレート

### 1. Result型を返す関数の基本テンプレート

```typescript
/**
 * [関数の目的を簡潔に記述]
 * 
 * @param paramName - [パラメータの説明]
 * @returns Success: [成功時に返される値の説明]
 * @returns Failure: [失敗時に返されるエラーの種類と条件]
 * 
 * @example
 * ```typescript
 * const result = await functionName(param);
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
```

### 2. 設定ファイル読み込み関数のテンプレート

```typescript
/**
 * [設定ファイルの種類]設定ファイルを読み込み、バリデーションを実行します
 * 
 * @param filePath - 読み込む設定ファイルのパス
 * @returns Success<T>: バリデーション済みの設定オブジェクト
 * @returns Failure<ConfigError>: 以下のエラーのいずれか
 *   - FileNotFoundError: ファイルが存在しない場合
 *   - ParseError: YAML/JSONの構文エラーがある場合
 *   - ValidationError: 設定値が期待される型や制約を満たさない場合
 * 
 * @example
 * ```typescript
 * const configResult = await loadAppConfig("./config.yaml");
 * if (configResult.success) {
 *   // Type-safe access to config
 *   const config: AppConfig = configResult.data;
 * } else {
 *   switch (configResult.error.kind) {
 *     case "fileNotFound":
 *       console.error(`File not found: ${configResult.error.path}`);
 *       break;
 *     case "parseError":
 *       console.error(`Parse error at line ${configResult.error.line}`);
 *       break;
 *     // ... handle other error types
 *   }
 * }
 * ```
 */
```

### 3. バリデーション関数のテンプレート

```typescript
/**
 * [検証対象]の妥当性を検証し、型安全な値を返します
 * 
 * @param input - 検証する入力値
 * @returns Success<ValidatedType>: 検証済みの型安全な値
 * @returns Failure<ValidationError>: バリデーションエラーの詳細
 * 
 * @remarks
 * この関数はSmart Constructorパターンを実装し、不正な値の生成を防ぎます
 * 
 * @example
 * ```typescript
 * const validated = validateConfigPath(userInput);
 * if (!validated.success) {
 *   console.error(
 *     `Validation failed for field '${validated.error.field}': ` +
 *     `expected ${validated.error.expectedType}, got ${typeof validated.error.value}`
 *   );
 * }
 * ```
 */
```

### 4. 変換関数のテンプレート

```typescript
/**
 * [入力型]を[出力型]に変換します
 * 
 * @param source - 変換元のデータ
 * @returns Success<TargetType>: 変換成功時の結果
 * @returns Failure<ConversionError>: 変換失敗時のエラー情報
 * 
 * @remarks
 * 全域関数として実装され、すべての入力に対して定義された結果を返します
 */
```

## エラー型の説明文案

### FileNotFoundError
```typescript
/**
 * ファイルが見つからない場合のエラー
 * 
 * @property kind - エラーの種類識別子 ("fileNotFound")
 * @property path - 見つからなかったファイルのパス
 * @property message - ユーザー向けのエラーメッセージ
 * 
 * @remarks
 * このエラーは、指定されたパスにファイルが存在しない場合に発生します。
 * パスが正しいか、ファイルが配置されているかを確認してください。
 */
```

### ParseError
```typescript
/**
 * ファイル内容の解析エラー
 * 
 * @property kind - エラーの種類識別子 ("parseError")
 * @property path - エラーが発生したファイルのパス
 * @property line - エラーが発生した行番号
 * @property column - エラーが発生した列番号
 * @property message - 構文エラーの詳細説明
 * 
 * @remarks
 * YAML/JSONなどの構造化データの構文が不正な場合に発生します。
 * エラーメッセージと位置情報を参考に、構文を修正してください。
 */
```

### ValidationError
```typescript
/**
 * 設定値の検証エラー
 * 
 * @property kind - エラーの種類識別子 ("validationError")
 * @property field - エラーが発生したフィールド名
 * @property value - 実際に提供された値
 * @property expectedType - 期待される型または制約の説明
 * @property message - 追加のエラー詳細（オプション）
 * 
 * @remarks
 * 設定値が期待される型や制約条件を満たさない場合に発生します。
 * expectedTypeの情報を参考に、正しい値を設定してください。
 */
```

### PathError
```typescript
/**
 * パス関連のエラー
 * 
 * @property kind - エラーの種類識別子 ("pathError")
 * @property path - 問題のあるパス文字列
 * @property reason - エラーの具体的な理由
 * @property message - 追加の説明（オプション）
 * 
 * @remarks
 * パスに関する以下の問題で発生します：
 * - pathTraversal: ディレクトリトラバーサル（../)が検出された
 * - absoluteNotAllowed: 絶対パスが許可されていない場所で使用された
 * - invalidCharacters: 使用できない文字が含まれている
 * - tooLong: パスが長すぎる
 * - empty: 空のパスが指定された
 */
```

### UnknownError
```typescript
/**
 * 予期しないエラー
 * 
 * @property kind - エラーの種類識別子 ("unknownError")
 * @property message - エラーの説明
 * @property originalError - 元のエラーオブジェクト（デバッグ用）
 * 
 * @remarks
 * 想定外のエラーが発生した場合のフォールバック。
 * このエラーが頻繁に発生する場合は、具体的なエラー型の追加を検討してください。
 */
```

## Result型ヘルパー関数のドキュメント

### Result.ok
```typescript
/**
 * 成功結果を生成します
 * 
 * @param data - 成功時のデータ
 * @returns Success<T> 成功を表すResult型
 * 
 * @example
 * ```typescript
 * return Result.ok({ name: "config", version: "1.0.0" });
 * ```
 */
```

### Result.err
```typescript
/**
 * 失敗結果を生成します
 * 
 * @param error - エラー情報
 * @returns Failure<E> 失敗を表すResult型
 * 
 * @example
 * ```typescript
 * return Result.err({
 *   kind: "validationError",
 *   field: "port",
 *   value: -1,
 *   expectedType: "positive integer"
 * });
 * ```
 */
```

### Result.map
```typescript
/**
 * 成功値を変換します（エラーはそのまま伝播）
 * 
 * @param result - 変換対象のResult
 * @param fn - 成功値に適用する変換関数
 * @returns 変換後のResult型
 * 
 * @example
 * ```typescript
 * const upperCased = Result.map(nameResult, name => name.toUpperCase());
 * ```
 */
```

### Result.flatMap
```typescript
/**
 * Result型を返す関数を連鎖させます
 * 
 * @param result - 入力となるResult
 * @param fn - 成功値を受け取り、新しいResultを返す関数
 * @returns 連鎖実行後のResult
 * 
 * @example
 * ```typescript
 * const finalResult = Result.flatMap(
 *   configResult,
 *   config => validateConfig(config)
 * );
 * ```
 */
```

## ドキュメント更新が必要な箇所

### 1. README.md
- エラーハンドリングのセクションを追加
- Result型の使用例を含める
- 従来の例外ベースのコードとの比較

### 2. API ドキュメント
- 各public関数のResult型返り値の説明
- エラーケースの網羅的なリスト
- エラーからの回復方法の例

### 3. マイグレーションガイド
- 既存コードからResult型への移行手順
- よくある移行パターン
- 互換性の保ち方

### 4. 開発者ガイド
- Result型を使った新機能の実装方法
- エラー型の拡張方法
- テストの書き方

## コメント記述のベストプラクティス

1. **具体的なエラーケースを列挙**: 「エラーが発生する可能性があります」ではなく、具体的にどのようなエラーがどのような条件で発生するかを記述

2. **型安全性を強調**: Result型により、コンパイル時にエラーハンドリングの漏れを防げることを明記

3. **実用的な例を提供**: 単純な使用例だけでなく、エラーハンドリングを含む実際的なコード例を提供

4. **マイグレーションのヒント**: 既存のtry-catchコードからの移行方法を示唆

5. **パフォーマンスへの言及**: Result型の使用によるパフォーマンスへの影響（通常は無視できる程度）について必要に応じて言及