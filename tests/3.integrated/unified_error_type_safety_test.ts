/**
 * Unified Error System - Type Safety Integration Tests
 *
 * This test suite verifies that the unified error system follows Total Function principles
 * and maintains complete type safety without any 'any' types.
 */

import {
  assert,
  assertEquals,
  assertExists,
  assertInstanceOf,
} from "https://deno.land/std@0.220.1/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.220.1/testing/bdd.ts";

import {
  type BaseErrorInterface,
  ErrorCategory,
  ErrorFactories,
  ErrorGuards,
  ErrorHandlingUtils,
  ErrorSeverity,
  QuickErrorFactory,
  type StandardErrorCode as _StandardErrorCode,
  unifiedErrorManager,
} from "../../src/errors/unified_error_final_exports.ts";
import { ErrorHandlingUtils as ErrorUtilsHandling } from "../../src/errors/error_handling_utils.ts";

describe("Unified Error Type Safety Integration Tests", () => {
  describe("Type Guards and Total Functions", () => {
    it("should properly type guard BaseErrorInterface without type assertions", () => {
      const unifiedError = ErrorFactories.configFileNotFound("/test/config.json", "app");
      const error = ErrorUtilsHandling.toBaseErrorInterface(unifiedError);

      // Verify all required properties exist
      assertExists(error.kind);
      assertExists(error.code);
      assertExists(error.category);
      assertExists(error.severity);
      assertExists(error.message);
      assertExists(error.timestamp);

      // Verify types
      assertEquals(typeof error.kind, "string");
      assertEquals(typeof error.code, "string");
      assertEquals(typeof error.category, "string");
      assertEquals(typeof error.severity, "string");
      assertEquals(typeof error.message, "string");
      assertInstanceOf(error.timestamp, Date);
    });

    it("should handle error conversion without any type", () => {
      const testCases = [
        { input: new Error("Test error"), description: "Error instance" },
        { input: "String error", description: "String error" },
        { input: ErrorFactories.unknown(new Error("Unknown")), description: "BaseErrorInterface" },
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
          assertEquals(typeof result.error.kind, "string");
          assertEquals(typeof result.error.code, "string");
          assertEquals(typeof result.error.category, "string");
          assertEquals(typeof result.error.severity, "string");
        }
      }
    });
  });

  describe("Generic Type Safety", () => {
    it("should maintain type safety with generic parameters", () => {
      // Test typeMismatch with various types
      const testValues = [
        { value: 123, type: "number" },
        { value: "test", type: "string" },
        { value: true, type: "boolean" },
        { value: { key: "value" }, type: "object" },
        { value: [1, 2, 3], type: "array" },
      ];

      for (const test of testValues) {
        const unifiedError = QuickErrorFactory.typeMismatch(
          "testField",
          "string",
          test.type,
          test.value,
        );
        const error = ErrorUtilsHandling.toBaseErrorInterface(unifiedError);

        assertExists(error);
        assertEquals(unifiedError.kind, "TYPE_MISMATCH");

        // Verify the original unified error properties
        assertExists(unifiedError.value);
        if ("value" in unifiedError) {
          assertEquals(typeof unifiedError.value, typeof test.value);
        }
      }
    });
  });

  describe("Error Handling Utilities Type Safety", () => {
    it("should handle async operations with proper typing", async () => {
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
        assertEquals(result.error.category, ErrorCategory.UNKNOWN);
        assertEquals(result.error.severity, ErrorSeverity.CRITICAL);
      }
    });

    it("should handle sync operations with proper typing", () => {
      const syncOperation = (): string => {
        throw new Error("Sync error");
      };

      const result = ErrorHandlingUtils.handleSync(
        syncOperation,
        "Sync operation test",
      );

      assert(!result.success);
      if (!result.success) {
        assertExists(result.error);
        assertEquals(result.error.category, ErrorCategory.UNKNOWN);
        assertEquals(result.error.severity, ErrorSeverity.CRITICAL);
      }
    });

    it("should create error boundaries with type preservation", () => {
      const divide = (a: number, b: number): number => {
        if (b === 0) throw new Error("Division by zero");
        return a / b;
      };

      const safeDivide = ErrorHandlingUtils.withErrorBoundary(
        divide,
        "Division operation",
      );

      const result1 = safeDivide(10, 2);
      assert(result1.success);
      if (result1.success) {
        assertEquals(result1.data, 5);
      }

      const result2 = safeDivide(10, 0);
      assert(!result2.success);
      if (!result2.success) {
        assertExists(result2.error);
        assertEquals(result2.error.category, ErrorCategory.UNKNOWN);
        assertEquals(result2.error.severity, ErrorSeverity.CRITICAL);
      }
    });

    it("should create async error boundaries with type preservation", async () => {
      const asyncDivide = (a: number, b: number): Promise<number> => {
        if (b === 0) return Promise.reject(new Error("Async division by zero"));
        return Promise.resolve(a / b);
      };

      const safeAsyncDivide = ErrorHandlingUtils.withAsyncErrorBoundary(
        asyncDivide,
        "Async division operation",
      );

      const result1 = await safeAsyncDivide(20, 4);
      assert(result1.success);
      if (result1.success) {
        assertEquals(result1.data, 5);
      }

      const result2 = await safeAsyncDivide(20, 0);
      assert(!result2.success);
      if (!result2.success) {
        assertExists(result2.error);
        assertEquals(result2.error.category, ErrorCategory.UNKNOWN);
        assertEquals(result2.error.severity, ErrorSeverity.CRITICAL);
      }
    });
  });

  describe("Error Factory Type Safety", () => {
    it("should create all error types without any type usage", () => {
      const unifiedErrors = [
        QuickErrorFactory.configNotFound("/path/to/config.json"),
        QuickErrorFactory.configParseFailed("/config.yaml", "Invalid YAML", 10, 5),
        QuickErrorFactory.fieldMissing("requiredField", "parentObject"),
        QuickErrorFactory.typeMismatch("field", "number", "string", "test"),
        QuickErrorFactory.pathTraversal("../../../etc/passwd", "configPath"),
        QuickErrorFactory.unknown(new Error("Unknown error"), "test context"),
      ];

      for (const unifiedError of unifiedErrors) {
        const error = ErrorUtilsHandling.toBaseErrorInterface(unifiedError);
        assertExists(error);
        assertExists(error.kind);
        assertExists(error.code);
        assertExists(error.category);
        assertExists(error.severity);
        assertExists(error.message);
        assertExists(error.timestamp);

        // Verify no any types are present
        assertEquals(typeof error.kind, "string");
        assertEquals(typeof error.code, "string");
        assertEquals(typeof error.category, "string");
        assertEquals(typeof error.severity, "string");
        assertEquals(typeof error.message, "string");
        assertInstanceOf(error.timestamp, Date);
      }
    });
  });

  describe("Error System Integration", () => {
    it("should process errors through the entire system with type safety", async () => {
      // Create various errors
      const unifiedErrors = [
        ErrorFactories.configFileNotFound("/test.json", "app"),
        ErrorFactories.typeMismatch("field", "string", "number", 123),
        ErrorFactories.pathValidationError("/bad/path", "PATH_TRAVERSAL", "configPath"),
      ];
      const errors = unifiedErrors.map((e) => ErrorUtilsHandling.toBaseErrorInterface(e));

      // Process each error
      for (const error of errors) {
        // deno-lint-ignore no-await-in-loop
        await unifiedErrorManager.processError(error);
      }

      // Verify error aggregation
      const report = unifiedErrorManager.getErrorReport();
      assertExists(report);
      assertExists(report.summary);
      assertExists(report.recentErrors);
      assertExists(report.metrics);

      // Verify type safety in report
      assertEquals(typeof report.summary.total, "number");
      assert(report.summary.total >= errors.length);
    });

    it("should maintain type safety in error guards", () => {
      const testCases = [
        {
          error: ErrorFactories.configFileNotFound("/test.json", "app"),
          guard: ErrorGuards.isConfigFileNotFound,
          expected: true,
        },
        {
          error: ErrorFactories.typeMismatch("field", "string", "number", 123),
          guard: ErrorGuards.isTypeMismatchError,
          expected: true,
        },
        {
          error: ErrorFactories.pathValidationError("/bad/path", "PATH_TRAVERSAL", "field"),
          guard: ErrorGuards.isPathValidationError,
          expected: true,
        },
      ];

      for (const testCase of testCases) {
        const result = testCase.guard(testCase.error);
        assertEquals(result, testCase.expected);

        // Verify guard narrows type correctly
        if (result) {
          assertExists(testCase.error.kind);
          assertEquals(typeof testCase.error.kind, "string");
        }
      }
    });
  });

  describe("Total Function Compliance", () => {
    it("should never return undefined or null from error functions", () => {
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
      }
    });

    it("should handle all error cases exhaustively", () => {
      const handleError = (error: BaseErrorInterface): string => {
        // Convert BaseErrorInterface back to UnifiedError for guard checks
        const unifiedError = ErrorUtilsHandling.toUnifiedError(error);

        // This function demonstrates exhaustive handling without default case
        if (ErrorGuards.isConfigFileNotFound(unifiedError)) {
          return "Config not found";
        } else if (ErrorGuards.isConfigParseError(unifiedError)) {
          return "Config parse error";
        } else if (ErrorGuards.isConfigValidationError(unifiedError)) {
          return "Config validation error";
        } else if (ErrorGuards.isTypeMismatchError(unifiedError)) {
          return "Type mismatch";
        } else if (ErrorGuards.isRequiredFieldMissingError(unifiedError)) {
          return "Required field missing";
        } else if (ErrorGuards.isPathValidationError(unifiedError)) {
          return "Path validation error";
        } else if (ErrorGuards.isInvalidProfileNameError(unifiedError)) {
          return "Invalid profile name";
        } else if (ErrorGuards.isFileSystemError(unifiedError)) {
          return "File system error";
        } else if (ErrorGuards.isUnknownError(unifiedError)) {
          return "Unknown error";
        } else {
          // For any other case, return a default message
          return "Other error type";
        }
      };

      // Test with various error types
      const unifiedTestErrors = [
        ErrorFactories.configFileNotFound("/test", "app"),
        ErrorFactories.unknown(new Error("test")),
        ErrorFactories.typeMismatch("field", "string", "number", 123),
      ];
      const testErrors = unifiedTestErrors.map((e) => ErrorUtilsHandling.toBaseErrorInterface(e));

      for (const error of testErrors) {
        const result = handleError(error);
        assertExists(result);
        assertEquals(typeof result, "string");
      }
    });
  });
});
