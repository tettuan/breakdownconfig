/**
 * Debug Logger Utility
 * 
 * Provides logging functionality for debugging purposes.
 * Logs are only output when LOG_LEVEL=debug is set in the environment.
 */

/**
 * Log a debug message if debug logging is enabled
 * @param message - The message to log
 */
export function debug(message: string): void {
  if (Deno.env.get("LOG_LEVEL") === "debug") {
    console.debug(`[DEBUG] ${message}`);
  }
}

// デバッグ用ロガー - 詳細なチェックポイントログを提供

// LogLevelの定義
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  ERROR = "error"
}

// loggerオブジェクトの定義
export const logger = {
  debug: function(message: string, data?: unknown): void {
    if (Deno.env.get("DEBUG") === "true" || Deno.env.get("LOG_LEVEL") === "debug") {
      if (data !== undefined) {
        // データが大きい場合は切り詰める
        let dataStr = "";
        if (typeof data === 'object') {
          try {
            dataStr = JSON.stringify(data);
            if (dataStr.length > 100) {
              dataStr = dataStr.substring(0, 100) + "...";
            }
          } catch (e) {
            dataStr = String(data);
          }
        } else {
          dataStr = String(data);
        }
        console.debug(message, dataStr);
      } else {
        console.debug(message);
      }
    }
  },
  
  info: function(message: string, data?: unknown): void {
    if (Deno.env.get("LOG_LEVEL") !== "error") {
      if (data !== undefined) {
        let dataStr = "";
        if (typeof data === 'object') {
          try {
            dataStr = JSON.stringify(data);
            if (dataStr.length > 100) {
              dataStr = dataStr.substring(0, 100) + "...";
            }
          } catch (e) {
            dataStr = String(data);
          }
        } else {
          dataStr = String(data);
        }
        console.info(message, dataStr);
      } else {
        console.info(message);
      }
    }
  },
  
  error: function(message: string, data?: unknown): void {
    if (data !== undefined) {
      let dataStr = "";
      if (typeof data === 'object') {
        try {
          dataStr = JSON.stringify(data);
          if (dataStr.length > 100) {
            dataStr = dataStr.substring(0, 100) + "...";
          }
        } catch (e) {
          dataStr = String(data);
        }
      } else {
        dataStr = String(data);
      }
      console.error(message, dataStr);
    } else {
      console.error(message);
    }
  }
};

/**
 * 関数の入出力をログに記録するラッパー関数
 * @param name 関数名
 * @param fn 対象関数
 * @returns ラップされた関数
 */
export function logFunction<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    logger.debug(`[ENTER] ${name} with args:`, args);
    try {
      const result = fn(...args);
      
      // Promiseの場合は特別処理
      if (result instanceof Promise) {
        return result
          .then((value) => {
            logger.debug(`[EXIT] ${name} returned:`, value);
            return value;
          })
          .catch((error) => {
            logger.error(`[ERROR] ${name} threw:`, error);
            throw error;
          }) as ReturnType<T>;
      }
      
      logger.debug(`[EXIT] ${name} returned:`, result);
      return result;
    } catch (error) {
      logger.error(`[ERROR] ${name} threw:`, error);
      throw error;
    }
  };
}

/**
 * 値をログに記録するチェックポイント関数
 * @param message チェックポイントのラベル
 * @param data ログに記録する値
 * @param context 実行コンテキスト（ファイル名やテスト名など）
 */
export function checkpoint(message: string, data?: unknown, context?: string): void {
  const LOG_LEVEL = Deno.env.get("LOG_LEVEL") || "info";
  
  if (LOG_LEVEL === "debug") {
    const contextPrefix = context ? `[${context}] ` : '';
    
    if (data !== undefined) {
      let dataStr = "";
      if (typeof data === 'object') {
        try {
          dataStr = JSON.stringify(data, null, 2);
          if (dataStr.length > 100) {
            dataStr = dataStr.substring(0, 100) + "...";
          }
        } catch (e) {
          dataStr = String(data);
        }
      } else {
        dataStr = String(data);
      }
      console.log(`[CHECKPOINT] ${contextPrefix}${message}: ${dataStr}`);
    } else {
      console.log(`[CHECKPOINT] ${contextPrefix}${message}`);
    }
  }
}

/**
 * オブジェクトのプロパティをログに記録
 * @param label ログのラベル
 * @param obj 対象オブジェクト
 */
export function logObject(label: string, obj: unknown): void {
  const LOG_LEVEL = Deno.env.get("LOG_LEVEL") || "info";
  
  if (LOG_LEVEL === "debug") {
    let objStr = "";
    
    try {
      objStr = JSON.stringify(obj, null, 2);
      // 長すぎる場合は切り詰める
      if (objStr.length > 100) {
        objStr = objStr.substring(0, 100) + "...";
      }
    } catch (e) {
      objStr = String(obj);
    }
    
    console.log(`[OBJECT] ${label}: ${objStr}`);
  }
}

/**
 * 処理の開始をログに記録
 * @param section セクション名
 * @param context 実行コンテキスト（ファイル名やテスト名など）
 */
export function startSection(section: string, context?: string): void {
  const contextPrefix = context ? `[${context}] ` : '';
  logger.debug(`[START] ====== ${contextPrefix}${section} ======`);
}

/**
 * 処理の終了をログに記録
 * @param section セクション名
 * @param context 実行コンテキスト（ファイル名やテスト名など）
 */
export function endSection(section: string, context?: string): void {
  const contextPrefix = context ? `[${context}] ` : '';
  logger.debug(`[END] ====== ${contextPrefix}${section} ======`);
} 