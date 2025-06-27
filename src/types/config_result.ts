/**
 * Result type for handling success and error cases without exceptions
 * Following the totality principle from docs/totality.md
 */

/**
 * Success case of Result type
 */
export type Success<T> = {
  success: true;
  data: T;
};

/**
 * Failure case of Result type
 */
export type Failure<E> = {
  success: false;
  error: E;
};

/**
 * Result type that represents either success or failure
 */
export type ConfigResult<T, E = ConfigError> = Success<T> | Failure<E>;

/**
 * Type-safe error definitions for configuration operations
 */
export type ConfigError =
  | FileNotFoundError
  | ParseError
  | ConfigValidationError
  | PathError
  | UnknownError;

export type ConfigValidationError = {
  kind: "validationError";
  errors: ValidationError[];
  path: string;
};

export type FileNotFoundError = {
  kind: "fileNotFound";
  path: string;
  message: string;
};

export type ParseError = {
  kind: "parseError";
  path: string;
  line: number;
  column: number;
  message: string;
};

export interface ValidationError {
  field: string;
  value: unknown;
  expectedType: string;
  message?: string;
}

export type PathError = {
  kind: "pathError";
  path: string;
  reason: PathErrorReason;
  message?: string;
};

export type PathErrorReason =
  | "pathTraversal"
  | "absoluteNotAllowed"
  | "invalidCharacters"
  | "tooLong"
  | "empty";

export type UnknownError = {
  kind: "unknownError";
  message: string;
  originalError?: unknown;
};

/**
 * Helper functions for working with Result types
 */
export const Result = {
  /**
   * Creates a success result
   */
  ok<T>(data: T): Success<T> {
    return { success: true, data };
  },

  /**
   * Creates a failure result
   */
  err<E>(error: E): Failure<E> {
    return { success: false, error };
  },

  /**
   * Checks if a result is successful
   */
  isOk<T, E>(result: ConfigResult<T, E>): result is Success<T> {
    return result.success === true;
  },

  /**
   * Checks if a result is a failure
   */
  isErr<T, E>(result: ConfigResult<T, E>): result is Failure<E> {
    return result.success === false;
  },

  /**
   * Maps a success value to a new value
   */
  map<T, U, E>(
    result: ConfigResult<T, E>,
    fn: (value: T) => U
  ): ConfigResult<U, E> {
    if (result.success) {
      return Result.ok(fn(result.data));
    }
    return result;
  },

  /**
   * Maps an error value to a new error
   */
  mapErr<T, E, F>(
    result: ConfigResult<T, E>,
    fn: (error: E) => F
  ): ConfigResult<T, F> {
    if (!result.success) {
      return Result.err(fn(result.error));
    }
    return result as Success<T>;
  },

  /**
   * Chains operations that return Result types
   */
  flatMap<T, U, E>(
    result: ConfigResult<T, E>,
    fn: (value: T) => ConfigResult<U, E>
  ): ConfigResult<U, E> {
    if (result.success) {
      return fn(result.data);
    }
    return result;
  },

  /**
   * Unwraps the value or returns a default
   */
  unwrapOr<T, E>(result: ConfigResult<T, E>, defaultValue: T): T {
    if (result.success) {
      return result.data;
    }
    return defaultValue;
  },

  /**
   * Unwraps the value or throws an error
   * Note: This should be used sparingly, only when absolutely necessary
   */
  unwrap<T, E>(result: ConfigResult<T, E>): T {
    if (result.success) {
      return result.data;
    }
    throw new Error(`Unwrap called on error result: ${JSON.stringify(result.error)}`);
  },
};