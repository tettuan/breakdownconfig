/**
 * Coverage tests for unified_result.ts
 * Target: Improve coverage from 11.1% to 80%+
 */

import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { Result } from "../src/types/unified_result.ts";
import { UnifiedError } from "../src/errors/unified_errors.ts";

describe("Unified Result Coverage Tests", () => {
  describe("Result.isOk and Result.isErr", () => {
    it("should correctly identify success results", () => {
      const success = Result.ok("test value");
      assertEquals(Result.isOk(success), true);
      assertEquals(Result.isErr(success), false);
    });

    it("should correctly identify failure results", () => {
      const failure = Result.err({ kind: "UNKNOWN_ERROR" } as UnifiedError);
      assertEquals(Result.isOk(failure), false);
      assertEquals(Result.isErr(failure), true);
    });
  });

  describe("Result.mapErr", () => {
    it("should transform error values", () => {
      const error: UnifiedError = {
        kind: "CONFIG_FILE_NOT_FOUND",
        message: "Original error",
      } as UnifiedError;

      const failure = Result.err(error);
      const mapped = Result.mapErr(failure, (err) => ({
        ...err,
        message: "Transformed error",
      }));

      assertEquals(Result.isErr(mapped), true);
      assertEquals((mapped as any).error.message, "Transformed error");
    });

    it("should not affect success values", () => {
      const success = Result.ok("test value");
      const mapped = Result.mapErr(success, (err: any) => ({
        ...err,
        message: "Should not be called",
      }));

      assertEquals(Result.isOk(mapped), true);
      assertEquals((mapped as any).data, "test value");
    });
  });

  describe("Result.unwrapOr", () => {
    it("should return data for success results", () => {
      const success = Result.ok("success value");
      const value = Result.unwrapOr(success, "default");
      assertEquals(value, "success value");
    });

    it("should return default for failure results", () => {
      const failure = Result.err({ kind: "UNKNOWN_ERROR" } as UnifiedError);
      const value = Result.unwrapOr(failure, "default");
      assertEquals(value, "default");
    });
  });

  describe("Result.unwrap", () => {
    it("should return data for success results", () => {
      const success = Result.ok("success value");
      const value = Result.unwrap(success);
      assertEquals(value, "success value");
    });

    it("should throw for failure results", () => {
      const failure = Result.err({ kind: "UNKNOWN_ERROR" } as UnifiedError);
      assertThrows(
        () => Result.unwrap(failure),
        Error,
        "Unwrap called on error result",
      );
    });
  });

  describe("Result.all edge cases", () => {
    it("should handle empty array", () => {
      const results: Result<string, UnifiedError>[] = [];
      const combined = Result.all(results);
      assertEquals(Result.isOk(combined), true);
      assertEquals((combined as any).data, []);
    });

    it("should fail fast on first error", () => {
      const results = [
        Result.ok("first"),
        Result.err({ kind: "CONFIG_FILE_NOT_FOUND", message: "error" } as UnifiedError),
        Result.ok("third"),
      ];

      const combined = Result.all(results);
      assertEquals(Result.isErr(combined), true);
      assertEquals((combined as any).error.kind, "CONFIG_FILE_NOT_FOUND");
    });

    it("should collect all success values", () => {
      const results = [
        Result.ok("first"),
        Result.ok("second"),
        Result.ok("third"),
      ];

      const combined = Result.all(results);
      assertEquals(Result.isOk(combined), true);
      assertEquals((combined as any).data, ["first", "second", "third"]);
    });
  });

  describe("Result.fromPromise error handling", () => {
    it("should handle Error instances", async () => {
      const promise = Promise.reject(new Error("Test error"));
      const result = await Result.fromPromise(promise);

      assertEquals(Result.isErr(result), true);
      assertEquals((result as any).error.kind, "UNKNOWN_ERROR");
      assertEquals((result as any).error.message, "Test error");
    });

    it("should handle non-Error rejections", async () => {
      const promise = Promise.reject("String error");
      const result = await Result.fromPromise(promise);

      assertEquals(Result.isErr(result), true);
      assertEquals((result as any).error.kind, "UNKNOWN_ERROR");
      assertEquals((result as any).error.message, "String error");
    });

    it("should use custom error mapper", async () => {
      const promise = Promise.reject(new Error("Test error"));
      const result = await Result.fromPromise(promise, (err: any) => ({
        kind: "CONFIG_PARSE_ERROR",
        message: `Mapped: ${err}`,
        originalError: err,
        path: "/test/path",
        syntaxError: null,
        timestamp: new Date(),
      } as UnifiedError));

      assertEquals(Result.isErr(result), true);
      assertEquals((result as any).error.kind, "CONFIG_PARSE_ERROR");
      assertEquals((result as any).error.message.includes("Mapped:"), true);
    });

    it("should handle successful promises", async () => {
      const promise = Promise.resolve({ data: "test" });
      const result = await Result.fromPromise(promise);

      assertEquals(Result.isOk(result), true);
      assertEquals((result as any).data, { data: "test" });
    });
  });

  describe("Complex chaining scenarios", () => {
    it("should handle nested flatMap operations", () => {
      const initial = Result.ok(5);

      const result = Result.flatMap(
        initial,
        (n) =>
          Result.flatMap(
            Result.ok(n * 2),
            (doubled) =>
              Result.flatMap(Result.ok(doubled + 1), (final) => Result.ok(`Result: ${final}`)),
          ),
      );

      assertEquals(Result.isOk(result), true);
      assertEquals((result as any).data, "Result: 11");
    });

    it("should short-circuit on error in chain", () => {
      const initial = Result.ok(5);

      const result = Result.flatMap(
        initial,
        (n) =>
          Result.flatMap(Result.ok(n * 2), (doubled) =>
            Result.flatMap(
              Result.err({
                kind: "UNKNOWN_ERROR",
                message: "Failed",
                originalError: new Error("Test"),
                timestamp: new Date(),
              } as UnifiedError),
              (final) => Result.ok(`Result: ${final}`),
            )),
      );

      assertEquals(Result.isErr(result), true);
      assertEquals((result as any).error.kind, "UNKNOWN_ERROR");
    });
  });

  describe("Aliases: success and failure", () => {
    it("should create success with Result.success", () => {
      const result = Result.ok("test");
      assertEquals(Result.isOk(result), true);
      assertEquals((result as any).data, "test");
    });

    it("should create failure with Result.failure", () => {
      const error = { kind: "UNKNOWN_ERROR" } as UnifiedError;
      const result = Result.failure(error);
      assertEquals(Result.isErr(result), true);
      assertEquals((result as any).error, error);
    });
  });
});
