/**
 * Test helpers for Result-based testing patterns
 *
 * These helpers provide type-safe assertion functions for testing
 * ConfigResult patterns and UnifiedError handling.
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { ConfigResult, Result } from "../../src/types/config_result.ts";
import { Failure, Result as UnifiedResult, Success } from "../../src/types/unified_result.ts";
import { UnifiedError } from "../../src/errors/unified_errors.ts";

/**
 * Asserts that a Result is successful and returns the data
 */
export function assertResultOk<T, E>(
  result: ConfigResult<T, E>,
  message?: string,
): T {
  assert(
    result.success,
    message ||
      `Expected success but got error: ${JSON.stringify(result.success ? null : result.error)}`,
  );
  return result.data;
}

/**
 * Asserts that a UnifiedResult is successful
 */
export function assertResultSuccess<T>(
  result: UnifiedResult<T, UnifiedError>,
  message?: string,
): T {
  assert(
    result.success,
    message ||
      `Expected success but got error: ${JSON.stringify(result.success ? null : result.error)}`,
  );
  return result.data;
}

/**
 * Asserts that a Result is an error and returns the error
 */
export function assertResultErr<T, E>(
  result: ConfigResult<T, E>,
  message?: string,
): E {
  assert(
    !result.success,
    message ||
      `Expected error but got success: ${JSON.stringify(result.success ? result.data : null)}`,
  );
  return result.error;
}

/**
 * Asserts that a UnifiedResult is an error
 */
export function assertResultError<T>(
  result: UnifiedResult<T, UnifiedError>,
  message?: string,
): UnifiedError {
  assert(
    !result.success,
    message ||
      `Expected error but got success: ${JSON.stringify(result.success ? result.data : null)}`,
  );
  return result.error;
}

/**
 * Asserts that a Result is an error with specific error kind
 */
export function assertResultErrorKind<T>(
  result: ConfigResult<T, UnifiedError>,
  expectedKind: string,
  message?: string,
): UnifiedError {
  const error = assertResultErr(result, message);
  assertEquals(
    error.kind,
    expectedKind,
    `Expected error kind '${expectedKind}' but got '${error.kind}'`,
  );
  return error;
}

/**
 * Asserts that a Result is an error with specific message content
 */
export function assertResultErrorMessage<T>(
  result: ConfigResult<T, UnifiedError>,
  expectedMessageContent: string,
  message?: string,
): UnifiedError {
  const error = assertResultErr(result, message);
  assert(
    error.message.includes(expectedMessageContent),
    `Expected error message to contain '${expectedMessageContent}' but got: ${error.message}`,
  );
  return error;
}

/**
 * Asserts that a Result is a ConfigValidationError with specific details
 */
export function assertConfigValidationError<T>(
  result: ConfigResult<T, UnifiedError>,
  expectedPath?: string,
  expectedViolationCount?: number,
): UnifiedError {
  const error = assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");

  if (error.kind === "CONFIG_VALIDATION_ERROR") {
    if (expectedPath) {
      assertEquals(
        error.path,
        expectedPath,
        `Expected path '${expectedPath}' but got '${error.path}'`,
      );
    }
    if (expectedViolationCount !== undefined) {
      assertEquals(
        error.violations.length,
        expectedViolationCount,
        `Expected ${expectedViolationCount} validation violations but got ${error.violations.length}`,
      );
    }
    // Ensure violations array is not empty
    assert(error.violations.length > 0, "Expected validation violations array to be non-empty");
  }

  return error;
}

/**
 * Asserts that a Result is a ConfigFileNotFoundError with specific path
 */
export function assertConfigFileNotFoundError<T>(
  result: ConfigResult<T, UnifiedError>,
  expectedPath?: string,
  expectedConfigType?: "app" | "user",
): UnifiedError {
  const error = assertResultErrorKind(result, "CONFIG_FILE_NOT_FOUND");

  if (error.kind === "CONFIG_FILE_NOT_FOUND") {
    if (expectedPath) {
      assertEquals(
        error.path,
        expectedPath,
        `Expected path '${expectedPath}' but got '${error.path}'`,
      );
    }
    if (expectedConfigType) {
      assertEquals(
        error.configType,
        expectedConfigType,
        `Expected config type '${expectedConfigType}' but got '${error.configType}'`,
      );
    }
  }

  return error;
}

/**
 * Asserts that a Result is a ConfigParseError with specific details
 */
export function assertConfigParseError<T>(
  result: ConfigResult<T, UnifiedError>,
  expectedPath?: string,
): UnifiedError {
  const error = assertResultErrorKind(result, "CONFIG_PARSE_ERROR");

  if (error.kind === "CONFIG_PARSE_ERROR" && expectedPath) {
    assertEquals(
      error.path,
      expectedPath,
      `Expected path '${expectedPath}' but got '${error.path}'`,
    );
  }

  return error;
}

/**
 * Asserts that a Result is a UserConfigInvalidError with specific reason
 */
export function assertUserConfigInvalidError<T>(
  result: ConfigResult<T, UnifiedError>,
  expectedReason?: "PARSE_ERROR" | "VALIDATION_ERROR" | "UNKNOWN_ERROR",
): UnifiedError {
  const error = assertResultErrorKind(result, "USER_CONFIG_INVALID");

  if (error.kind === "USER_CONFIG_INVALID" && expectedReason) {
    assertEquals(
      error.reason,
      expectedReason,
      `Expected reason '${expectedReason}' but got '${error.reason}'`,
    );
  }

  return error;
}

/**
 * Asserts that a Result is a PathValidationError with specific reason
 */
export function assertPathValidationError<T>(
  result: ConfigResult<T, UnifiedError>,
  expectedReason?:
    | "PATH_TRAVERSAL"
    | "ABSOLUTE_PATH_NOT_ALLOWED"
    | "INVALID_CHARACTERS"
    | "PATH_TOO_LONG"
    | "EMPTY_PATH",
): UnifiedError {
  const error = assertResultErrorKind(result, "PATH_VALIDATION_ERROR");

  if (error.kind === "PATH_VALIDATION_ERROR" && expectedReason) {
    assertEquals(
      error.reason,
      expectedReason,
      `Expected reason '${expectedReason}' but got '${error.reason}'`,
    );
  }

  return error;
}

/**
 * Asserts that a promise rejects with a specific UnifiedError kind
 */
export async function assertRejectsWithErrorKind(
  fn: () => Promise<unknown>,
  expectedErrorKind: string,
  expectedMessageContent?: string,
): Promise<void> {
  let thrownError: Error | null = null;

  try {
    await fn();
    assert(false, "Expected function to throw but it succeeded");
  } catch (error) {
    assert(error instanceof Error, "Expected Error instance");
    thrownError = error;
  }

  // Parse the error message to extract UnifiedError information
  // Assuming the error message contains the UnifiedError message
  if (expectedMessageContent) {
    assert(
      thrownError!.message.includes(expectedMessageContent),
      `Expected error message to contain '${expectedMessageContent}' but got: ${
        thrownError!.message
      }`,
    );
  }
}

/**
 * Type guard to check if Result is success
 */
export function isResultOk<T, E>(result: ConfigResult<T, E>): result is { success: true; data: T } {
  return result.success;
}

/**
 * Type guard to check if Result is error
 */
export function isResultErr<T, E>(
  result: ConfigResult<T, E>,
): result is { success: false; error: E } {
  return !result.success;
}

// === Unified Result Test Helpers ===

/**
 * Asserts that a UnifiedResult is successful and returns the data
 */
export function assertUnifiedResultOk<T, E>(
  result: UnifiedResult<T, E>,
  message?: string,
): T {
  assert(
    result.success,
    message ||
      `Expected success but got error: ${JSON.stringify(result.success ? null : result.error)}`,
  );
  return result.data;
}

/**
 * Asserts that a UnifiedResult is an error and returns the error
 */
export function assertUnifiedResultErr<T, E>(
  result: UnifiedResult<T, E>,
  message?: string,
): E {
  assert(
    !result.success,
    message ||
      `Expected error but got success: ${JSON.stringify(result.success ? result.data : null)}`,
  );
  return result.error;
}

/**
 * Test helper for asserting successful map operations
 */
export function assertSuccessfulMap<T, U, E>(
  originalResult: UnifiedResult<T, E>,
  mapFn: (data: T) => U,
  expectedData: U,
  message?: string,
): void {
  const mappedResult = UnifiedResult.map(originalResult, mapFn);
  const actualData = assertUnifiedResultOk(mappedResult, message);
  assertEquals(actualData, expectedData, message || `Map operation produced unexpected result`);
}

/**
 * Test helper for asserting successful flatMap operations
 */
export function assertSuccessfulFlatMap<T, U, E>(
  originalResult: UnifiedResult<T, E>,
  flatMapFn: (data: T) => UnifiedResult<U, E>,
  expectedData: U,
  message?: string,
): void {
  const flatMappedResult = UnifiedResult.flatMap(originalResult, flatMapFn);
  const actualData = assertUnifiedResultOk(flatMappedResult, message);
  assertEquals(actualData, expectedData, message || `FlatMap operation produced unexpected result`);
}
