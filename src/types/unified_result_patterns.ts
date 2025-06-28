/**
 * Pattern 3: Result API Chaining Operations
 * Pattern 4: Result API Error Recovery
 *
 * These patterns provide advanced Result API operations for complex workflows
 */

import { Failure as _Failure, Result, Success as _Success } from "./unified_result.ts";
import { ErrorFactories, UnifiedError } from "../errors/unified_errors.ts";

/**
 * Pattern 3: Advanced chaining operations
 */
export const ResultChaining = {
  /**
   * Chain multiple operations that each return a Result
   * Stops at first error, otherwise continues the chain
   */
  chain<T, U, V, E>(
    initial: Result<T, E>,
    step1: (value: T) => Result<U, E>,
    step2: (value: U) => Result<V, E>,
  ): Result<V, E> {
    return Result.flatMap(
      Result.flatMap(initial, step1),
      step2,
    );
  },

  /**
   * Chain operations with different error types, converting to unified error
   */
  chainWithErrorConversion<T, U, V>(
    initial: Result<T, UnifiedError>,
    step1: (value: T) => Result<U, Error>,
    step2: (value: U) => Result<V, string>,
    errorConverter: (error: Error | string) => UnifiedError,
  ): Result<V, UnifiedError> {
    const step1Converted = Result.flatMap(initial, (value) => {
      const result = step1(value);
      return Result.isErr(result)
        ? Result.err(errorConverter(result.error))
        : Result.ok(result.data);
    });

    return Result.flatMap(step1Converted, (value) => {
      const result = step2(value);
      return Result.isErr(result)
        ? Result.err(errorConverter(result.error))
        : Result.ok(result.data);
    });
  },

  /**
   * Parallel execution with error aggregation
   */
  async parallel<T, E>(
    operations: (() => Promise<Result<T, E>>)[],
  ): Promise<Result<T[], E[]>> {
    const results = await Promise.all(operations.map((op) => op()));
    const successes: T[] = [];
    const errors: E[] = [];

    for (const result of results) {
      if (Result.isOk(result)) {
        successes.push(result.data);
      } else {
        errors.push(result.error);
      }
    }

    return errors.length === 0 ? Result.ok(successes) : Result.err(errors);
  },

  /**
   * Conditional chaining based on predicate
   */
  chainIf<T, U, E>(
    result: Result<T, E>,
    predicate: (value: T) => boolean,
    operation: (value: T) => Result<U, E>,
    defaultValue: U,
  ): Result<U, E> {
    return Result.flatMap(result, (value) => {
      return predicate(value) ? operation(value) : Result.ok(defaultValue);
    });
  },
};

/**
 * Pattern 4: Error recovery strategies
 */
export const ResultRecovery = {
  /**
   * Retry operation with exponential backoff
   */
  async retry<T>(
    operation: () => Promise<Result<T, UnifiedError>>,
    maxAttempts: number = 3,
    baseDelayMs: number = 100,
  ): Promise<Result<T, UnifiedError>> {
    let lastError: UnifiedError | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const result = await operation();
      if (Result.isOk(result)) {
        return result;
      }

      lastError = result.error;

      // Don't retry validation errors
      if (result.error.kind === "CONFIG_VALIDATION_ERROR") {
        return result;
      }
    }

    return Result.err(lastError!);
  },

  /**
   * Fallback chain with multiple recovery strategies
   */
  async fallbackChain<T>(
    primary: () => Promise<Result<T, UnifiedError>>,
    fallbacks: (() => Promise<Result<T, UnifiedError>>)[],
    defaultValue?: T,
  ): Promise<Result<T, UnifiedError>> {
    // Try primary
    const primaryResult = await primary();
    if (Result.isOk(primaryResult)) {
      return primaryResult;
    }

    // Try fallbacks in order
    for (const fallback of fallbacks) {
      const fallbackResult = await fallback();
      if (Result.isOk(fallbackResult)) {
        return fallbackResult;
      }
    }

    // Use default if provided
    if (defaultValue !== undefined) {
      return Result.ok(defaultValue);
    }

    // Return the primary error if no fallbacks worked
    return primaryResult;
  },

  /**
   * Circuit breaker pattern
   */
  createCircuitBreaker<T>(
    operation: () => Promise<Result<T, UnifiedError>>,
    failureThreshold: number = 5,
    resetTimeoutMs: number = 60000,
  ) {
    let state: "closed" | "open" | "half-open" = "closed";
    let failures = 0;
    let lastFailureTime = 0;

    return async (): Promise<Result<T, UnifiedError>> => {
      const now = Date.now();

      // Check if circuit should reset
      if (state === "open" && now - lastFailureTime > resetTimeoutMs) {
        state = "half-open";
        failures = 0;
      }

      // Reject if circuit is open
      if (state === "open") {
        return Result.err(ErrorFactories.unknown(
          new Error("Circuit breaker is open"),
          "circuit-breaker",
        ));
      }

      try {
        const result = await operation();

        if (Result.isOk(result)) {
          // Success - reset circuit
          state = "closed";
          failures = 0;
          return result;
        } else {
          // Failure - increment counter
          failures++;
          lastFailureTime = now;

          if (failures >= failureThreshold) {
            state = "open";
          }

          return result;
        }
      } catch (error) {
        failures++;
        lastFailureTime = now;

        if (failures >= failureThreshold) {
          state = "open";
        }

        return Result.err(ErrorFactories.unknown(error, "circuit-breaker"));
      }
    };
  },

  /**
   * Graceful degradation with partial success
   */
  async gracefulDegrade<T, P>(
    operations: {
      essential: () => Promise<Result<T, UnifiedError>>;
      optional: (() => Promise<Result<P, UnifiedError>>)[];
    },
  ): Promise<Result<{ essential: T; optional: P[] }, UnifiedError>> {
    // Essential operation must succeed
    const essentialResult = await operations.essential();
    if (Result.isErr(essentialResult)) {
      return essentialResult;
    }

    // Optional operations - collect successes, ignore failures
    const optionalResults: P[] = [];
    for (const optionalOp of operations.optional) {
      try {
        const result = await optionalOp();
        if (Result.isOk(result)) {
          optionalResults.push(result.data);
        }
        // Silently ignore optional failures
      } catch {
        // Silently ignore optional errors
      }
    }

    return Result.ok({
      essential: essentialResult.data,
      optional: optionalResults,
    });
  },

  /**
   * Error recovery with context preservation
   */
  recoverWithContext<T, C>(
    result: Result<T, UnifiedError>,
    context: C,
    recoveryStrategies: {
      [K in UnifiedError["kind"]]?: (error: UnifiedError, context: C) => Result<T, UnifiedError>;
    },
  ): Result<T, UnifiedError> {
    if (Result.isOk(result)) {
      return result;
    }

    const strategy = recoveryStrategies[result.error.kind];
    if (strategy) {
      return strategy(result.error, context);
    }

    return result;
  },
};
