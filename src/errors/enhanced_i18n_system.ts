/**
 * Enhanced Internationalization System for Unified Error Messages
 *
 * This module provides a comprehensive i18n system specifically designed
 * for the unified error interface, supporting multiple languages,
 * parameterized messages, and flexible formatting.
 */

import { ErrorCodeRegistry, StandardErrorCode } from "./standardized_error_codes.ts";
import { BaseErrorInterface, ErrorCategory, ErrorSeverity } from "./unified_error_interface.ts";

/**
 * Supported languages with their ISO codes
 */
export enum SupportedLanguage {
  ENGLISH = "en",
  JAPANESE = "ja",
  SPANISH = "es",
  FRENCH = "fr",
  GERMAN = "de",
  CHINESE_SIMPLIFIED = "zh-CN",
  CHINESE_TRADITIONAL = "zh-TW",
  KOREAN = "ko",
}

/**
 * Message parameter types for type-safe interpolation
 */
export type MessageParams = {
  [key: string]: string | number | boolean | Date | null | undefined;
};

/**
 * Plural form handling for different languages
 */
export enum PluralForm {
  ZERO = "zero",
  ONE = "one",
  TWO = "two",
  FEW = "few",
  MANY = "many",
  OTHER = "other",
}

/**
 * Message template with pluralization support
 */
export interface MessageTemplate {
  /** Default message template */
  default: string;
  /** Plural forms for different counts */
  plural?: Partial<Record<PluralForm, string>>;
  /** Context-specific variations */
  context?: Record<string, string>;
}

/**
 * Complete message definition for an error code
 */
export interface ErrorMessageDefinition {
  /** Primary error message */
  message: MessageTemplate;
  /** Short description */
  description: MessageTemplate;
  /** Detailed explanation */
  details?: MessageTemplate;
  /** Recovery suggestions */
  recoverySuggestions?: MessageTemplate[];
  /** User-friendly title */
  title?: MessageTemplate;
}

/**
 * Language-specific message bundle
 */
export type LanguageBundle = Record<StandardErrorCode, ErrorMessageDefinition>;

/**
 * Message formatting context
 */
export interface MessageContext {
  /** Parameters for interpolation */
  params?: MessageParams;
  /** Count for pluralization */
  count?: number;
  /** Context key for variations */
  contextKey?: string;
  /** Target language */
  language?: SupportedLanguage;
  /** Fallback language */
  fallbackLanguage?: SupportedLanguage;
}

/**
 * Enhanced I18n message manager
 */
export class EnhancedI18nManager {
  private static instance: EnhancedI18nManager;
  private currentLanguage: SupportedLanguage = SupportedLanguage.ENGLISH;
  private fallbackLanguage: SupportedLanguage = SupportedLanguage.ENGLISH;
  private messageBundles: Map<SupportedLanguage, LanguageBundle> = new Map();
  private pluralRules: Map<SupportedLanguage, Intl.PluralRules> = new Map();

  private constructor() {
    this.initializePluralRules();
    this.loadDefaultMessages();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EnhancedI18nManager {
    if (!EnhancedI18nManager.instance) {
      EnhancedI18nManager.instance = new EnhancedI18nManager();
    }
    return EnhancedI18nManager.instance;
  }

  /**
   * Initialize plural rules for supported languages
   */
  private initializePluralRules(): void {
    Object.values(SupportedLanguage).forEach((lang) => {
      try {
        this.pluralRules.set(lang, new Intl.PluralRules(lang));
      } catch (error) {
        // Fallback to English plural rules if language not supported
        this.pluralRules.set(lang, new Intl.PluralRules(SupportedLanguage.ENGLISH));
      }
    });
  }

  /**
   * Load default message bundles
   */
  private loadDefaultMessages(): void {
    // English messages (default)
    const englishBundle: LanguageBundle = this.createEnglishBundle();
    this.messageBundles.set(SupportedLanguage.ENGLISH, englishBundle);

    // Japanese messages
    const japaneseBundle: LanguageBundle = this.createJapaneseBundle();
    this.messageBundles.set(SupportedLanguage.JAPANESE, japaneseBundle);
  }

  /**
   * Create English message bundle
   */
  private createEnglishBundle(): LanguageBundle {
    const bundle: Partial<LanguageBundle> = {};

    Object.values(StandardErrorCode).forEach((code) => {
      const metadata = ErrorCodeRegistry[code];
      if (metadata) {
        (bundle as Record<string, unknown>)[code] = {
          message: {
            default: metadata.description,
          },
          description: {
            default: metadata.description,
          },
          details: metadata.details
            ? {
              default: metadata.details,
            }
            : undefined,
          recoverySuggestions: metadata.recoverySuggestions?.map((suggestion) => ({
            default: suggestion,
          })),
          title: {
            default: `${metadata.category.toUpperCase()} Error`,
          },
        };
      }
    });

    return bundle as LanguageBundle;
  }

  /**
   * Create Japanese message bundle
   */
  private createJapaneseBundle(): LanguageBundle {
    const bundle: Partial<LanguageBundle> = {};

    // Configuration errors in Japanese
    bundle[StandardErrorCode.CF_CONFIG_FILE_NOT_FOUND] = {
      message: { default: "設定ファイルが見つかりません: {path}" },
      description: { default: "指定されたパスに設定ファイルが存在しません" },
      details: { default: "必要な設定ファイルが指定されたパスで見つかりませんでした" },
      recoverySuggestions: [
        { default: "ファイルパスが正しいか確認してください" },
        { default: "ファイルの権限を確認してください" },
        { default: "デフォルト値で設定ファイルを作成してください" },
      ],
      title: { default: "設定エラー" },
    };

    bundle[StandardErrorCode.CF_CONFIG_PARSE_ERROR] = {
      message: { default: "設定ファイルの解析に失敗しました: {path}" },
      description: { default: "設定ファイルの構文解析に失敗しました" },
      details: { default: "設定ファイルに無効な構文または構造が含まれています" },
      recoverySuggestions: [
        { default: "YAML/JSON構文を検証してください" },
        { default: "引用符や括弧の不足をチェックしてください" },
        { default: "構文検証ツールを使用してください" },
      ],
      title: { default: "設定エラー" },
    };

    // Add more Japanese translations as needed...
    // For brevity, showing only a few examples

    return bundle as LanguageBundle;
  }

  /**
   * Set current language
   */
  public setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
  }

  /**
   * Set fallback language
   */
  public setFallbackLanguage(language: SupportedLanguage): void {
    this.fallbackLanguage = language;
  }

  /**
   * Get current language
   */
  public getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Register custom message bundle
   */
  public registerMessageBundle(language: SupportedLanguage, bundle: LanguageBundle): void {
    this.messageBundles.set(language, bundle);
  }

  /**
   * Get localized error message
   */
  public getErrorMessage(
    error: BaseErrorInterface,
    context?: MessageContext,
  ): string {
    const code = error.code;
    const language = context?.language || this.currentLanguage;
    const params = { ...error.context, ...context?.params };

    const messageDefinition = this.getMessageDefinition(code, language);
    if (!messageDefinition) {
      return `Unknown error: ${code}`;
    }

    return this.formatMessage(messageDefinition.message, {
      ...context,
      params: params as MessageParams,
      language,
    });
  }

  /**
   * Get error title
   */
  public getErrorTitle(
    error: BaseErrorInterface,
    context?: MessageContext,
  ): string {
    const code = error.code;
    const language = context?.language || this.currentLanguage;

    const messageDefinition = this.getMessageDefinition(code, language);
    if (!messageDefinition?.title) {
      return `Error ${code}`;
    }

    return this.formatMessage(messageDefinition.title, {
      ...context,
      language,
    });
  }

  /**
   * Get error description
   */
  public getErrorDescription(
    error: BaseErrorInterface,
    context?: MessageContext,
  ): string {
    const code = error.code;
    const language = context?.language || this.currentLanguage;

    const messageDefinition = this.getMessageDefinition(code, language);
    if (!messageDefinition) {
      return `Unknown error: ${code}`;
    }

    return this.formatMessage(messageDefinition.description, {
      ...context,
      language,
    });
  }

  /**
   * Get error details
   */
  public getErrorDetails(
    error: BaseErrorInterface,
    context?: MessageContext,
  ): string | undefined {
    const code = error.code;
    const language = context?.language || this.currentLanguage;

    const messageDefinition = this.getMessageDefinition(code, language);
    if (!messageDefinition?.details) {
      return undefined;
    }

    return this.formatMessage(messageDefinition.details, {
      ...context,
      language,
    });
  }

  /**
   * Get recovery suggestions
   */
  public getRecoverySuggestions(
    error: BaseErrorInterface,
    context?: MessageContext,
  ): string[] {
    const code = error.code;
    const language = context?.language || this.currentLanguage;

    const messageDefinition = this.getMessageDefinition(code, language);
    if (!messageDefinition?.recoverySuggestions) {
      return [];
    }

    return messageDefinition.recoverySuggestions.map((template) =>
      this.formatMessage(template, {
        ...context,
        language,
      })
    );
  }

  /**
   * Get complete error information
   */
  public getCompleteErrorInfo(
    error: BaseErrorInterface,
    context?: MessageContext,
  ): {
    title: string;
    message: string;
    description: string;
    details?: string;
    recoverySuggestions: string[];
  } {
    return {
      title: this.getErrorTitle(error, context),
      message: this.getErrorMessage(error, context),
      description: this.getErrorDescription(error, context),
      details: this.getErrorDetails(error, context),
      recoverySuggestions: this.getRecoverySuggestions(error, context),
    };
  }

  /**
   * Get message definition for error code and language
   */
  private getMessageDefinition(
    code: StandardErrorCode,
    language: SupportedLanguage,
  ): ErrorMessageDefinition | undefined {
    let bundle = this.messageBundles.get(language);

    // Try fallback language if not found
    if (!bundle || !bundle[code]) {
      bundle = this.messageBundles.get(this.fallbackLanguage);
    }

    return bundle?.[code];
  }

  /**
   * Format message template with parameters
   */
  private formatMessage(
    template: MessageTemplate,
    context: MessageContext,
  ): string {
    let message = template.default;

    // Handle pluralization
    if (template.plural && context.count !== undefined) {
      const pluralRule = this.pluralRules.get(context.language || this.currentLanguage);
      if (pluralRule) {
        const pluralForm = pluralRule.select(context.count) as PluralForm;
        message = template.plural[pluralForm] || template.default;
      }
    }

    // Handle context variations
    if (template.context && context.contextKey) {
      message = template.context[context.contextKey] || message;
    }

    // Interpolate parameters
    if (context.params) {
      Object.entries(context.params).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        const replacement = this.formatValue(value, context.language);
        message = message.replace(new RegExp(placeholder, "g"), replacement);
      });
    }

    return message;
  }

  /**
   * Format parameter value based on type and locale
   */
  private formatValue(value: unknown, language?: SupportedLanguage): string {
    if (value === null || value === undefined) {
      return "";
    }

    if (value instanceof Date) {
      return value.toLocaleString(language || this.currentLanguage);
    }

    if (typeof value === "number") {
      return value.toLocaleString(language || this.currentLanguage);
    }

    return String(value);
  }

  /**
   * Check if language is supported
   */
  public isLanguageSupported(language: string): language is SupportedLanguage {
    return Object.values(SupportedLanguage).includes(language as SupportedLanguage);
  }

  /**
   * Get available languages
   */
  public getAvailableLanguages(): SupportedLanguage[] {
    return Array.from(this.messageBundles.keys());
  }

  /**
   * Load messages from external source (JSON, API, etc.)
   */
  public async loadMessagesFromSource(
    language: SupportedLanguage,
    source: string | (() => Promise<LanguageBundle>),
  ): Promise<void> {
    try {
      let bundle: LanguageBundle;

      if (typeof source === "string") {
        // Load from URL or file path
        if (source.startsWith("http")) {
          const response = await fetch(source);
          bundle = await response.json();
        } else {
          // Assume it's a file path (for Deno)
          const content = await Deno.readTextFile(source);
          bundle = JSON.parse(content);
        }
      } else {
        // Load from function
        bundle = await source();
      }

      this.messageBundles.set(language, bundle);
    } catch (error) {
      console.warn(`Failed to load messages for ${language}:`, error);
    }
  }
}

/**
 * Convenience singleton instance
 */
export const enhancedI18n = EnhancedI18nManager.getInstance();

/**
 * Utility functions for error message formatting
 */
export class ErrorMessageUtils {
  /**
   * Create user-friendly error message
   */
  static createUserFriendlyMessage(
    error: BaseErrorInterface,
    context?: MessageContext,
  ): string {
    const info = enhancedI18n.getCompleteErrorInfo(error, context);

    let message = info.title;
    if (info.message !== info.title) {
      message += `: ${info.message}`;
    }

    if (info.details) {
      message += `\n\nDetails: ${info.details}`;
    }

    if (info.recoverySuggestions.length > 0) {
      message += `\n\nSuggestions:`;
      info.recoverySuggestions.forEach((suggestion, index) => {
        message += `\n${index + 1}. ${suggestion}`;
      });
    }

    return message;
  }

  /**
   * Create technical error message for debugging
   */
  static createTechnicalMessage(error: BaseErrorInterface): string {
    const lines = [
      `Error Code: ${error.code}`,
      `Category: ${error.category}`,
      `Severity: ${error.severity}`,
      `Timestamp: ${error.timestamp.toISOString()}`,
      `Message: ${error.message}`,
    ];

    if (error.context) {
      lines.push(`Context: ${JSON.stringify(error.context, null, 2)}`);
    }

    if (error.cause) {
      lines.push(`Caused by: ${error.cause.message}`);
    }

    if (error.stackTrace) {
      lines.push(`Stack trace:\n${error.stackTrace}`);
    }

    if (error.correlationId) {
      lines.push(`Correlation ID: ${error.correlationId}`);
    }

    return lines.join("\n");
  }

  /**
   * Create JSON representation of error
   */
  static createJsonMessage(error: BaseErrorInterface): string {
    return JSON.stringify(
      {
        code: error.code,
        category: error.category,
        severity: error.severity,
        message: error.message,
        timestamp: error.timestamp.toISOString(),
        context: error.context,
        correlationId: error.correlationId,
        stackTrace: error.stackTrace,
      },
      null,
      2,
    );
  }
}
