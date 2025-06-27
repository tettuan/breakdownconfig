/**
 * 統合エラー型に基づいた国際化メッセージ管理システム
 *
 * ErrorManager脱却後の新しいエラーメッセージ体系
 * - 型安全なメッセージ定義
 * - ConfigError型との完全な統合
 * - 柔軟な言語切り替え
 * - パラメータ置換サポート
 */

import { ConfigError, PathErrorReason, ValidationError } from "../types/config_result.ts";
import type { ValidationViolation, ConfigValidationError as UnifiedConfigValidationError } from "./unified_errors.ts";
import configErrorMessages from "./config_error_messages.json" with { type: "json" };
import errorCodeMessages from "./messages.json" with { type: "json" };

// サポート言語
export type SupportedLanguage = "en" | "ja";

// メッセージパラメータの型定義
export type MessageParams = Record<string, string | number>;

/**
 * 統合エラーメッセージマネージャー
 * ConfigError型に基づいたメッセージ管理を提供
 */
export class UnifiedErrorI18n {
  private static instance: UnifiedErrorI18n;
  private currentLanguage: SupportedLanguage = "en";

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): UnifiedErrorI18n {
    if (!UnifiedErrorI18n.instance) {
      UnifiedErrorI18n.instance = new UnifiedErrorI18n();
    }
    return UnifiedErrorI18n.instance;
  }

  /**
   * 現在の言語を設定
   */
  public setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
  }

  /**
   * 現在の言語を取得
   */
  public getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * ConfigError型からメッセージを生成
   */
  public getErrorMessage(error: ConfigError, language?: SupportedLanguage): string {
    const lang = language || this.currentLanguage;

    switch (error.kind) {
      case "fileNotFound":
        return this.formatMessage(
          configErrorMessages.configError.fileNotFound[lang],
          { path: error.path },
        );

      case "parseError":
        return this.formatMessage(
          configErrorMessages.configError.parseError[lang],
          {
            path: error.path,
            line: error.line,
            column: error.column,
            message: error.message,
          },
        );

      case "configValidationError":
        return this.getValidationErrorMessage(error, lang);

      case "pathError":
        return this.getPathErrorMessage(error, lang);

      case "unknownError":
        return this.formatMessage(
          configErrorMessages.configError.unknownError[lang],
          { message: error.message },
        );

      default:
        // Use never assertion to ensure exhaustive checking
        const _exhaustiveCheck: never = error;
        return `Unknown error type: ${(error as { kind: string }).kind}`;
    }
  }

  /**
   * ValidationErrorのメッセージを生成
   */
  private getValidationErrorMessage(error: UnifiedConfigValidationError, lang: SupportedLanguage): string {
    const baseMessage = this.formatMessage(
      configErrorMessages.configError.configValidationError[lang],
      { path: error.path },
    );

    const fieldErrors = error.violations.map((err: ValidationViolation) =>
      this.formatMessage(
        configErrorMessages.configError.configValidationError.fieldError[lang],
        {
          field: err.field,
          expectedType: err.expectedType,
          actualType: err.actualType,
        },
      )
    ).join(", ");

    return `${baseMessage}: ${fieldErrors}`;
  }

  /**
   * PathErrorのメッセージを生成
   */
  private getPathErrorMessage(error: PathError, lang: SupportedLanguage): string {
    const reasonMessages = configErrorMessages.configError.pathError[error.reason];
    if (!reasonMessages) {
      return error.message || `Path error: ${error.reason}`;
    }

    return this.formatMessage(reasonMessages[lang], { path: error.path });
  }

  /**
   * レガシーErrorCode用のメッセージ取得（移行期間用）
   */
  public getErrorCodeMessage(
    errorCode: string,
    params?: MessageParams,
    language?: SupportedLanguage,
  ): string {
    const lang = language || this.currentLanguage;
    const message = errorCodeMessages[errorCode as keyof typeof errorCodeMessages]?.[lang];

    if (!message) {
      return `Unknown error code: ${errorCode}`;
    }

    return this.formatMessage(message, params);
  }

  /**
   * ConfigError型のエラーをスロー
   */
  public throwError(error: ConfigError, customMessage?: string): never {
    const baseMessage = this.getErrorMessage(error);
    const fullMessage = customMessage ? `${baseMessage}: ${customMessage}` : baseMessage;

    throw new Error(fullMessage);
  }

  /**
   * 警告メッセージをログ出力
   */
  public logWarning(error: ConfigError, customMessage?: string): void {
    const baseMessage = this.getErrorMessage(error);
    const fullMessage = customMessage
      ? `[WARNING] ${baseMessage}: ${customMessage}`
      : `[WARNING] ${baseMessage}`;

    console.warn(fullMessage);
  }

  /**
   * メッセージ内のパラメータを置換
   */
  private formatMessage(message: string, params?: MessageParams): string {
    if (!params) return message;

    return Object.entries(params).reduce((msg, [key, value]) => {
      return msg.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
    }, message);
  }

  /**
   * エラーオブジェクトから詳細な診断情報を生成
   */
  public getDiagnosticInfo(error: ConfigError): string {
    const errorMessage = this.getErrorMessage(error);
    const diagnostics: string[] = [errorMessage];

    // エラータイプ別の追加診断情報
    switch (error.kind) {
      case "parseError":
        diagnostics.push(`  Location: Line ${error.line}, Column ${error.column}`);
        break;
      case "configValidationError":
        diagnostics.push(`  Total validation errors: ${error.errors.length}`);
        error.errors.forEach((err, index) => {
          diagnostics.push(`  ${index + 1}. Field: ${err.field}, Type: ${err.expectedType}`);
        });
        break;
      case "pathError":
        diagnostics.push(`  Reason: ${error.reason}`);
        break;
    }

    return diagnostics.join("\n");
  }
}

// エクスポート用のインスタンス
export const unifiedI18n = UnifiedErrorI18n.getInstance();

// 型定義のインポート
type ConfigValidationError = Extract<ConfigError, { kind: "configValidationError" }>;
type PathError = Extract<ConfigError, { kind: "pathError" }>;
