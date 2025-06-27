/**
 * Tests for config_result.ts - Result type helper functions
 *
 * This test suite aims to improve coverage from 16.0% to 80%+
 * by testing all Result type operations
 */

import { assertEquals, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  ConfigResult,
  ConfigValidationError,
  FileNotFoundError,
  ParseError,
  PathError,
  Result,
  UnknownError,
} from "../../src/types/config_result.ts";

describe("ConfigResult type helpers", () => {
  describe("Result.ok", () => {
    it("should create a success result", () => {
      const result = Result.ok("test data");

      assertEquals(result.success, true);
      assertEquals(result.data, "test data");
    });

    it("should handle various data types", () => {
      const stringResult = Result.ok("string");
      const numberResult = Result.ok(42);
      const objectResult = Result.ok({ key: "value" });
      const arrayResult = Result.ok([1, 2, 3]);

      assertEquals(stringResult.data, "string");
      assertEquals(numberResult.data, 42);
      assertEquals(objectResult.data, { key: "value" });
      assertEquals(arrayResult.data, [1, 2, 3]);
    });

    it("should handle null and undefined", () => {
      const nullResult = Result.ok(null);
      const undefinedResult = Result.ok(undefined);

      assertEquals(nullResult.success, true);
      assertEquals(nullResult.data, null);
      assertEquals(undefinedResult.success, true);
      assertEquals(undefinedResult.data, undefined);
    });
  });

  describe("Result.err", () => {
    it("should create a failure result", () => {
      const error: FileNotFoundError = {
        kind: "fileNotFound",
        path: "/missing/file",
        message: "File not found",
      };

      const result = Result.err(error);

      assertEquals(result.success, false);
      assertEquals(result.error, error);
    });

    it("should handle different error types", () => {
      const parseError: ParseError = {
        kind: "parseError",
        path: "/config.yml",
        line: 10,
        column: 5,
        message: "Invalid syntax",
      };

      const validationError: ConfigValidationError = {
        kind: "validationError",
        errors: [{
          field: "working_dir",
          value: "",
          expectedType: "string",
          message: "Cannot be empty",
        }],
        path: "/config.yml",
      };

      const parseResult = Result.err(parseError);
      const validationResult = Result.err(validationError);

      assertEquals(parseResult.error.kind, "parseError");
      assertEquals(validationResult.error.kind, "validationError");
    });
  });

  describe("Result.isOk", () => {
    it("should return true for success results", () => {
      const result = Result.ok("data");
      assertEquals(Result.isOk(result), true);
    });

    it("should return false for error results", () => {
      const result = Result.err<FileNotFoundError>({
        kind: "fileNotFound",
        path: "/test",
        message: "Not found",
      });
      assertEquals(Result.isOk(result), false);
    });

    it("should narrow types correctly", () => {
      const result: ConfigResult<string> = Result.ok("test");

      if (Result.isOk(result)) {
        // TypeScript should know result.data exists
        assertEquals(result.data.length, 4);
      }
    });
  });

  describe("Result.isErr", () => {
    it("should return false for success results", () => {
      const result = Result.ok("data");
      assertEquals(Result.isErr(result), false);
    });

    it("should return true for error results", () => {
      const result = Result.err<UnknownError>({
        kind: "unknownError",
        message: "Something went wrong",
        originalError: new Error("test"),
      });
      assertEquals(Result.isErr(result), true);
    });

    it("should narrow types correctly", () => {
      const result: ConfigResult<string> = Result.err({
        kind: "unknownError",
        message: "Error",
        originalError: null,
      });

      if (Result.isErr(result)) {
        // TypeScript should know result.error exists
        assertEquals(result.error.kind, "unknownError");
      }
    });
  });

  describe("Result.map", () => {
    it("should transform success values", () => {
      const result = Result.ok(5);
      const mapped = Result.map(result, (n) => n * 2);

      assertEquals(Result.isOk(mapped), true);
      if (Result.isOk(mapped)) {
        assertEquals(mapped.data, 10);
      }
    });

    it("should pass through errors unchanged", () => {
      const error: ParseError = {
        kind: "parseError",
        path: "/test",
        line: 1,
        column: 1,
        message: "Parse failed",
      };
      const result = Result.err(error);
      const mapped = Result.map(result, (n: number) => n * 2);

      assertEquals(Result.isErr(mapped), true);
      if (Result.isErr(mapped)) {
        assertEquals(mapped.error, error);
      }
    });

    it("should handle type transformations", () => {
      const result = Result.ok("hello");
      const lengthResult = Result.map(result, (s) => s.length);
      const boolResult = Result.map(lengthResult, (n) => n > 3);

      if (Result.isOk(boolResult)) {
        assertEquals(boolResult.data, true);
      }
    });
  });

  describe("Result.mapErr", () => {
    it("should transform error values", () => {
      const error: FileNotFoundError = {
        kind: "fileNotFound",
        path: "/test",
        message: "Not found",
      };
      const result = Result.err(error);

      const mapped = Result.mapErr(result, (err) => ({
        kind: "unknownError" as const,
        message: `Wrapped: ${err.message}`,
        originalError: err,
      }));

      assertEquals(Result.isErr(mapped), true);
      if (Result.isErr(mapped)) {
        assertEquals(mapped.error.kind, "unknownError");
        assertEquals(mapped.error.message, "Wrapped: Not found");
      }
    });

    it("should pass through success values unchanged", () => {
      const result = Result.ok("data");
      const mapped = Result.mapErr(result, (err) => ({
        kind: "unknownError" as const,
        message: "Should not be called",
        originalError: err,
      }));

      assertEquals(Result.isOk(mapped), true);
      if (Result.isOk(mapped)) {
        assertEquals(mapped.data, "data");
      }
    });
  });

  describe("Result.flatMap", () => {
    it("should chain successful operations", () => {
      const parseNumber = (s: string): ConfigResult<number> => {
        const n = Number(s);
        return isNaN(n)
          ? Result.err({
            kind: "parseError",
            path: "",
            line: 0,
            column: 0,
            message: "Not a number",
          })
          : Result.ok(n);
      };

      const double = (n: number): ConfigResult<number> => Result.ok(n * 2);

      const result = Result.flatMap(parseNumber("5"), double);

      assertEquals(Result.isOk(result), true);
      if (Result.isOk(result)) {
        assertEquals(result.data, 10);
      }
    });

    it("should short-circuit on first error", () => {
      const result1 = Result.ok(5);
      const result2 = Result.err<ParseError>({
        kind: "parseError",
        path: "/test",
        line: 1,
        column: 1,
        message: "Error",
      });

      const chained = Result.flatMap(result2, (n: number) => Result.ok(n * 2));

      assertEquals(Result.isErr(chained), true);
      if (Result.isErr(chained)) {
        assertEquals(chained.error.kind, "parseError");
      }
    });

    it("should handle multiple flatMap operations", () => {
      const add = (n: number) => (m: number): ConfigResult<number> => Result.ok(n + m);
      const multiply = (n: number) => (m: number): ConfigResult<number> => Result.ok(n * m);

      const result = Result.flatMap(
        Result.flatMap(Result.ok(2), add(3)),
        multiply(4),
      );

      if (Result.isOk(result)) {
        assertEquals(result.data, 20); // (2 + 3) * 4
      }
    });
  });

  describe("Result.unwrapOr", () => {
    it("should return value for success result", () => {
      const result = Result.ok("success");
      assertEquals(Result.unwrapOr(result, "default"), "success");
    });

    it("should return default for error result", () => {
      const result = Result.err<UnknownError>({
        kind: "unknownError",
        message: "Error",
        originalError: null,
      });
      assertEquals(Result.unwrapOr(result, "default"), "default");
    });

    it("should handle different types", () => {
      const numberResult: ConfigResult<number> = Result.err({
        kind: "unknownError",
        message: "Error",
        originalError: null,
      });
      assertEquals(Result.unwrapOr(numberResult, 42), 42);

      const objectResult = Result.ok({ key: "value" });
      assertEquals(Result.unwrapOr(objectResult, { key: "default" }), { key: "value" });
    });
  });

  describe("Result.unwrap", () => {
    it("should return value for success result", () => {
      const result = Result.ok("success");
      assertEquals(Result.unwrap(result), "success");
    });

    it("should throw for error result", () => {
      const result = Result.err<PathError>({
        kind: "pathError",
        path: "/test",
        reason: "pathTraversal",
        message: "Invalid path",
      });

      assertThrows(
        () => Result.unwrap(result),
        Error,
        "Unwrap called on error result",
      );
    });

    it("should include error details in thrown message", () => {
      const result = Result.err({
        kind: "validationError" as const,
        errors: [],
        path: "/test",
      });

      try {
        Result.unwrap(result);
      } catch (e) {
        assertEquals(e instanceof Error, true);
        if (e instanceof Error) {
          assertEquals(e.message.includes("validationError"), true);
        }
      }
    });
  });

  describe("edge cases", () => {
    it("should handle deeply nested Result operations", () => {
      const deeplyNested = Result.map(
        Result.map(
          Result.map(
            Result.ok(1),
            (n) => n + 1,
          ),
          (n) => n * 2,
        ),
        (n) => n.toString(),
      );

      if (Result.isOk(deeplyNested)) {
        assertEquals(deeplyNested.data, "4"); // ((1 + 1) * 2).toString()
      }
    });

    it("should handle Result with complex error types", () => {
      const complexError: ConfigValidationError = {
        kind: "validationError",
        errors: [
          { field: "a", value: 1, expectedType: "string" },
          { field: "b", value: "x", expectedType: "number" },
          { field: "c", value: null, expectedType: "object", message: "Cannot be null" },
        ],
        path: "/complex/config",
      };

      const result = Result.err(complexError);

      if (Result.isErr(result)) {
        assertEquals(result.error.errors.length, 3);
        assertEquals(result.error.errors[2].message, "Cannot be null");
      }
    });

    it("should handle Results in async contexts", async () => {
      const asyncOperation = async (): Promise<ConfigResult<string>> => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return Result.ok("async result");
      };

      const result = await asyncOperation();
      assertEquals(Result.isOk(result), true);
      if (Result.isOk(result)) {
        assertEquals(result.data, "async result");
      }
    });
  });
});
