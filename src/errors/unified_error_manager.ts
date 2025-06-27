/**
 * 統合エラー管理システム
 *
 * 目的：
 * - ConfigError と UnifiedError の二重管理を解消
 * - 型安全なエラーハンドリングの統一
 * - 国際化メッセージシステムの統合
 * - デバッグ情報とユーザー向け情報の分離
 */

import { ErrorFactories, ErrorGuards, UnifiedError } from "./unified_errors.ts";
import { Result } from "../types/unified_result.ts";

/**
 * 言語設定
 */
export type SupportedLanguage = "en" | "ja";

/**
 * メッセージパラメータ
 */
export type MessageParams = Record<string, string | number | boolean>;

/**
 * エラーの重要度レベル
 */
export type ErrorSeverity = "error" | "warning" | "info";

/**
 * ユーザー向けエラー情報（ローカライズ済み）
 */
export interface UserFacingError {
  readonly severity: ErrorSeverity;
  readonly title: string;
  readonly description: string;
  readonly suggestion?: string;
  readonly code: string;
}

/**
 * 開発者向けデバッグ情報
 */
export interface DebugInfo {
  readonly errorKind: string;
  readonly stackTrace?: string;
  readonly context?: string;
  readonly originalError?: unknown;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
}

/**
 * 統合エラー詳細情報
 */
export interface ErrorDetails {
  readonly userFacing: UserFacingError;
  readonly debug: DebugInfo;
}

/**
 * 国際化メッセージテンプレート
 */
interface MessageTemplate {
  readonly title: {
    readonly en: string;
    readonly ja: string;
  };
  readonly description: {
    readonly en: string;
    readonly ja: string;
  };
  readonly suggestion?: {
    readonly en: string;
    readonly ja: string;
  };
}

/**
 * エラーメッセージマップ
 */
const ERROR_MESSAGES: Record<UnifiedError["kind"], MessageTemplate> = {
  CONFIG_FILE_NOT_FOUND: {
    title: {
      en: "Configuration File Not Found",
      ja: "設定ファイルが見つかりません",
    },
    description: {
      en: "The {configType} configuration file at '{path}' could not be found.",
      ja: "{configType}設定ファイル '{path}' が見つかりません。",
    },
    suggestion: {
      en: "Please create the configuration file or verify the path is correct.",
      ja: "設定ファイルを作成するか、パスが正しいことを確認してください。",
    },
  },
  CONFIG_PARSE_ERROR: {
    title: {
      en: "Configuration Parse Error",
      ja: "設定ファイル解析エラー",
    },
    description: {
      en:
        "Failed to parse configuration file '{path}' at line {line}, column {column}: {syntaxError}",
      ja: "設定ファイル '{path}' の {line}行 {column}列で解析エラーが発生しました: {syntaxError}",
    },
    suggestion: {
      en: "Please check the YAML/JSON syntax in the configuration file.",
      ja: "設定ファイルのYAML/JSON構文を確認してください。",
    },
  },
  CONFIG_VALIDATION_ERROR: {
    title: {
      en: "Configuration Validation Error",
      ja: "設定検証エラー",
    },
    description: {
      en: "Configuration file '{path}' failed validation with {violationCount} violation(s).",
      ja: "設定ファイル '{path}' の検証に失敗しました（{violationCount}件の違反）。",
    },
    suggestion: {
      en: "Please fix the validation errors in the configuration file.",
      ja: "設定ファイルの検証エラーを修正してください。",
    },
  },
  USER_CONFIG_INVALID: {
    title: {
      en: "User Configuration Invalid",
      ja: "ユーザー設定が無効です",
    },
    description: {
      en: "User configuration at '{path}' is invalid: {reason}",
      ja: "'{path}' のユーザー設定が無効です: {reason}",
    },
    suggestion: {
      en: "Please check the user configuration file format and content.",
      ja: "ユーザー設定ファイルの形式と内容を確認してください。",
    },
  },
  PATH_VALIDATION_ERROR: {
    title: {
      en: "Path Validation Error",
      ja: "パス検証エラー",
    },
    description: {
      en: "Invalid path '{path}' in field '{affectedField}': {reason}",
      ja: "フィールド '{affectedField}' の無効なパス '{path}': {reason}",
    },
    suggestion: {
      en: "Please use a valid path format.",
      ja: "有効なパス形式を使用してください。",
    },
  },
  CONFIG_NOT_LOADED: {
    title: {
      en: "Configuration Not Loaded",
      ja: "設定が読み込まれていません",
    },
    description: {
      en: "Configuration must be loaded before performing '{requestedOperation}'.",
      ja: "'{requestedOperation}' を実行する前に設定を読み込む必要があります。",
    },
    suggestion: {
      en: "Call loadConfig() before accessing configuration values.",
      ja: "設定値にアクセスする前に loadConfig() を呼び出してください。",
    },
  },
  INVALID_PROFILE_NAME: {
    title: {
      en: "Invalid Profile Name",
      ja: "無効なプロファイル名",
    },
    description: {
      en: "Profile name '{providedName}' is invalid. Must match pattern: {pattern}",
      ja: "プロファイル名 '{providedName}' が無効です。パターンに一致する必要があります: {pattern}",
    },
    suggestion: {
      en: "Use a valid configuration set name like: {validExamples}",
      ja: "次のような有効な設定セット名を使用してください: {validExamples}",
    },
  },
  FILE_SYSTEM_ERROR: {
    title: {
      en: "File System Error",
      ja: "ファイルシステムエラー",
    },
    description: {
      en: "File system {operation} operation failed for '{path}': {systemError}",
      ja: "'{path}' のファイルシステム {operation} 操作が失敗しました: {systemError}",
    },
    suggestion: {
      en: "Please check file permissions and disk space.",
      ja: "ファイルの権限とディスク容量を確認してください。",
    },
  },
  REQUIRED_FIELD_MISSING: {
    title: {
      en: "Required Field Missing",
      ja: "必須フィールドが不足しています",
    },
    description: {
      en: "Required field '{field}'{parentObject} is missing.",
      ja: "必須フィールド '{field}'{parentObject} が不足しています。",
    },
    suggestion: {
      en: "Please provide the required field in the configuration.",
      ja: "設定に必須フィールドを追加してください。",
    },
  },
  TYPE_MISMATCH: {
    title: {
      en: "Type Mismatch",
      ja: "型の不一致",
    },
    description: {
      en: "Field '{field}' expected {expectedType} but got {actualType}.",
      ja: "フィールド '{field}' は {expectedType} が期待されましたが {actualType} でした。",
    },
    suggestion: {
      en: "Please provide the correct data type for the field.",
      ja: "フィールドに正しいデータ型を指定してください。",
    },
  },
  UNKNOWN_ERROR: {
    title: {
      en: "Unexpected Error",
      ja: "予期しないエラー",
    },
    description: {
      en: "An unexpected error occurred{context}: {message}",
      ja: "予期しないエラーが発生しました{context}: {message}",
    },
    suggestion: {
      en: "Please contact support if this error persists.",
      ja: "このエラーが継続する場合はサポートにお問い合わせください。",
    },
  },
};

/**
 * 統合エラー管理クラス
 */
export class UnifiedErrorManager {
  private static instance: UnifiedErrorManager;
  private currentLanguage: SupportedLanguage = "en";

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): UnifiedErrorManager {
    if (!UnifiedErrorManager.instance) {
      UnifiedErrorManager.instance = new UnifiedErrorManager();
    }
    return UnifiedErrorManager.instance;
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
   * UnifiedError からエラー詳細情報を生成
   */
  public getErrorDetails(error: UnifiedError, language?: SupportedLanguage): ErrorDetails {
    const lang = language || this.currentLanguage;
    const template = ERROR_MESSAGES[error.kind];
    const params = this.extractMessageParams(error);

    return {
      userFacing: {
        severity: this.determineSeverity(error),
        title: this.formatMessage(template.title[lang], params),
        description: this.formatMessage(template.description[lang], params),
        suggestion: template.suggestion
          ? this.formatMessage(template.suggestion[lang], params)
          : undefined,
        code: this.generateErrorCode(error),
      },
      debug: {
        errorKind: error.kind,
        stackTrace: this.extractStackTrace(error),
        context: this.extractContext(error),
        originalError: this.extractOriginalError(error),
        timestamp: error.timestamp,
        metadata: this.extractMetadata(error),
      },
    };
  }

  /**
   * UnifiedError からユーザー向けメッセージを生成
   */
  public getUserMessage(error: UnifiedError, language?: SupportedLanguage): string {
    const details = this.getErrorDetails(error, language);
    return `${details.userFacing.title}: ${details.userFacing.description}`;
  }

  /**
   * UnifiedError から開発者向けメッセージを生成
   */
  public getDebugMessage(error: UnifiedError): string {
    const details = this.getErrorDetails(error);
    const lines = [
      `[${details.debug.errorKind}] ${details.userFacing.description}`,
      `Code: ${details.userFacing.code}`,
      `Timestamp: ${details.debug.timestamp.toISOString()}`,
    ];

    if (details.debug.context) {
      lines.push(`Context: ${details.debug.context}`);
    }

    if (details.debug.stackTrace) {
      lines.push(`Stack: ${details.debug.stackTrace}`);
    }

    return lines.join("\n");
  }

  /**
   * Result型でエラーを返す（推奨方法）
   */
  public createResult<T>(error: UnifiedError): Result<T> {
    return Result.err(error);
  }

  /**
   * エラーをログ出力
   */
  public logError(error: UnifiedError, severity: ErrorSeverity = "error"): void {
    const details = this.getErrorDetails(error);
    const message = this.getUserMessage(error);
    const debugMessage = this.getDebugMessage(error);

    switch (severity) {
      case "error":
        console.error(`[ERROR] ${message}`);
        console.error(debugMessage);
        break;
      case "warning":
        console.warn(`[WARNING] ${message}`);
        console.warn(debugMessage);
        break;
      case "info":
        console.info(`[INFO] ${message}`);
        console.info(debugMessage);
        break;
    }
  }

  /**
   * 例外をスロー（非推奨、レガシーコード互換用）
   */
  public throwError(error: UnifiedError): never {
    const message = this.getDebugMessage(error);
    throw new Error(message);
  }

  /**
   * メッセージ内のパラメータを置換
   */
  private formatMessage(template: string, params: MessageParams): string {
    return Object.entries(params).reduce((message, [key, value]) => {
      return message.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
    }, template);
  }

  /**
   * UnifiedError からメッセージパラメータを抽出
   */
  private extractMessageParams(error: UnifiedError): MessageParams {
    const baseParams: MessageParams = {};

    switch (error.kind) {
      case "CONFIG_FILE_NOT_FOUND":
        return {
          ...baseParams,
          path: error.path,
          configType: error.configType === "app" ? "application" : "user",
          searchedLocations: error.searchedLocations?.join(", ") || "",
        };

      case "CONFIG_PARSE_ERROR":
        return {
          ...baseParams,
          path: error.path,
          line: error.line || 0,
          column: error.column || 0,
          syntaxError: error.syntaxError,
        };

      case "CONFIG_VALIDATION_ERROR":
        return {
          ...baseParams,
          path: error.path,
          violationCount: error.violations.length,
        };

      case "USER_CONFIG_INVALID":
        return {
          ...baseParams,
          path: error.path,
          reason: error.reason,
          details: error.details || "",
        };

      case "PATH_VALIDATION_ERROR":
        return {
          ...baseParams,
          path: error.path,
          affectedField: error.affectedField,
          reason: error.reason,
        };

      case "CONFIG_NOT_LOADED":
        return {
          ...baseParams,
          requestedOperation: error.requestedOperation,
        };

      case "INVALID_PROFILE_NAME":
        return {
          ...baseParams,
          providedName: error.providedName,
          pattern: error.pattern,
          validExamples: error.validExamples.join(", "),
        };

      case "FILE_SYSTEM_ERROR":
        return {
          ...baseParams,
          operation: error.operation,
          path: error.path,
          systemError: error.systemError || "",
        };

      case "REQUIRED_FIELD_MISSING":
        return {
          ...baseParams,
          field: error.field,
          parentObject: error.parentObject ? ` in ${error.parentObject}` : "",
        };

      case "TYPE_MISMATCH":
        return {
          ...baseParams,
          field: error.field,
          expectedType: error.expectedType,
          actualType: error.actualType,
        };

      case "UNKNOWN_ERROR":
        return {
          ...baseParams,
          context: error.context ? ` in ${error.context}` : "",
          message: error.message,
        };

      default:
        return baseParams;
    }
  }

  /**
   * エラーの重要度を判定
   */
  private determineSeverity(error: UnifiedError): ErrorSeverity {
    switch (error.kind) {
      case "CONFIG_FILE_NOT_FOUND":
        return "error";
      case "CONFIG_PARSE_ERROR":
        return "error";
      case "CONFIG_VALIDATION_ERROR":
        return "error";
      case "USER_CONFIG_INVALID":
        return "warning";
      case "PATH_VALIDATION_ERROR":
        return "error";
      case "CONFIG_NOT_LOADED":
        return "error";
      case "INVALID_PROFILE_NAME":
        return "error";
      case "FILE_SYSTEM_ERROR":
        return "error";
      case "REQUIRED_FIELD_MISSING":
        return "error";
      case "TYPE_MISMATCH":
        return "error";
      case "UNKNOWN_ERROR":
        return "error";
      default:
        return "error";
    }
  }

  /**
   * エラーコードを生成
   */
  private generateErrorCode(error: UnifiedError): string {
    const codeMap: Record<UnifiedError["kind"], string> = {
      CONFIG_FILE_NOT_FOUND: "CFG001",
      CONFIG_PARSE_ERROR: "CFG002",
      CONFIG_VALIDATION_ERROR: "CFG003",
      USER_CONFIG_INVALID: "CFG004",
      PATH_VALIDATION_ERROR: "PTH001",
      CONFIG_NOT_LOADED: "CFG005",
      INVALID_PROFILE_NAME: "CFG006",
      FILE_SYSTEM_ERROR: "FS001",
      REQUIRED_FIELD_MISSING: "VAL001",
      TYPE_MISMATCH: "VAL002",
      UNKNOWN_ERROR: "UNK001",
    };

    return codeMap[error.kind] || "UNK999";
  }

  /**
   * スタックトレースを抽出
   */
  private extractStackTrace(error: UnifiedError): string | undefined {
    if ("stackTrace" in error) {
      return error.stackTrace;
    }
    return undefined;
  }

  /**
   * コンテキストを抽出
   */
  private extractContext(error: UnifiedError): string | undefined {
    if ("context" in error) {
      return error.context;
    }
    return undefined;
  }

  /**
   * 元エラーを抽出
   */
  private extractOriginalError(error: UnifiedError): unknown {
    if ("originalError" in error) {
      return error.originalError;
    }
    return undefined;
  }

  /**
   * メタデータを抽出
   */
  private extractMetadata(error: UnifiedError): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    // エラー種別ごとの固有情報をメタデータとして収集
    switch (error.kind) {
      case "CONFIG_VALIDATION_ERROR":
        metadata.violations = error.violations;
        break;
      case "PATH_VALIDATION_ERROR":
        metadata.reason = error.reason;
        metadata.affectedField = error.affectedField;
        break;
      case "FILE_SYSTEM_ERROR":
        metadata.operation = error.operation;
        metadata.code = error.code;
        break;
        // 他のエラー種別も必要に応じて追加
    }

    return metadata;
  }
}

/**
 * デフォルトインスタンス
 */
export const errorManager = UnifiedErrorManager.getInstance();

/**
 * 便利な関数群
 */
export const ErrorUtils = {
  /**
   * エラーがConfigError型かどうかチェック（レガシー互換）
   */
  isConfigError: (error: unknown): error is UnifiedError => {
    return typeof error === "object" && error !== null && "kind" in error && "timestamp" in error;
  },

  /**
   * エラーを安全にログ出力
   */
  safeLog: (error: unknown, context?: string) => {
    if (ErrorUtils.isConfigError(error)) {
      errorManager.logError(error);
    } else {
      const unifiedError = ErrorFactories.unknown(error, context);
      errorManager.logError(unifiedError);
    }
  },

  /**
   * 複数エラーをまとめて処理
   */
  handleMultipleErrors: (errors: UnifiedError[], language?: SupportedLanguage): string => {
    return errors.map((error) => errorManager.getUserMessage(error, language)).join("; ");
  },
} as const;
