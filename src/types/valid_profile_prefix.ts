import { Result } from "./unified_result.ts";
import { ErrorFactories, UnifiedError } from "../errors/unified_errors.ts";

/**
 * ValidProfilePrefix Smart Constructor
 * 
 * プロファイルプレフィックスの制約（英数字+ハイフンのみ）を型レベルで保証します。
 * privateコンストラクタとstatic createメソッドによるSmart Constructorパターンを実装。
 */
export class ValidProfilePrefix {
  private readonly value: string;
  
  /**
   * プライベートコンストラクタ - 外部からの直接インスタンス化を防止
   */
  private constructor(value: string) {
    this.value = value;
  }
  
  /**
   * Smart Constructor - 検証済みのValidProfilePrefixインスタンスを作成
   * 
   * @param value - 検証対象のプロファイルプレフィックス文字列
   * @returns 成功時: ValidProfilePrefixインスタンス、失敗時: ValidationError
   */
  static create(value: string): Result<ValidProfilePrefix, UnifiedError> {
    // 空文字列チェック
    if (!value || value.trim() === "") {
      return Result.err(
        ErrorFactories.configValidationError(
          "profile_prefix",
          [{
            field: "value",
            value: value,
            expectedType: "non-empty string",
            actualType: "string",
            constraint: "cannot be empty",
          }],
        ),
      );
    }
    
    // 英数字+ハイフンのみの制約チェック
    if (!/^[a-zA-Z0-9-]+$/.test(value)) {
      return Result.err(
        ErrorFactories.configValidationError(
          "profile_prefix",
          [{
            field: "value",
            value: value,
            expectedType: "alphanumeric with hyphens",
            actualType: "string",
            constraint: "only alphanumeric characters and hyphens are allowed",
          }],
        ),
      );
    }
    
    return Result.ok(new ValidProfilePrefix(value));
  }
  
  /**
   * プロファイルプレフィックスの値を取得
   * 
   * @returns 検証済みのプロファイルプレフィックス文字列
   */
  getValue(): string {
    return this.value;
  }
  
  /**
   * 文字列表現を返す
   * 
   * @returns プロファイルプレフィックス文字列
   */
  toString(): string {
    return this.value;
  }
  
  /**
   * 等価性チェック
   * 
   * @param other - 比較対象
   * @returns 等価の場合true
   */
  equals(other: ValidProfilePrefix): boolean {
    return this.value === other.value;
  }
}

/**
 * 型ガード - 値がValidProfilePrefixインスタンスかどうかを判定
 * 
 * @param value - チェック対象の値
 * @returns ValidProfilePrefixインスタンスの場合true
 */
export function isValidProfilePrefix(value: unknown): value is ValidProfilePrefix {
  return value instanceof ValidProfilePrefix;
}