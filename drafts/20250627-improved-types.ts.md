// 改善案: Discriminated Unionによる設定読み込み結果の表現

/**
 * 設定読み込みの全ての可能な結果を表現するDiscriminated Union
 * 各結果の種類を明確に区別し、エラーハンドリングを型安全にする
 */
export type ConfigLoadResult<T> = 
  | { kind: "success"; data: T }
  | { kind: "fileNotFound"; path: string; message: string }
  | { kind: "parseError"; path: string; line?: number; column?: number; message: string }
  | { kind: "validationError"; errors: ValidationError[] }
  | { kind: "pathError"; path: string; reason: PathErrorReason };

/**
 * パスに関するエラーの種類を明確に定義
 */
export type PathErrorReason = 
  | "pathTraversal"
  | "absoluteNotAllowed" 
  | "invalidCharacters"
  | "tooLong"
  | "emptyPath";

/**
 * バリデーションエラーの詳細情報
 */
export interface ValidationError {
  field: string;
  value: unknown;
  expectedType: string;
  message: string;
}

/**
 * 設定値として許可される型を明確に定義
 * unknownやanyを使わずに具体的な型を指定
 */
export type ConfigValue = 
  | string
  | number
  | boolean
  | ConfigValue[]
  | { [key: string]: ConfigValue };

/**
 * カスタム設定の型安全な表現
 */
export type CustomConfig = Record<string, ConfigValue>;

/**
 * 検証済みの設定型
 * 全ての値が検証を通過していることを型レベルで保証
 */
export interface ValidatedConfig {
  working_dir: ValidPath;
  app_prompt: {
    base_dir: ValidPath;
  };
  app_schema: {
    base_dir: ValidPath;
  };
  custom: CustomConfig;
}
