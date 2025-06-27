/**
 * Error Handling Patterns Test
 *
 * Purpose:
 * Test comprehensive error handling patterns for Result<T, E> type
 * - Error propagation chains
 * - Error recovery mechanisms
 * - Error transformation patterns
 * - Error aggregation patterns
 *
 * Test Patterns:
 * 1. Error propagation through Result.flatMap chains
 * 2. Error recovery with fallback values
 * 3. Error transformation via Result.mapErr
 * 4. Multiple error aggregation via Result.all
 * 5. Async error handling with Result.fromPromise
 * 6. Custom error type handling
 */

import { assertEquals, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Result } from "../src/types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "../src/errors/unified_errors.ts";
import {
  assertResultErr,
  assertResultErrorKind,
  assertResultOk,
} from "./test_helpers/result_test_helpers.ts";

// Test data types
interface TestConfig {
  name: string;
  value: number;
}

interface ValidatedConfig {
  name: string;
  value: number;
  validated: true;
}

describe("Error Handling Patterns", () => {
  describe("Error Propagation Patterns", () => {
    it("should propagate errors through flatMap chains", () => {
      const parseConfig = (input: string): Result<TestConfig, UnifiedError> => {
        if (input === "invalid") {
          return Result.err(ErrorFactories.configParseError("test.yaml", "Invalid format"));
        }
        return Result.ok({ name: "test", value: 42 });
      };

      const validateConfig = (config: TestConfig): Result<ValidatedConfig, UnifiedError> => {
        if (config.value < 0) {
          return Result.err(ErrorFactories.configValidationError("test.yaml", [
            { field: "value", message: "Value must be positive", value: config.value },
          ]));
        }
        return Result.ok({ ...config, validated: true });
      };

      const processConfig = (input: string): Result<ValidatedConfig, UnifiedError> => {
        return Result.flatMap(
          parseConfig(input),
          (config) => validateConfig(config),
        );
      };

      // Test successful chain
      const successResult = processConfig("valid");
      const successData = assertResultOk(successResult);
      assertEquals(successData.name, "test");
      assertEquals(successData.validated, true);

      // Test error propagation at parse stage
      const parseErrorResult = processConfig("invalid");
      assertResultErrorKind(parseErrorResult, "CONFIG_PARSE_ERROR");

      // Test error propagation at validation stage
      const validationErrorResult = Result.flatMap(
        Result.ok({ name: "test", value: -1 }),
        (config) => validateConfig(config),
      );
      assertResultErrorKind(validationErrorResult, "CONFIG_VALIDATION_ERROR");
    });

    it("should handle nested flatMap error propagation", () => {
      const step1 = (input: number): Result<number, UnifiedError> => {
        if (input < 0) return Result.err(ErrorFactories.unknown(new Error("Step1 error"), "step1"));
        return Result.ok(input * 2);
      };

      const step2 = (input: number): Result<number, UnifiedError> => {
        if (input > 100) {
          return Result.err(ErrorFactories.unknown(new Error("Step2 error"), "step2"));
        }
        return Result.ok(input + 10);
      };

      const step3 = (input: number): Result<string, UnifiedError> => {
        if (input % 2 !== 0) {
          return Result.err(ErrorFactories.unknown(new Error("Step3 error"), "step3"));
        }
        return Result.ok(`Result: ${input}`);
      };

      const pipeline = (input: number): Result<string, UnifiedError> => {
        return Result.flatMap(
          Result.flatMap(step1(input), step2),
          step3,
        );
      };

      // Success case
      const successResult = pipeline(10);
      assertEquals(assertResultOk(successResult), "Result: 30");

      // Error at step1
      const error1Result = pipeline(-1);
      const error1 = assertResultErr(error1Result);
      assertEquals(error1.message, "Step1 error");

      // Error at step2
      const error2Result = pipeline(50);
      const error2 = assertResultErr(error2Result);
      assertEquals(error2.message, "Step2 error");

      // Error at step3
      const error3Result = pipeline(1);
      const error3 = assertResultErr(error3Result);
      assertEquals(error3.message, "Step3 error");
    });
  });

  describe("Error Recovery Patterns", () => {
    it("should provide fallback values with unwrapOr", () => {
      const errorResult: Result<string, UnifiedError> = Result.err(
        ErrorFactories.configFileNotFound("config.yaml", "app"),
      );
      const successResult: Result<string, UnifiedError> = Result.ok("success");

      assertEquals(Result.unwrapOr(errorResult, "fallback"), "fallback");
      assertEquals(Result.unwrapOr(successResult, "fallback"), "success");
    });

    it("should handle error recovery in processing chains", () => {
      const riskyOperation = (input: string): Result<number, UnifiedError> => {
        if (input === "fail") {
          return Result.err(
            ErrorFactories.unknown(new Error("Operation failed"), "riskyOperation"),
          );
        }
        return Result.ok(input.length);
      };

      const safeProcess = (input: string): number => {
        const result = riskyOperation(input);
        return Result.unwrapOr(result, 0); // Use 0 as fallback
      };

      assertEquals(safeProcess("hello"), 5);
      assertEquals(safeProcess("fail"), 0);
    });

    it("should support chained recovery strategies", () => {
      const primarySource = (key: string): Result<string, UnifiedError> => {
        if (key === "missing") {
          return Result.err(ErrorFactories.configFileNotFound("primary.yaml", "app"));
        }
        return Result.ok(`primary:${key}`);
      };

      const secondarySource = (key: string): Result<string, UnifiedError> => {
        if (key === "missing") {
          return Result.err(ErrorFactories.configFileNotFound("secondary.yaml", "app"));
        }
        return Result.ok(`secondary:${key}`);
      };

      const defaultSource = (key: string): Result<string, UnifiedError> => {
        return Result.ok(`default:${key}`);
      };

      const loadWithFallback = (key: string): Result<string, UnifiedError> => {
        const primary = primarySource(key);
        if (Result.isOk(primary)) return primary;

        const secondary = secondarySource(key);
        if (Result.isOk(secondary)) return secondary;

        return defaultSource(key);
      };

      assertEquals(assertResultOk(loadWithFallback("found")), "primary:found");
      assertEquals(assertResultOk(loadWithFallback("missing")), "default:missing");
    });
  });

  describe("Error Transformation Patterns", () => {
    it("should transform errors using mapErr", () => {
      const originalError: Result<string, Error> = Result.err(new Error("Original error"));

      const transformedError = Result.mapErr(
        originalError,
        (error) => ErrorFactories.unknown(error, "transformation_context"),
      );

      const error = assertResultErr(transformedError);
      assertEquals(error.kind, "UNKNOWN_ERROR");
      assertEquals(error.context, "transformation_context");
    });

    it("should chain error transformations", () => {
      type CustomError = { type: "custom"; message: string };

      const step1Result: Result<never, Error> = Result.err(new Error("Base error"));

      const step2Result = Result.mapErr(step1Result, (error): CustomError => ({
        type: "custom",
        message: `Custom: ${error.message}`,
      }));

      const step3Result = Result.mapErr(
        step2Result,
        (error) => ErrorFactories.unknown(new Error(error.message), "final_context"),
      );

      const finalError = assertResultErr(step3Result);
      assertEquals(finalError.kind, "UNKNOWN_ERROR");
      assertEquals(finalError.context, "final_context");
    });
  });

  describe("Error Aggregation Patterns", () => {
    it("should aggregate multiple results with Result.all", () => {
      const results: Result<number, UnifiedError>[] = [
        Result.ok(1),
        Result.ok(2),
        Result.ok(3),
      ];

      const aggregated = Result.all(results);
      assertEquals(assertResultOk(aggregated), [1, 2, 3]);
    });

    it("should fail fast on first error in Result.all", () => {
      const results: Result<number, UnifiedError>[] = [
        Result.ok(1),
        Result.err(ErrorFactories.unknown(new Error("Second error"), "test")),
        Result.ok(3),
      ];

      const aggregated = Result.all(results);
      const error = assertResultErr(aggregated);
      assertEquals(error.message, "Second error");
    });

    it("should handle mixed success/error scenarios", () => {
      const processItems = (items: string[]): Result<string[], UnifiedError> => {
        const results = items.map((item) => {
          if (item === "invalid") {
            return Result.err(
              ErrorFactories.unknown(new Error(`Invalid item: ${item}`), "processItems"),
            );
          }
          return Result.ok(item.toUpperCase());
        });

        return Result.all(results);
      };

      const successItems = ["hello", "world"];
      const successResult = processItems(successItems);
      assertEquals(assertResultOk(successResult), ["HELLO", "WORLD"]);

      const failItems = ["hello", "invalid", "world"];
      const failResult = processItems(failItems);
      assertResultErr(failResult);
    });
  });

  describe("Async Error Handling Patterns", () => {
    it("should handle Promise success with Result.fromPromise", async () => {
      const successPromise = Promise.resolve("success");
      const result = await Result.fromPromise(successPromise);
      assertEquals(assertResultOk(result), "success");
    });

    it("should handle Promise rejection with Result.fromPromise", async () => {
      const failPromise = Promise.reject(new Error("Async error"));
      const result = await Result.fromPromise(failPromise);
      const error = assertResultErr(result);
      assertEquals(error.message, "Async error");
    });

    it("should use custom error mapper with Result.fromPromise", async () => {
      const failPromise = Promise.reject(new Error("Network error"));
      const result = await Result.fromPromise(
        failPromise,
        (error) => ErrorFactories.configFileNotFound("remote.yaml", "app"),
      );

      assertResultErrorKind(result, "CONFIG_FILE_NOT_FOUND");
    });

    it("should chain async operations with Result patterns", async () => {
      const asyncStep1 = async (input: number): Promise<Result<number, UnifiedError>> => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        if (input < 0) {
          return Result.err(ErrorFactories.unknown(new Error("Negative input"), "asyncStep1"));
        }
        return Result.ok(input * 2);
      };

      const asyncStep2 = async (input: number): Promise<Result<string, UnifiedError>> => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        if (input > 100) {
          return Result.err(ErrorFactories.unknown(new Error("Too large"), "asyncStep2"));
        }
        return Result.ok(`Result: ${input}`);
      };

      const asyncPipeline = async (input: number): Promise<Result<string, UnifiedError>> => {
        const step1Result = await asyncStep1(input);
        if (Result.isErr(step1Result)) return step1Result;

        return await asyncStep2(step1Result.data);
      };

      // Success case
      const successResult = await asyncPipeline(10);
      assertEquals(assertResultOk(successResult), "Result: 20");

      // Error case
      const errorResult = await asyncPipeline(-1);
      assertResultErr(errorResult);
    });
  });

  describe("Error Type Safety Patterns", () => {
    it("should maintain type safety in error handling", () => {
      type ValidationError = { field: string; message: string };
      type ProcessingError = { step: string; reason: string };
      type CombinedError = ValidationError | ProcessingError;

      const validate = (input: unknown): Result<string, ValidationError> => {
        if (typeof input !== "string") {
          return Result.err({ field: "input", message: "Must be string" });
        }
        return Result.ok(input);
      };

      const process = (input: string): Result<number, ProcessingError> => {
        const num = parseInt(input);
        if (isNaN(num)) {
          return Result.err({ step: "parsing", reason: "Invalid number" });
        }
        return Result.ok(num);
      };

      const combined = (input: unknown): Result<number, CombinedError> => {
        const validated = validate(input);
        if (Result.isErr(validated)) return validated;

        const processed = process(validated.data);
        if (Result.isErr(processed)) return processed;

        return processed;
      };

      // Success case
      const successResult = combined("42");
      assertEquals(assertResultOk(successResult), 42);

      // Validation error
      const validationResult = combined(123);
      const validationError = assertResultErr(validationResult);
      assertEquals("field" in validationError, true);

      // Processing error
      const processingResult = combined("invalid");
      const processingError = assertResultErr(processingResult);
      assertEquals("step" in processingError, true);
    });

    it("should handle Result.unwrap error throwing", () => {
      const errorResult: Result<string, UnifiedError> = Result.err(
        ErrorFactories.unknown(new Error("Test error"), "test"),
      );

      assertThrows(
        () => Result.unwrap(errorResult),
        Error,
        "Unwrap called on error result",
      );
    });
  });
});
