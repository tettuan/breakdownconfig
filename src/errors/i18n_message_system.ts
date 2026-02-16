/**
 * エラーメッセージ国際化システム
 *
 * このシステムは以下の機能を提供します：
 * 1. エラーコードに基づく多言語メッセージ管理
 * 2. 動的パラメータの置換
 * 3. フォールバック言語（英語）のサポート
 * 4. 型安全なメッセージ定義
 */

import type { ErrorCode } from "../error_manager.ts";

// サポート言語
export type SupportedLanguage = "en" | "ja";

// メッセージパラメータの型定義
export type MessageParams = Record<string, string | number>;

// エラーメッセージの型定義
export type ErrorMessage = {
  [key in SupportedLanguage]: string;
};

// エラーメッセージ定義の型
export type ErrorMessages = {
  [key in ErrorCode]: ErrorMessage;
};

/**
 * エラーメッセージ国際化マネージャー
 */
export class I18nErrorManager {
  private static instance: I18nErrorManager;
  private currentLanguage: SupportedLanguage = "en";
  private messages: ErrorMessages;

  private constructor() {
    this.messages = this.loadMessages();
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): I18nErrorManager {
    if (!I18nErrorManager.instance) {
      I18nErrorManager.instance = new I18nErrorManager();
    }
    return I18nErrorManager.instance;
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
   * エラーメッセージを取得
   */
  public getMessage(
    errorCode: ErrorCode,
    params?: MessageParams,
    language?: SupportedLanguage,
  ): string {
    const lang = language || this.currentLanguage;
    const message = this.messages[errorCode]?.[lang] ||
      this.messages[errorCode]?.["en"] ||
      `Unknown error: ${errorCode}`;

    return this.formatMessage(message, params);
  }

  /**
   * エラーをスロー
   */
  public throwError(
    errorCode: ErrorCode,
    params?: MessageParams,
    customMessage?: string,
  ): never {
    const baseMessage = this.getMessage(errorCode, params);
    const fullMessage = customMessage
      ? `[${errorCode}] ${baseMessage}: ${customMessage}`
      : `[${errorCode}] ${baseMessage}`;

    throw new Error(fullMessage);
  }

  /**
   * 警告をログ出力
   */
  public logWarning(
    errorCode: ErrorCode,
    params?: MessageParams,
    customMessage?: string,
  ): string {
    const baseMessage = this.getMessage(errorCode, params);
    const fullMessage = customMessage
      ? `[WARNING] ${baseMessage}: ${customMessage}`
      : `[WARNING] ${baseMessage}`;

    // Note: Warning logged internally - use Result types for error handling
    return fullMessage;
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
   * メッセージ定義をロード
   * 実際の実装では外部ファイルから読み込む
   */
  private loadMessages(): ErrorMessages {
    // ここでは仮の実装として、後でmessages.jsonから読み込むように変更予定
    return {} as ErrorMessages;
  }
}

// エクスポート用のインスタンス
export const i18nError = I18nErrorManager.getInstance();
