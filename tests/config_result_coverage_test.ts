/**
 * Coverage tests for config_result.ts
 * Target: Improve coverage from 16.0% to 80%+
 */

import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { Result as ConfigResult } from "../src/types/config_result.ts";
import { UnifiedError } from "../src/errors/unified_errors.ts";

describe("ConfigResult Coverage Tests", () => {
  describe("ConfigResult.isOk and ConfigResult.isErr", () => {
    it("should correctly identify success results", () => {
      const success = ConfigResult.ok("test value");
      assertEquals(ConfigResult.isOk(success), true);
      assertEquals(ConfigResult.isErr(success), false);
    });

    it("should correctly identify failure results", () => {
      const failure = ConfigResult.err({ kind: "CONFIG_FILE_NOT_FOUND" } as UnifiedError);
      assertEquals(ConfigResult.isOk(failure), false);
      assertEquals(ConfigResult.isErr(failure), true);
    });
  });

  describe("ConfigResult.map", () => {
    it("should transform success values", () => {
      const success = ConfigResult.ok(42);
      const mapped = ConfigResult.map(success, (n) => n * 2);

      assertEquals(ConfigResult.isOk(mapped), true);
      assertEquals((mapped as any).data, 84);
    });

    it("should not affect failure values", () => {
      const error: UnifiedError = {
        kind: "CONFIG_PARSE_ERROR",
        message: "Parse error",
      } as UnifiedError;

      const failure = ConfigResult.err(error);
      const mapped = ConfigResult.map(failure, (n) => n * 2);

      assertEquals(ConfigResult.isErr(mapped), true);
      assertEquals((mapped as any).error.kind, "CONFIG_PARSE_ERROR");
    });
  });

  describe("ConfigResult.mapErr", () => {
    it("should transform error values", () => {
      const error: UnifiedError = {
        kind: "CONFIG_FILE_NOT_FOUND",
        message: "Original error",
      } as UnifiedError;

      const failure = ConfigResult.err(error);
      const mapped = ConfigResult.mapErr(failure, (err) => ({
        ...err,
        message: "Transformed error",
      } as UnifiedError));

      assertEquals(ConfigResult.isErr(mapped), true);
      assertEquals((mapped as any).error.message, "Transformed error");
    });

    it("should not affect success values", () => {
      const success = ConfigResult.ok("test value");
      const mapped = ConfigResult.mapErr(success, (err) => ({
        ...err,
        message: "Should not be called",
      } as UnifiedError));

      assertEquals(ConfigResult.isOk(mapped), true);
      assertEquals((mapped as any).data, "test value");
    });
  });

  describe("ConfigResult.flatMap", () => {
    it("should chain successful operations", () => {
      const success = ConfigResult.ok(10);
      const result = ConfigResult.flatMap(success, (n) => {
        if (n > 5) {
          return ConfigResult.ok(n * 2);
        }
        return ConfigResult.err({ kind: "VALIDATION_ERROR" } as UnifiedError);
      });

      assertEquals(ConfigResult.isOk(result), true);
      assertEquals((result as any).data, 20);
    });

    it("should propagate errors", () => {
      const failure = ConfigResult.err({ kind: "CONFIG_FILE_NOT_FOUND" } as UnifiedError);
      const result = ConfigResult.flatMap(failure, (n) => ConfigResult.ok(n * 2));

      assertEquals(ConfigResult.isErr(result), true);
      assertEquals((result as any).error.kind, "CONFIG_FILE_NOT_FOUND");
    });

    it("should handle error in transformation", () => {
      const success = ConfigResult.ok(3);
      const result = ConfigResult.flatMap(success, (n) => {
        if (n > 5) {
          return ConfigResult.ok(n * 2);
        }
        return ConfigResult.err({
          kind: "VALIDATION_ERROR",
          message: "Value too small",
        } as UnifiedError);
      });

      assertEquals(ConfigResult.isErr(result), true);
      assertEquals((result as any).error.kind, "VALIDATION_ERROR");
    });
  });

  describe("ConfigResult.unwrapOr", () => {
    it("should return data for success results", () => {
      const success = ConfigResult.ok("success value");
      const value = ConfigResult.unwrapOr(success, "default");
      assertEquals(value, "success value");
    });

    it("should return default for failure results", () => {
      const failure = ConfigResult.err({ kind: "UNKNOWN_ERROR" } as UnifiedError);
      const value = ConfigResult.unwrapOr(failure, "default");
      assertEquals(value, "default");
    });

    it("should work with different types", () => {
      const failure = ConfigResult.err({ kind: "CONFIG_PARSE_ERROR" } as UnifiedError);
      const value = ConfigResult.unwrapOr(failure, { fallback: true });
      assertEquals(value, { fallback: true });
    });
  });

  describe("ConfigResult.unwrap", () => {
    it("should return data for success results", () => {
      const success = ConfigResult.ok({ config: "data" });
      const value = ConfigResult.unwrap(success);
      assertEquals(value, { config: "data" });
    });

    it("should throw for failure results", () => {
      const failure = ConfigResult.err({
        kind: "CONFIG_FILE_NOT_FOUND",
        message: "File not found",
      } as UnifiedError);

      assertThrows(
        () => ConfigResult.unwrap(failure),
        Error,
        "Called unwrap on an error result",
      );
    });
  });

  describe("Complex scenarios", () => {
    it("should handle multiple transformations", () => {
      const initial = ConfigResult.ok(5);

      const result = ConfigResult.map(
        ConfigResult.map(
          ConfigResult.map(initial, (n) => n * 2),
          (n) => n + 1,
        ),
        (n) => `Result: ${n}`,
      );

      assertEquals(ConfigResult.isOk(result), true);
      assertEquals((result as any).data, "Result: 11");
    });

    it("should handle mixed map and flatMap", () => {
      const initial = ConfigResult.ok(10);

      const result = ConfigResult.flatMap(
        ConfigResult.map(initial, (n) => n / 2),
        (n) => {
          if (n >= 5) {
            return ConfigResult.ok(n * 3);
          }
          return ConfigResult.err({ kind: "VALIDATION_ERROR" } as UnifiedError);
        },
      );

      assertEquals(ConfigResult.isOk(result), true);
      assertEquals((result as any).data, 15);
    });

    it("should handle error mapping chains", () => {
      const initial = ConfigResult.err({
        kind: "CONFIG_FILE_NOT_FOUND",
        message: "Not found",
      } as UnifiedError);

      const result = ConfigResult.mapErr(
        ConfigResult.mapErr(initial, (err) => ({
          ...err,
          message: `Step 1: ${err.message}`,
        } as UnifiedError)),
        (err) => ({
          ...err,
          message: `Step 2: ${err.message}`,
        } as UnifiedError),
      );

      assertEquals(ConfigResult.isErr(result), true);
      assertEquals((result as any).error.message, "Step 2: Step 1: Not found");
    });
  });
});
