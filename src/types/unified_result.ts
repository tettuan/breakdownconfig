/**
 * Unified Result type using UnifiedError for consistent error handling
 * This replaces ConfigResult to provide a single Result type for the entire application
 */

import type { UnifiedError } from "../errors/unified_errors.ts";

/**
 * Success case of Result type
 */
export type Success<T> = {
  readonly success: true;
  readonly data: T;
};

/**
 * Failure case of Result type
 */
export type Failure<E = UnifiedError> = {
  readonly success: false;
  readonly error: E;
};

/**
 * Result type that represents either success or failure
 */
export type Result<T, E = UnifiedError> = Success<T> | Failure<E>;

/**
 * Helper functions for working with Result types
 */
export const Result: {
  ok<T>(data: T): Success<T>;
  err<E = UnifiedError>(error: E): Failure<E>;
  success<T>(data: T): Success<T>;
  failure<E = UnifiedError>(error: E): Failure<E>;
  isOk<T, E>(result: Result<T, E>): result is Success<T>;
  isErr<T, E>(result: Result<T, E>): result is Failure<E>;
  map<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E>;
  mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F>;
  flatMap<T, U, E>(result: Result<T, E>, fn: (data: T) => Result<U, E>): Result<U, E>;
  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T;
  unwrap<T, E>(result: Result<T, E>): T;
  unwrapErr<T, E>(result: Result<T, E>): E;
  all<T, E>(results: Result<T, E>[]): Result<T[], E>;
  allSettled<T, E>(results: Result<T, E>[]): Result<T, E>[];
  match<T, E, R>(result: Result<T, E>, onOk: (data: T) => R, onErr: (error: E) => R): R;
  orElse<T, E, F>(result: Result<T, E>, fn: (error: E) => Result<T, F>): Result<T, F>;
  andThen<T, U, E>(result: Result<T, E>, fn: (data: T) => Result<U, E>): Result<U, E>;
  tap<T, E>(result: Result<T, E>, fn: (data: T) => void): Result<T, E>;
  tapErr<T, E>(result: Result<T, E>, fn: (error: E) => void): Result<T, E>;
  fromPromise<T>(
    promise: Promise<T>,
    errorMapper?: (error: unknown) => UnifiedError,
  ): Promise<Result<T, UnifiedError>>;
} = {
  /**
   * Creates a success result
   */
  ok<T>(data: T): Success<T> {
    return { success: true, data };
  },

  /**
   * Creates a failure result
   */
  err<E = UnifiedError>(error: E): Failure<E> {
    return { success: false, error };
  },

  /**
   * Creates a success result (alias for ok)
   */
  success<T>(data: T): Success<T> {
    return { success: true, data };
  },

  /**
   * Creates a failure result (alias for err)
   */
  failure<E = UnifiedError>(error: E): Failure<E> {
    return { success: false, error };
  },

  /**
   * Checks if a result is successful
   */
  isOk<T, E>(result: Result<T, E>): result is Success<T> {
    return result.success === true;
  },

  /**
   * Checks if a result is a failure
   */
  isErr<T, E>(result: Result<T, E>): result is Failure<E> {
    return result.success === false;
  },

  /**
   * Maps a success value to a new value
   */
  map<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => U,
  ): Result<U, E> {
    if (result.success) {
      return Result.ok(fn(result.data));
    }
    return result;
  },

  /**
   * Maps an error value to a new error
   */
  mapErr<T, E, F>(
    result: Result<T, E>,
    fn: (error: E) => F,
  ): Result<T, F> {
    if (!result.success) {
      return Result.err(fn(result.error));
    }
    return result as Success<T>;
  },

  /**
   * Chains operations that return Result types
   */
  flatMap<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>,
  ): Result<U, E> {
    if (result.success) {
      return fn(result.data);
    }
    return result;
  },

  /**
   * Unwraps the value or returns a default
   */
  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    if (result.success) {
      return result.data;
    }
    return defaultValue;
  },

  /**
   * Unwraps the value or throws an error
   * Note: This should be used sparingly, only at system boundaries
   */
  unwrap<T, E>(result: Result<T, E>): T {
    if (result.success) {
      return result.data;
    }
    throw new Error(`Unwrap called on error result: ${JSON.stringify(result.error)}`);
  },

  /**
   * Converts multiple Results into a single Result containing an array
   */
  all<T, E>(results: Result<T, E>[]): Result<T[], E> {
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
   * Unwraps the error or throws if result is Ok
   */
  unwrapErr<T, E>(result: Result<T, E>): E {
    if (!result.success) {
      return result.error;
    }
    throw new Error(`UnwrapErr called on success result`);
  },

  /**
   * Returns array of all results, regardless of success/failure
   */
  allSettled<T, E>(results: Result<T, E>[]): Result<T, E>[] {
    return results;
  },

  /**
   * Pattern matching for Result type
   */
  match<T, E, R>(
    result: Result<T, E>,
    onOk: (data: T) => R,
    onErr: (error: E) => R,
  ): R {
    if (result.success) {
      return onOk(result.data);
    }
    return onErr(result.error);
  },

  /**
   * Transforms an error result into a success result
   */
  orElse<T, E, F>(
    result: Result<T, E>,
    fn: (error: E) => Result<T, F>,
  ): Result<T, F> {
    if (!result.success) {
      return fn(result.error);
    }
    return result as Success<T>;
  },

  /**
   * Alias for flatMap for monadic chaining
   */
  andThen<T, U, E>(
    result: Result<T, E>,
    fn: (data: T) => Result<U, E>,
  ): Result<U, E> {
    return Result.flatMap(result, fn);
  },

  /**
   * Performs a side effect on success value without changing the result
   */
  tap<T, E>(
    result: Result<T, E>,
    fn: (data: T) => void,
  ): Result<T, E> {
    if (result.success) {
      fn(result.data);
    }
    return result;
  },

  /**
   * Performs a side effect on error value without changing the result
   */
  tapErr<T, E>(
    result: Result<T, E>,
    fn: (error: E) => void,
  ): Result<T, E> {
    if (!result.success) {
      fn(result.error);
    }
    return result;
  },

  /**
   * Converts a Promise to a Result, catching thrown errors
   */
  fromPromise: fromPromiseImpl,
};

async function fromPromiseImpl<T>(
  promise: Promise<T>,
  errorMapper?: (error: unknown) => UnifiedError,
): Promise<Result<T, UnifiedError>> {
  try {
    const value = await promise;
    return Result.ok(value);
  } catch (error) {
    if (errorMapper) {
      return Result.err(errorMapper(error));
    }
    // Default error mapping
    const errorMessage = error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error);
    return Result.err({
      kind: "UNKNOWN_ERROR",
      originalError: error,
      message: errorMessage,
      timestamp: new Date(),
      stackTrace: error && typeof error === "object" && "stack" in error
        ? String(error.stack)
        : undefined,
    } as UnifiedError);
  }
}
