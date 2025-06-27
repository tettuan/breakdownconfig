/**
 * UnifiedResult Type Migration Tests
 *
 * Tests for migrating from ConfigResult to UnifiedResult type system
 * with advanced type safety and edge case handling
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Result as UnifiedResult } from "../../src/types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "../../src/errors/unified_errors.ts";
import { ConfigResult, Result as ConfigResultHelpers } from "../../src/types/config_result.ts";

describe("UnifiedResult Type Migration", () => {
  describe("Type Compatibility Between Result Systems", () => {
    it("should maintain structural compatibility between ConfigResult and UnifiedResult", () => {
      // Test that both Result types have compatible structures
      const configSuccess: ConfigResult<string, UnifiedError> = {
        success: true,
        data: "test data",
      };

      const unifiedSuccess: UnifiedResult<string, UnifiedError> = UnifiedResult.ok("test data");

      // Both should have success property
      assertEquals(configSuccess.success, true);
      assertEquals(unifiedSuccess.success, true);

      // Both should have data property when successful
      assertEquals(configSuccess.data, "test data");
      assertEquals(unifiedSuccess.data, "test data");
    });

    it("should handle error cases compatibly", () => {
      const testError = ErrorFactories.configValidationError("/test/path", []);

      const configError: ConfigResult<string, UnifiedError> = {
        success: false,
        error: testError,
      };

      const unifiedError: UnifiedResult<string, UnifiedError> = UnifiedResult.err(testError);

      assertEquals(configError.success, false);
      assertEquals(unifiedError.success, false);
      assertEquals(configError.error, testError);
      assertEquals(unifiedError.error, testError);
    });
  });

  describe("Advanced Type Transformations", () => {
    it("should support map operations with type inference", () => {
      const initial = UnifiedResult.ok<number, UnifiedError>(42);

      // Map to different type
      const mapped = UnifiedResult.map(initial, (n) => n.toString());

      // Type should be inferred as Result<string, UnifiedError>
      if (mapped.success) {
        assertEquals(typeof mapped.data, "string");
        assertEquals(mapped.data, "42");
      }
    });

    it("should support flatMap for monadic composition", () => {
      // Chain multiple operations that can fail
      const parseNumber = (s: string): UnifiedResult<number, UnifiedError> => {
        const n = Number(s);
        return isNaN(n)
          ? UnifiedResult.err(ErrorFactories.typeMismatch("input", "number", "string", s))
          : UnifiedResult.ok(n);
      };

      const divideBy = (divisor: number) => (n: number): UnifiedResult<number, UnifiedError> => {
        return divisor === 0
          ? UnifiedResult.err(ErrorFactories.unknown(new Error("Division by zero")))
          : UnifiedResult.ok(n / divisor);
      };

      // Compose operations
      const result1 = UnifiedResult.flatMap(
        parseNumber("100"),
        divideBy(2),
      );

      if (result1.success) {
        assertEquals(result1.data, 50);
      }

      // Test error propagation
      const result2 = UnifiedResult.flatMap(
        parseNumber("not a number"),
        divideBy(2),
      );

      assertEquals(result2.success, false);
      if (!result2.success) {
        assertEquals(result2.error.kind, "TYPE_MISMATCH");
      }
    });

    it("should support error recovery with mapError", () => {
      const initialError = UnifiedResult.err<string, UnifiedError>(
        ErrorFactories.configFileNotFound("/missing/file", "app"),
      );

      // Transform error to a different type
      const recovered = UnifiedResult.mapErr(
        initialError,
        (error) => ErrorFactories.unknown(error, "recovery"),
      );

      assertEquals(recovered.success, false);
      if (!recovered.success) {
        assertEquals(recovered.error.kind, "UNKNOWN_ERROR");
      }
    });
  });

  describe("Async Result Handling", () => {
    it("should convert Promises to Results", async () => {
      // Successful promise
      const successPromise = Promise.resolve("async data");
      const successResult = await UnifiedResult.fromPromise(successPromise);

      assertEquals(successResult.success, true);
      if (successResult.success) {
        assertEquals(successResult.data, "async data");
      }

      // Failed promise
      const failurePromise = Promise.reject(new Error("Async error"));
      const failureResult = await UnifiedResult.fromPromise(failurePromise);

      assertEquals(failureResult.success, false);
      if (!failureResult.success) {
        assertEquals(failureResult.error.kind, "UNKNOWN_ERROR");
        assertEquals(failureResult.error.message.includes("Async error"), true);
      }
    });

    it("should support async flatMap operations", async () => {
      const fetchData = async (id: string): Promise<UnifiedResult<string, UnifiedError>> => {
        if (id === "invalid") {
          return UnifiedResult.err(ErrorFactories.unknown(new Error("Invalid ID")));
        }
        return UnifiedResult.ok(`Data for ${id}`);
      };

      const processData = (data: string): UnifiedResult<string, UnifiedError> => {
        return UnifiedResult.ok(data.toUpperCase());
      };

      // Async chain
      const result = await fetchData("123").then((r) => UnifiedResult.flatMap(r, processData));

      assertEquals(result.success, true);
      if (result.success) {
        assertEquals(result.data, "DATA FOR 123");
      }
    });
  });

  describe("Type Guards and Narrowing", () => {
    it("should properly narrow types with isOk and isErr", () => {
      const result: UnifiedResult<string, UnifiedError> = UnifiedResult.ok("test");

      if (UnifiedResult.isOk(result)) {
        // TypeScript should narrow to Success type
        assertEquals(result.data, "test");
        // @ts-expect-error - error property should not exist on Success
        assertExists(result.error === undefined);
      }

      const errorResult = UnifiedResult.err<string, UnifiedError>(
        ErrorFactories.unknown(new Error("test")),
      );

      if (UnifiedResult.isErr(errorResult)) {
        // TypeScript should narrow to Failure type
        assertEquals(errorResult.error.kind, "UNKNOWN_ERROR");
        // @ts-expect-error - data property should not exist on Failure
        assertExists(errorResult.data === undefined);
      }
    });

    it("should support custom type predicates", () => {
      type ValidationError = UnifiedError & { kind: "CONFIG_VALIDATION_ERROR" };

      function isValidationError(error: UnifiedError): error is ValidationError {
        return error.kind === "CONFIG_VALIDATION_ERROR";
      }

      const result = UnifiedResult.err<string, UnifiedError>(
        ErrorFactories.configValidationError("/path", []),
      );

      if (UnifiedResult.isErr(result) && isValidationError(result.error)) {
        // Should narrow to ValidationError
        assertEquals(result.error.violations, []);
      }
    });
  });

  describe("Edge Cases and Error Boundaries", () => {
    it("should handle null and undefined gracefully", () => {
      const nullResult = UnifiedResult.ok<null, UnifiedError>(null);
      const undefinedResult = UnifiedResult.ok<undefined, UnifiedError>(undefined);

      assertEquals(nullResult.success, true);
      assertEquals(nullResult.data, null);

      assertEquals(undefinedResult.success, true);
      assertEquals(undefinedResult.data, undefined);
    });

    it("should handle circular references in errors", () => {
      const circularError: any = { message: "circular" };
      circularError.self = circularError;

      const result = UnifiedResult.err<string, UnifiedError>(
        ErrorFactories.unknown(circularError),
      );

      assertEquals(result.success, false);
      if (!result.success) {
        assertEquals(result.error.kind, "UNKNOWN_ERROR");
        // Should not throw when accessing
        assertExists(result.error.originalError);
      }
    });

    it("should provide safe unwrapOr for default values", () => {
      const successResult = UnifiedResult.ok<string, UnifiedError>("value");
      const errorResult = UnifiedResult.err<string, UnifiedError>(
        ErrorFactories.unknown(new Error("error")),
      );

      assertEquals(UnifiedResult.unwrapOr(successResult, "default"), "value");
      assertEquals(UnifiedResult.unwrapOr(errorResult, "default"), "default");
    });

    it("should handle complex generic constraints", () => {
      // Test with constrained generics
      interface Validatable {
        validate(): boolean;
      }

      function processValidatable<T extends Validatable>(
        item: T,
      ): UnifiedResult<T, UnifiedError> {
        return item.validate()
          ? UnifiedResult.ok(item)
          : UnifiedResult.err(ErrorFactories.unknown(new Error("Validation failed")));
      }

      class TestItem implements Validatable {
        constructor(private valid: boolean) {}
        validate(): boolean {
          return this.valid;
        }
      }

      const validItem = new TestItem(true);
      const invalidItem = new TestItem(false);

      const result1 = processValidatable(validItem);
      const result2 = processValidatable(invalidItem);

      assertEquals(result1.success, true);
      assertEquals(result2.success, false);
    });
  });

  describe("Memory and Performance Considerations", () => {
    it("should handle large error chains efficiently", () => {
      let result = UnifiedResult.ok<number, UnifiedError>(0);

      // Chain many operations
      for (let i = 0; i < 1000; i++) {
        result = UnifiedResult.map(result, (n) => n + 1);
      }

      assertEquals(result.success, true);
      if (result.success) {
        assertEquals(result.data, 1000);
      }
    });

    it("should not create unnecessary objects in error paths", () => {
      const error = ErrorFactories.unknown(new Error("test"));
      const result = UnifiedResult.err<string, UnifiedError>(error);

      // Multiple map operations on error should reuse error
      const mapped1 = UnifiedResult.map(result, (s) => s.toUpperCase());
      const mapped2 = UnifiedResult.map(mapped1, (s) => s.length);

      assertEquals(mapped1.success, false);
      assertEquals(mapped2.success, false);
      if (!mapped1.success && !mapped2.success) {
        // Should be the same error reference
        assertEquals(mapped1.error, error);
        assertEquals(mapped2.error, error);
      }
    });
  });
});
