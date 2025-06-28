/**
 * ConfigManager専用エラー定義と国際化メッセージ
 *
 * ConfigManagerでよく使われるエラーパターンに特化した
 * ファクトリ関数とメッセージテンプレートを提供
 */

import { ErrorFactories, UnifiedError } from "./unified_errors.ts";
import { errorManager, SupportedLanguage } from "./unified_error_manager.ts";

/**
 * ConfigManager固有のエラーコンテキスト
 */
export interface ConfigManagerContext {
  readonly configSet?: string;
  readonly configPath?: string;
  readonly operation?: string;
  readonly requestedKey?: string;
}

/**
 * ConfigManager専用エラーファクトリ
 */
export const ConfigManagerErrors = {
  /**
   * 設定が読み込まれていない状態でアクセスを試行
   */
  configNotLoaded: (operation: string, _context?: ConfigManagerContext): UnifiedError => {
    return ErrorFactories.configNotLoaded(operation);
  },

  /**
   * 設定ファイルが見つからない
   */
  configFileNotFound: (
    path: string,
    configType: "app" | "user" = "app",
    searchedLocations?: string[],
    _context?: ConfigManagerContext,
  ): UnifiedError => {
    return ErrorFactories.configFileNotFound(path, configType, searchedLocations);
  },

  /**
   * 設定ファイルのパースエラー
   */
  configParseError: (
    path: string,
    syntaxError: string,
    line?: number,
    column?: number,
    _context?: ConfigManagerContext,
  ): UnifiedError => {
    return ErrorFactories.configParseError(path, syntaxError, line, column);
  },

  /**
   * 設定の検証エラー
   */
  configValidationError: (
    path: string,
    fieldErrors: Array<{
      field: string;
      expectedType: string;
      actualType: string;
      value: unknown;
      constraint?: string;
    }>,
    _context?: ConfigManagerContext,
  ): UnifiedError => {
    const violations = fieldErrors.map((error) => ({
      field: error.field,
      value: error.value,
      expectedType: error.expectedType,
      actualType: error.actualType,
      constraint: error.constraint,
    }));

    return ErrorFactories.configValidationError(path, violations);
  },

  /**
   * ユーザー設定の不正エラー
   */
  userConfigInvalid: (
    path: string,
    reason: "PARSE_ERROR" | "VALIDATION_ERROR" | "UNKNOWN_ERROR",
    details?: string,
    originalError?: unknown,
    _context?: ConfigManagerContext,
  ): UnifiedError => {
    return ErrorFactories.userConfigInvalid(path, reason, details, originalError);
  },

  /**
   * パス検証エラー
   */
  pathValidationError: (
    path: string,
    reason:
      | "PATH_TRAVERSAL"
      | "ABSOLUTE_PATH_NOT_ALLOWED"
      | "INVALID_CHARACTERS"
      | "PATH_TOO_LONG"
      | "EMPTY_PATH",
    fieldName: string,
    _context?: ConfigManagerContext,
  ): UnifiedError => {
    return ErrorFactories.pathValidationError(path, reason, fieldName);
  },

  /**
   * 必須フィールド不足エラー
   */
  requiredFieldMissing: (
    fieldName: string,
    parentObject?: string,
    availableFields?: string[],
    _context?: ConfigManagerContext,
  ): UnifiedError => {
    return ErrorFactories.requiredFieldMissing(fieldName, parentObject, availableFields);
  },

  /**
   * 型不一致エラー
   */
  typeMismatch: (
    fieldName: string,
    expectedType: string,
    actualValue: unknown,
    _context?: ConfigManagerContext,
  ): UnifiedError => {
    const actualType = Array.isArray(actualValue)
      ? "array"
      : actualValue === null
      ? "null"
      : typeof actualValue;

    return ErrorFactories.typeMismatch(fieldName, expectedType, actualType, actualValue);
  },

  /**
   * プロファイル名不正エラー
   */
  invalidProfileName: (
    providedName: string,
    _context?: ConfigManagerContext,
  ): UnifiedError => {
    return ErrorFactories.invalidProfileName(providedName);
  },

  /**
   * ファイルシステム操作エラー
   */
  fileSystemError: (
    operation: "read" | "write" | "delete" | "create",
    path: string,
    systemError?: string,
    code?: string,
    _context?: ConfigManagerContext,
  ): UnifiedError => {
    return ErrorFactories.fileSystemError(operation, path, systemError, code);
  },

  /**
   * 設定マージエラー
   */
  configMergeError: (
    error: unknown,
    _context?: ConfigManagerContext,
  ): UnifiedError => {
    return ErrorFactories.configMergeError(error);
  },

  /**
   * 不明なエラー
   */
  unknown: (
    error: unknown,
    operation?: string,
    _context?: ConfigManagerContext,
  ): UnifiedError => {
    const contextStr = operation ? `ConfigManager.${operation}` : "ConfigManager";
    return ErrorFactories.unknown(error, contextStr);
  },
} as const;

/**
 * ConfigManager専用メッセージテンプレート（国際化対応）
 */
export const ConfigManagerMessages = {
  /**
   * 操作別エラーメッセージの生成
   */
  getOperationErrorMessage: (
    error: UnifiedError,
    operation: string,
    language?: SupportedLanguage,
  ): string => {
    const details = errorManager.getErrorDetails(error, language);
    const operationContext = getOperationContext(operation, language);

    return `${operationContext}: ${details.userFacing.description}`;
  },

  /**
   * 設定ファイル関連のエラーメッセージ生成
   */
  getConfigFileErrorMessage: (
    error: UnifiedError,
    configType: "app" | "user",
    language?: SupportedLanguage,
  ): string => {
    const details = errorManager.getErrorDetails(error, language);
    const fileTypeContext = getConfigFileTypeContext(configType, language);

    return `${fileTypeContext}: ${details.userFacing.description}`;
  },

  /**
   * デバッグ情報付きエラーメッセージ生成
   */
  getDebugErrorMessage: (
    error: UnifiedError,
    context?: ConfigManagerContext,
  ): string => {
    const debugMessage = errorManager.getDebugMessage(error);
    const contextInfo = formatContextInfo(context);

    return contextInfo ? `${debugMessage}\nContext: ${contextInfo}` : debugMessage;
  },

  /**
   * ユーザー向け修正提案メッセージ生成
   */
  getSuggestionMessage: (
    error: UnifiedError,
    language?: SupportedLanguage,
  ): string => {
    const details = errorManager.getErrorDetails(error, language);

    if (!details.userFacing.suggestion) {
      return getGenericSuggestion(error.kind, language);
    }

    return details.userFacing.suggestion;
  },
} as const;

/**
 * 操作コンテキストの国際化
 */
function getOperationContext(operation: string, language?: SupportedLanguage): string {
  const lang = language || "en";

  const operationMessages: Record<string, Record<SupportedLanguage, string>> = {
    loadConfig: {
      en: "Loading configuration",
      ja: "設定読み込み",
    },
    getConfig: {
      en: "Getting configuration value",
      ja: "設定値取得",
    },
    setConfig: {
      en: "Setting configuration value",
      ja: "設定値設定",
    },
    saveConfig: {
      en: "Saving configuration",
      ja: "設定保存",
    },
    validateConfig: {
      en: "Validating configuration",
      ja: "設定検証",
    },
    mergeConfig: {
      en: "Merging configuration",
      ja: "設定マージ",
    },
  };

  return operationMessages[operation]?.[lang] || operation;
}

/**
 * 設定ファイル種別の国際化
 */
function getConfigFileTypeContext(
  configType: "app" | "user",
  language?: SupportedLanguage,
): string {
  const lang = language || "en";

  const typeMessages: Record<string, Record<SupportedLanguage, string>> = {
    app: {
      en: "Application configuration",
      ja: "アプリケーション設定",
    },
    user: {
      en: "User configuration",
      ja: "ユーザー設定",
    },
  };

  return typeMessages[configType][lang];
}

/**
 * コンテキスト情報のフォーマット
 */
function formatContextInfo(context?: ConfigManagerContext): string {
  if (!context) return "";

  const parts: string[] = [];

  if (context.configSet) {
    parts.push(`ConfigSet: ${context.configSet}`);
  }

  if (context.configPath) {
    parts.push(`Path: ${context.configPath}`);
  }

  if (context.operation) {
    parts.push(`Operation: ${context.operation}`);
  }

  if (context.requestedKey) {
    parts.push(`Key: ${context.requestedKey}`);
  }

  return parts.join(", ");
}

/**
 * 汎用的な修正提案の生成
 */
function getGenericSuggestion(errorKind: string, language?: SupportedLanguage): string {
  const lang = language || "en";

  const suggestions: Record<string, Record<SupportedLanguage, string>> = {
    CONFIG_FILE_NOT_FOUND: {
      en: "Create the configuration file or check the file path.",
      ja: "設定ファイルを作成するか、ファイルパスを確認してください。",
    },
    CONFIG_PARSE_ERROR: {
      en: "Check the YAML/JSON syntax in the configuration file.",
      ja: "設定ファイルのYAML/JSON構文を確認してください。",
    },
    CONFIG_VALIDATION_ERROR: {
      en: "Fix the validation errors in the configuration file.",
      ja: "設定ファイルの検証エラーを修正してください。",
    },
    PATH_VALIDATION_ERROR: {
      en: "Use a valid path format without security risks.",
      ja: "セキュリティリスクのない有効なパス形式を使用してください。",
    },
    TYPE_MISMATCH: {
      en: "Provide the correct data type for the configuration field.",
      ja: "設定フィールドに正しいデータ型を指定してください。",
    },
  };

  return suggestions[errorKind]?.[lang] || (
    lang === "ja"
      ? "設定を確認し、問題を修正してください。"
      : "Please check your configuration and fix the issue."
  );
}
