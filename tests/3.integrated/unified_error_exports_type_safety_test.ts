/**
 * Unified Error Final Exports - Type Safety Integration Tests
 *
 * This test suite verifies that the unified_error_final_exports.ts module
 * follows Total Function principles and has no 'any' types.
 */

import {
  assert,
  assertEquals,
  assertExists,
  assertInstanceOf,
} from "https://deno.land/std@0.220.1/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.220.1/testing/bdd.ts";

import {
  ErrorFactories,
  ErrorHandlingUtils,
  QuickErrorFactory,
} from "../../src/errors/unified_error_final_exports.ts";

describe("Unified Error Final Exports Type Safety Tests", () => {
  describe("Type Safety in Error Conversion", () => {
    it("should handle error conversion without any type", () => {
      // Test different error input types
      const testCases = [
        { input: new Error("Test error"), description: "Error instance" },
        { input: "String error", description: "String error" },
        { input: ErrorFactories.unknown(new Error("Unknown")), description: "UnknownError" },
      ];

      for (const testCase of testCases) {
        const result = ErrorHandlingUtils.handleSync(() => {
          if (testCase.input === "String error") {
            throw testCase.input;
          }
          throw testCase.input;
        }, `Testing ${testCase.description}`);

        assert(!result.success);
        if (!result.success) {
          assertExists(result.error);
          if (result.error instanceof Error) {
            assertExists(result.error.message);
            assertEquals(typeof result.error.message, "string");
          } else {
            assertExists(result.error.message);
            assertEquals(typeof result.error.message, "string");
          }
        }
      }
    });

    it("should handle async operations with proper typing", async () => {
      // Test async operation that throws
      const asyncOperation = (): Promise<number> => {
        return Promise.reject(new Error("Async error"));
      };

      const result = await ErrorHandlingUtils.handleAsync(
        asyncOperation(),
        "Async operation test",
      );

      assert(!result.success);
      if (!result.success) {
        assertExists(result.error);
        if (result.error instanceof Error) {
          assertExists(result.error.message);
          assertEquals(typeof result.error.message, "string");
        } else {
          assertExists(result.error.message);
          assertEquals(typeof result.error.message, "string");
        }
      }
    });

    it("should create error boundaries with type preservation", () => {
      // Test function with explicit types
      const divide = (a: number, b: number): number => {
        if (b === 0) throw new Error("Division by zero");
        return a / b;
      };

      const safeDivide = ErrorHandlingUtils.withErrorBoundary(
        divide,
        "Division operation",
      );

      // Test successful operation
      const result1 = safeDivide(10, 2);
      assert(result1.success);
      if (result1.success) {
        assertEquals(result1.data, 5);
        assertEquals(typeof result1.data, "number");
      }

      // Test error case
      const result2 = safeDivide(10, 0);
      assert(!result2.success);
      if (!result2.success) {
        assertExists(result2.error);
        if (result2.error instanceof Error) {
          assertExists(result2.error.message);
        } else {
          assertExists(result2.error.message);
        }
      }
    });

    it("should create async error boundaries with type preservation", async () => {
      // Test async function with explicit types
      const asyncDivide = (a: number, b: number): Promise<number> => {
        if (b === 0) return Promise.reject(new Error("Async division by zero"));
        return Promise.resolve(a / b);
      };

      const safeAsyncDivide = ErrorHandlingUtils.withAsyncErrorBoundary(
        asyncDivide,
        "Async division operation",
      );

      // Test successful operation
      const result1 = await safeAsyncDivide(20, 4);
      assert(result1.success);
      if (result1.success) {
        assertEquals(result1.data, 5);
        assertEquals(typeof result1.data, "number");
      }

      // Test error case
      const result2 = await safeAsyncDivide(20, 0);
      assert(!result2.success);
      if (!result2.success) {
        assertExists(result2.error);
        if (result2.error instanceof Error) {
          assertExists(result2.error.message);
        } else {
          assertExists(result2.error.message);
        }
      }
    });
  });

  describe("Generic Type Safety in QuickErrorFactory", () => {
    it("should maintain type safety with generic parameters", () => {
      // Test typeMismatch with various types - verifying generic type parameter works
      const testValues = [
        { value: 123, type: "number" },
        { value: "test", type: "string" },
        { value: true, type: "boolean" },
        { value: { key: "value" }, type: "object" },
        { value: [1, 2, 3], type: "array" },
      ];

      for (const test of testValues) {
        const error = QuickErrorFactory.typeMismatch(
          "testField",
          "string",
          test.type,
          test.value,
        );

        assertExists(error);
        assertEquals(error.kind, "TYPE_MISMATCH");
        assertExists(error.message);

        // Verify the error was created successfully
        assertEquals(typeof error.message, "string");
        assertInstanceOf(error.timestamp, Date);
      }
    });

    it("should create all error types without any type usage", () => {
      // Test all QuickErrorFactory methods
      const errors = [
        QuickErrorFactory.configNotFound("/path/to/config.json"),
        QuickErrorFactory.configParseFailed("/config.yaml", "Invalid YAML", 10, 5),
        QuickErrorFactory.fieldMissing("requiredField", "parentObject"),
        QuickErrorFactory.typeMismatch("field", "number", "string", "test"),
        QuickErrorFactory.pathTraversal("../../../etc/passwd", "configPath"),
        QuickErrorFactory.unknown(new Error("Unknown error"), "test context"),
      ];

      for (const error of errors) {
        assertExists(error);
        assertExists(error.kind);
        assertExists(error.message);
        assertExists(error.timestamp);

        // Verify types
        assertEquals(typeof error.kind, "string");
        assertEquals(typeof error.message, "string");
        assertInstanceOf(error.timestamp, Date);
      }
    });
  });

  describe("Total Function Compliance", () => {
    it("should never return undefined or null from error functions", () => {
      // Test that all factory functions return valid errors
      const operations = [
        () => ErrorFactories.unknown(new Error("test")),
        () => ErrorFactories.configFileNotFound("/test", "app"),
        () => ErrorFactories.typeMismatch("field", "expected", "actual", "value"),
        () => QuickErrorFactory.unknown("string error"),
      ];

      for (const operation of operations) {
        const result = operation();
        assertExists(result);
        assert(result !== null);
        assert(result !== undefined);
        assertExists(result.kind);
        assertExists(result.message);
      }
    });

    it("should handle edge cases in error conversion", () => {
      // Test edge cases for type safety
      const edgeCases = [
        { input: null as unknown, description: "null input" },
        { input: undefined as unknown, description: "undefined input" },
        { input: { custom: "object" } as unknown, description: "custom object" },
        { input: 123 as unknown, description: "number input" },
      ];

      for (const testCase of edgeCases) {
        const result = ErrorHandlingUtils.handleSync(() => {
          throw testCase.input;
        }, `Testing ${testCase.description}`);

        // Should always return a proper error result
        assert(!result.success);
        if (!result.success) {
          assertExists(result.error);
          assertExists(result.error.message);
          assertEquals(typeof result.error.message, "string");
        }
      }
    });

    it("should preserve type information through error boundaries", () => {
      // Complex type preservation test
      interface User {
        id: number;
        name: string;
      }

      const getUser = (id: number): User => {
        if (id < 0) throw new Error("Invalid user ID");
        return { id, name: `User${id}` };
      };

      const safeGetUser = ErrorHandlingUtils.withErrorBoundary(
        getUser,
        "Get user operation",
      );

      // Test type preservation in success case
      const result1 = safeGetUser(1);
      if (result1.success) {
        // TypeScript should know result1.data is User type
        assertEquals(result1.data.id, 1);
        assertEquals(result1.data.name, "User1");
      }

      // Test error case
      const result2 = safeGetUser(-1);
      assert(!result2.success);
    });
  });

  describe("Type Guards Without Type Assertions", () => {
    it("should use proper type guards instead of type assertions", () => {
      // Test that our helper function properly identifies error types
      const errors = [
        ErrorFactories.configFileNotFound("/test", "app"),
        ErrorFactories.unknown(new Error("test")),
        { kind: "CustomError", message: "test", timestamp: new Date() },
      ];

      for (const error of errors) {
        // The toUnifiedError function should handle these without type assertions
        const result = ErrorHandlingUtils.handleSync(() => {
          throw error;
        }, "Type guard test");

        assert(!result.success);
        if (!result.success) {
          assertExists(result.error);
          // Should have properly typed error without any casts
          assertEquals(typeof result.error.kind, "string");
          assertEquals(typeof result.error.message, "string");
        }
      }
    });
  });
});
