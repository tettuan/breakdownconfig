// 改善案: Smart Constructorによるパス検証

/**

- パスの妥当性を保証するSmart Constructor
- 不正なパスを持つインスタンスの作成を型レベルで防ぐ
  */
  export class ValidPath {
  // Nominal typeとして機能するprivateプロパティ
  private readonly __brand = "ValidPath";

// 外部から直接インスタンス化できないようにprivateコンストラクタ
private constructor(private readonly value: string) {}

/**

- パスの検証を行い、有効な場合のみValidPathインスタンスを作成
- @param path 検証対象のパス文字列
- @returns 成功時はValidPath、失敗時はPathErrorReasonを含むエラー
  */
  static create(path: string): { success: true; path: ValidPath } | { success: false; reason: PathErrorReason; message: string } {
  // 空文字チェック
  if (!path || path.trim() === "") {
  return {
  success: false,
  reason: "emptyPath",
  message: "Path cannot be empty"
  };
  }

  // パストラバーサルのチェック
  if (path.includes("../") || path.includes("..\\")) {
  return {
  success: false,
  reason: "pathTraversal",
  message: "Path traversal sequences are not allowed"
  };
  }

  // 無効な文字のチェック
  if (!/^[a-zA-Z0-9._/-]+$/.test(path)) {
  return {
  success: false,
  reason: "invalidCharacters",
  message: "Path contains invalid characters"
  };
  }

  // パス長のチェック
  if (path.length > 255) {
  return {
  success: false,
  reason: "tooLong",
  message: "Path exceeds maximum length of 255 characters"
  };
  }

  return {
  success: true,
  path: new ValidPath(path)
  };

}

/**

- 検証済みのパス文字列を取得
- この値は必ず有効なパスであることが保証されている
  */
  getValue(): string {
  return this.value;
  }

/**

- 別のValidPathとの結合
- 両方が有効であることが保証されているため、結合も安全
  */
  join(other: ValidPath): { success: true; path: ValidPath } | { success: false; reason: PathErrorReason; message: string } {
  const joinedPath = `${this.value}/${other.value}`;
  return ValidPath.create(joinedPath);
  }

/**

- デバッグ用の文字列表現
  */
  toString(): string {
  return `ValidPath(${this.value})`;
  }
  }

/**

- パスエラーの理由を表すDiscriminated Union
  */
  export type PathErrorReason =
  | "pathTraversal"
  | "absoluteNotAllowed"
  | "invalidCharacters"
  | "tooLong"
  | "emptyPath";

/**

- 使用例:
-
- ```typescript
  ```
- const pathResult = ValidPath.create("../malicious/path");
- if (pathResult.success) {
- // この分岐では pathResult.path が ValidPath 型であることが保証
- console.log("Valid path:", pathResult.path.getValue());
- } else {
- // この分岐では pathResult.reason でエラーの種類を取得可能
- console.error("Invalid path:", pathResult.message);
-
- switch (pathResult.reason) {
- case "pathTraversal":
- // パストラバーサル攻撃の対処
- break;
- case "invalidCharacters":
- // 不正文字の対処
- break;
- // 他のケースも網羅的に処理
- }
- }
- ```
  ```

*/
