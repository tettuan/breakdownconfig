/**
 * Test suite for Result type functional operations
 *
 * Tests success cases for map, flatMap, and other Result operations
 * from unified_result.ts
 */

import { assert, assertEquals } from "@std/assert";
import { Result } from "../../src/types/unified_result.ts";
import {
  assertSuccessfulFlatMap,
  assertSuccessfulMap,
  assertUnifiedResultOk,
} from "../test_helpers/result_test_helpers.ts";

Deno.test("Result.ok creates successful result", () => {
  const result = Result.ok(42);

  assertEquals(result.success, true);
  assertEquals(result.data, 42);
  assert(Result.isOk(result));
  assert(!Result.isErr(result));
});

Deno.test("Result.map transforms success values", () => {
  const originalResult = Result.ok(5);
  const double = (x: number) => x * 2;

  assertSuccessfulMap(originalResult, double, 10);
});

Deno.test("Result.map chains multiple transformations", () => {
  const originalResult = Result.ok("hello");

  const upperCaseResult = Result.map(originalResult, (s) => s.toUpperCase());
  const lengthResult = Result.map(upperCaseResult, (s) => s.length);

  const finalLength = assertUnifiedResultOk(lengthResult);
  assertEquals(finalLength, 5);
});

Deno.test("Result.map preserves errors", () => {
  const errorResult = Result.err("test error");
  const double = (x: number) => x * 2;

  const mappedResult = Result.map(errorResult, double);

  assert(Result.isErr(mappedResult));
  assertEquals(mappedResult.error, "test error");
});

Deno.test("Result.flatMap chains Result-returning operations", () => {
  const originalResult = Result.ok(10);
  const safeDivide = (x: number) => x > 0 ? Result.ok(100 / x) : Result.err("Division by zero");

  assertSuccessfulFlatMap(originalResult, safeDivide, 10);
});

Deno.test("Result.flatMap chains multiple operations", () => {
  const parseNumber = (s: string): Result<number, string> => {
    const num = parseInt(s);
    return isNaN(num) ? Result.err("Parse error") : Result.ok(num);
  };

  const safeDivide = (x: number): Result<number, string> =>
    x > 0 ? Result.ok(100 / x) : Result.err("Division by zero");

  const originalResult = Result.ok("5");
  const parsedResult = Result.flatMap(originalResult, parseNumber);
  const dividedResult = Result.flatMap(parsedResult, safeDivide);

  const finalValue = assertUnifiedResultOk(dividedResult);
  assertEquals(finalValue, 20);
});

Deno.test("Result.flatMap preserves errors in chain", () => {
  const errorResult = Result.err("initial error");
  const operation = (x: number) => Result.ok(x * 2);

  const chainedResult = Result.flatMap(errorResult, operation);

  assert(Result.isErr(chainedResult));
  assertEquals(chainedResult.error, "initial error");
});

Deno.test("Result.unwrapOr returns data for success", () => {
  const successResult = Result.ok(42);
  const value = Result.unwrapOr(successResult, 0);

  assertEquals(value, 42);
});

Deno.test("Result.unwrapOr returns default for error", () => {
  const errorResult = Result.err("error");
  const value = Result.unwrapOr(errorResult, 99);

  assertEquals(value, 99);
});

Deno.test("Result.all combines successful results", () => {
  const results = [
    Result.ok(1),
    Result.ok(2),
    Result.ok(3),
  ];

  const combinedResult = Result.all(results);

  const values = assertUnifiedResultOk(combinedResult);
  assertEquals(values, [1, 2, 3]);
});

Deno.test("Result.all returns first error if any fail", () => {
  const results = [
    Result.ok(1),
    Result.err("error in second"),
    Result.ok(3),
  ];

  const combinedResult = Result.all(results);

  assert(Result.isErr(combinedResult));
  assertEquals(combinedResult.error, "error in second");
});

Deno.test("Result.all handles empty array", () => {
  const results: Result<number, string>[] = [];

  const combinedResult = Result.all(results);

  const values = assertUnifiedResultOk(combinedResult);
  assertEquals(values, []);
});

Deno.test("Result.fromPromise handles successful Promise", async () => {
  const successPromise = Promise.resolve(42);

  const result = await Result.fromPromise(successPromise);

  const value = assertUnifiedResultOk(result);
  assertEquals(value, 42);
});

Deno.test("Result.fromPromise handles rejected Promise", async () => {
  const errorPromise = Promise.reject(new Error("Promise failed"));

  const result = await Result.fromPromise(errorPromise);

  assert(Result.isErr(result));
  assert(result.error.message.includes("Promise failed"));
  assertEquals(result.error.kind, "UNKNOWN_ERROR");
});

Deno.test("Result.fromPromise uses custom error mapper", async () => {
  const errorPromise = Promise.reject("Custom error");
  const errorMapper = (error: unknown) => ({
    kind: "UNKNOWN_ERROR" as const,
    message: `Mapped: ${error}`,
    timestamp: new Date(),
    originalError: error,
  });

  const result = await Result.fromPromise(errorPromise, errorMapper);

  assert(Result.isErr(result));
  assertEquals(result.error.kind, "UNKNOWN_ERROR");
  assert(result.error.message.includes("Mapped: Custom error"));
});

Deno.test("Complex Result operation chain", () => {
  const processString = (input: string): Result<number, string> => {
    const step1 = Result.flatMap(
      Result.ok(input),
      (s) => s.length > 0 ? Result.ok(s) : Result.err("Empty string"),
    );

    const step2 = Result.flatMap(step1, (s) => {
      const num = parseInt(s);
      return isNaN(num) ? Result.err("Not a number") : Result.ok(num);
    });

    return Result.map(step2, (n) => n * 2);
  };

  const validResult = processString("123");
  const validValue = assertUnifiedResultOk(validResult);
  assertEquals(validValue, 246);

  const invalidResult = processString("abc");
  assert(Result.isErr(invalidResult));
  assertEquals(invalidResult.error, "Not a number");
});

// Helper function for chaining promises with Result
function promiseChain<T, U, E>(
  result: Result<T, E>,
  asyncFn: (data: T) => Promise<Result<U, E>>,
): Promise<Result<U, E>> {
  if (Result.isErr(result)) {
    return Promise.resolve(result);
  }
  return asyncFn(result.data);
}

Deno.test("Result with async operations", async () => {
  const asyncDouble = async (x: number): Promise<Result<number, string>> => {
    await new Promise((resolve) => setTimeout(resolve, 1));
    return Result.ok(x * 2);
  };

  const initialResult = Result.ok(21);
  const finalResult = await promiseChain(initialResult, asyncDouble);

  const value = assertUnifiedResultOk(finalResult);
  assertEquals(value, 42);
});
