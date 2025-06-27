/**
 * 統合エラー管理システム - メインエクスポート
 *
 * UnifiedError型ベースの統一エラーハンドリングシステム
 * ConfigError・ErrorCodeの二重管理を解消し、
 * 国際化対応とデバッグ情報分離を実現
 */

// 基本エラー型定義
export { ErrorFactories, ErrorGuards } from "./unified_errors.ts";

export type {
  ConfigFileNotFoundError,
  ConfigNotLoadedError,
  ConfigParseError,
  ConfigValidationError,
  FileSystemError,
  InvalidProfileNameError,
  PathErrorReason,
  PathValidationError,
  RequiredFieldMissingError,
  TypeMismatchError,
  UnifiedError,
  UnknownError,
  UserConfigInvalidError,
  ValidationViolation,
} from "./unified_errors.ts";

// 統合エラー管理クラス
export { errorManager, ErrorUtils, UnifiedErrorManager } from "./unified_error_manager.ts";

export type {
  DebugInfo,
  ErrorDetails,
  ErrorSeverity,
  MessageParams,
  SupportedLanguage,
  UserFacingError,
} from "./unified_error_manager.ts";

// ConfigManager専用エラー
export { ConfigManagerErrors, ConfigManagerMessages } from "./config_manager_errors.ts";

export type { ConfigManagerContext } from "./config_manager_errors.ts";

// レガシー互換性アダプター
export {
  convertConfigErrorToUnified,
  convertUnifiedToConfigError,
  isLegacyConfigError,
  isUnifiedError,
  normalizeError,
} from "./legacy_adapter.ts";

// レガシーErrorCode変換
export { convertLegacyError, ErrorCodeMapping, isErrorCode } from "./error_code_mapping.ts";

// レガシー型（段階的廃止予定）
export { ErrorCode, ErrorManager } from "../error_manager.ts";

// Result型（UnifiedError統合済み）
export { Result } from "../types/unified_result.ts";

// Legacy Result型（互換性維持）
export { type ConfigResult, type Failure, type Success } from "../types/config_result.ts";

// throw_to_result utilities
export { errorCodeToUnifiedError, userConfigErrorToResult } from "./throw_to_result.ts";

/**
 * 廃止予定の互換性関数（移行期間用）
 * @deprecated Use ConfigManagerErrors instead
 */
export { UnifiedErrorI18n, unifiedI18n } from "./unified_error_i18n.ts";

/**
 * @deprecated Use errorManager instead
 */
export { i18nError, I18nErrorManager } from "./i18n_message_system.ts";

// Export ErrorHandlingUtils
export * from "./error_handling_utils.ts";
