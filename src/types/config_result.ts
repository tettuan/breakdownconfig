/**
 * Result type for handling success and error cases without exceptions
 * Following the totality principle from docs/totality.md
 *
 * Complete implementation with all utility methods for robust error handling
 * Compatible with JSR publication requirements
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
  kind: "configValidationError";
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
    fn: (value: T) => U,
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
    fn: (error: E) => F,
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
    fn: (value: T) => ConfigResult<U, E>,
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

  /**
   * Chains error recovery operations that return Result types
   */
  flatMapErr<T, E, F>(
    result: ConfigResult<T, E>,
    fn: (error: E) => ConfigResult<T, F>,
  ): ConfigResult<T, F> {
    if (!result.success) {
      return fn(result.error);
    }
    return result as Success<T>;
  },

  /**
   * Unwraps the value or computes a default using a function
   */
  unwrapOrElse<T, E>(
    result: ConfigResult<T, E>,
    fn: (error: E) => T,
  ): T {
    if (result.success) {
      return result.data;
    }
    return fn(result.error);
  },

  /**
   * Pattern matching for ConfigResult type
   */
  match<T, E, R>(
    result: ConfigResult<T, E>,
    onSuccess: (data: T) => R,
    onError: (error: E) => R,
  ): R {
    if (result.success) {
      return onSuccess(result.data);
    }
    return onError(result.error);
  },

  /**
   * Provides an alternative Result on error (alias for flatMapErr)
   */
  orElse<T, E, F>(
    result: ConfigResult<T, E>,
    fn: (error: E) => ConfigResult<T, F>,
  ): ConfigResult<T, F> {
    return Result.flatMapErr(result, fn);
  },

  /**
   * Alias for flatMap for better readability in some contexts
   */
  andThen<T, U, E>(
    result: ConfigResult<T, E>,
    fn: (value: T) => ConfigResult<U, E>,
  ): ConfigResult<U, E> {
    return Result.flatMap(result, fn);
  },

  /**
   * Performs a side effect on success without changing the result
   */
  tap<T, E>(
    result: ConfigResult<T, E>,
    fn: (data: T) => void,
  ): ConfigResult<T, E> {
    if (result.success) {
      fn(result.data);
    }
    return result;
  },

  /**
   * Performs a side effect on error without changing the result
   */
  tapErr<T, E>(
    result: ConfigResult<T, E>,
    fn: (error: E) => void,
  ): ConfigResult<T, E> {
    if (!result.success) {
      fn(result.error);
    }
    return result;
  },

  /**
   * Unwraps the error or throws if result is success
   */
  unwrapErr<T, E>(result: ConfigResult<T, E>): E {
    if (!result.success) {
      return result.error;
    }
    throw new Error(`UnwrapErr called on success result`);
  },

  /**
   * Converts multiple ConfigResults into a single ConfigResult containing an array
   * Fails fast on first error
   */
  all<T, E>(results: ConfigResult<T, E>[]): ConfigResult<T[], E> {
    const values: T[] = [];
    for (const result of results) {
      if (!result.success) {
        return result;
      }
      values.push(result.data);
    }
    return Result.ok(values);
  },

  /**
   * Returns array of all results, regardless of success/failure
   */
  allSettled<T, E>(results: ConfigResult<T, E>[]): ConfigResult<T, E>[] {
    return results;
  },

  /**
   * Converts a Promise to a ConfigResult
   */
  async fromPromise<T>(
    promise: Promise<T>,
    errorMapper?: (error: unknown) => ConfigError,
  ): Promise<ConfigResult<T, ConfigError>> {
    try {
      const data = await promise;
      return Result.ok(data);
    } catch (error) {
      const mappedError = errorMapper ? errorMapper(error) : {
        kind: "unknownError" as const,
        message: error && typeof error === "object" && "message" in error
          ? String(error.message)
          : String(error),
        originalError: error,
      };
      return Result.err(mappedError);
    }
  },
};
