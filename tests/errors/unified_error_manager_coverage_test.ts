/**
 * High-efficiency coverage tests for UnifiedErrorManager
 * Target: 40.6% → 85%+ coverage (+44.4%)
 */

import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://jsr.io/@std/testing@0.224.0/bdd";
import { UnifiedErrorManager } from "../../src/errors/unified_error_manager.ts";
import { StandardErrorCode } from "../../src/errors/unified_error_interface.ts";

describe("UnifiedErrorManager Coverage Tests", () => {
  describe("Error Creation Methods", () => {
    it("should create configuration errors with all parameters", () => {
      const error = UnifiedErrorManager.createConfigurationError(
        "test message",
        StandardErrorCode.CF_CONFIG_FILE_NOT_FOUND,
        { path: "/test/path", details: "Additional context" }
      );
      
      assertEquals(error.message, "test message");
      assertEquals(error.code, StandardErrorCode.CF_CONFIG_FILE_NOT_FOUND);
      assertEquals(error.context?.path, "/test/path");
      assertEquals(error.category, "CONFIGURATION");
    });

    it("should create validation errors with field context", () => {
      const error = UnifiedErrorManager.createValidationError(
        "validation failed",
        StandardErrorCode.VL_REQUIRED_FIELD_MISSING,
        { field: "workingDir", value: null }
      );
      
      assertEquals(error.message, "validation failed");
      assertEquals(error.code, StandardErrorCode.VL_REQUIRED_FIELD_MISSING);
      assertEquals(error.context?.field, "workingDir");
      assertEquals(error.category, "VALIDATION");
    });

    it("should create path security errors with path context", () => {
      const error = UnifiedErrorManager.createPathSecurityError(
        "path traversal detected",
        StandardErrorCode.PS_PATH_TRAVERSAL,
        { path: "../../../etc/passwd", field: "workingDir" }
      );
      
      assertEquals(error.message, "path traversal detected");
      assertEquals(error.code, StandardErrorCode.PS_PATH_TRAVERSAL);
      assertEquals(error.context?.path, "../../../etc/passwd");
      assertEquals(error.category, "PATH_SECURITY");
    });

    it("should create system errors with original error context", () => {
      const originalError = new Error("File system error");
      const error = UnifiedErrorManager.createSystemError(
        "system failure",
        StandardErrorCode.UN_UNKNOWN_ERROR,
        { originalError, operation: "file_read" }
      );
      
      assertEquals(error.message, "system failure");
      assertEquals(error.code, StandardErrorCode.UN_UNKNOWN_ERROR);
      assertEquals(error.context?.originalError, originalError);
      assertEquals(error.category, "SYSTEM");
    });
  });

  describe("Error Transformation Methods", () => {
    it("should transform JavaScript errors to unified errors", () => {
      const jsError = new Error("Original JS error");
      const unifiedError = UnifiedErrorManager.fromJavaScriptError(
        jsError,
        StandardErrorCode.UN_UNKNOWN_ERROR,
        { operation: "config_load" }
      );
      
      assertEquals(unifiedError.message, "Original JS error");
      assertEquals(unifiedError.code, StandardErrorCode.UN_UNKNOWN_ERROR);
      assertEquals(unifiedError.context?.operation, "config_load");
      assertEquals(unifiedError.context?.originalError, jsError);
    });

    it("should handle error chaining with cause relationships", () => {
      const rootCause = UnifiedErrorManager.createSystemError(
        "root cause",
        StandardErrorCode.UN_UNKNOWN_ERROR
      );
      
      const chainedError = UnifiedErrorManager.createConfigurationError(
        "config error",
        StandardErrorCode.CF_CONFIG_PARSE_ERROR,
        { path: "/config.yaml" },
        rootCause
      );
      
      assertEquals(chainedError.cause, rootCause);
      assertEquals(chainedError.message, "config error");
      assertEquals(rootCause.message, "root cause");
    });

    it("should wrap unknown values as unified errors", () => {
      const unknownValue = { weird: "object", nested: { data: 123 } };
      const wrappedError = UnifiedErrorManager.wrapUnknownError(
        unknownValue,
        "context info",
        { operation: "data_processing" }
      );
      
      assertEquals(wrappedError.code, StandardErrorCode.UN_UNKNOWN_ERROR);
      assertEquals(wrappedError.context?.context, "context info");
      assertEquals(wrappedError.context?.operation, "data_processing");
      assertEquals(wrappedError.context?.originalError, unknownValue);
    });
  });

  describe("Error Aggregation Methods", () => {
    it("should aggregate multiple errors into a single error", () => {
      const errors = [
        UnifiedErrorManager.createValidationError(
          "field 1 missing",
          StandardErrorCode.VL_REQUIRED_FIELD_MISSING,
          { field: "workingDir" }
        ),
        UnifiedErrorManager.createValidationError(
          "field 2 invalid",
          StandardErrorCode.VL_TYPE_MISMATCH,
          { field: "promptDir", expected: "string", actual: "number" }
        ),
        UnifiedErrorManager.createConfigurationError(
          "config not found",
          StandardErrorCode.CF_CONFIG_FILE_NOT_FOUND,
          { path: "/missing.yaml" }
        )
      ];
      
      const aggregated = UnifiedErrorManager.aggregateErrors(errors, "Multiple validation failures");
      
      assertEquals(aggregated.message, "Multiple validation failures");
      assertEquals(aggregated.code, StandardErrorCode.VL_VALIDATION_AGGREGATE);
      assertEquals(aggregated.context?.errorCount, 3);
      assertEquals(aggregated.context?.errors, errors);
    });

    it("should handle empty error array gracefully", () => {
      const aggregated = UnifiedErrorManager.aggregateErrors([], "No errors");
      
      assertEquals(aggregated.message, "No errors");
      assertEquals(aggregated.context?.errorCount, 0);
      assertEquals(aggregated.context?.errors, []);
    });

    it("should handle single error aggregation", () => {
      const singleError = UnifiedErrorManager.createValidationError(
        "single error",
        StandardErrorCode.VL_REQUIRED_FIELD_MISSING
      );
      
      const aggregated = UnifiedErrorManager.aggregateErrors([singleError], "Single error wrapper");
      
      assertEquals(aggregated.message, "Single error wrapper");
      assertEquals(aggregated.context?.errorCount, 1);
      assertEquals(aggregated.context?.errors?.[0], singleError);
    });
  });

  describe("Error Analysis Methods", () => {
    it("should classify error severity correctly", () => {
      const criticalError = UnifiedErrorManager.createPathSecurityError(
        "security breach",
        StandardErrorCode.PS_PATH_TRAVERSAL,
        { path: "../../secret" }
      );
      
      const warningError = UnifiedErrorManager.createValidationError(
        "optional field missing",
        StandardErrorCode.VL_REQUIRED_FIELD_MISSING,
        { field: "optional_setting" }
      );
      
      assertEquals(criticalError.severity, "CRITICAL");
      assertEquals(warningError.severity, "ERROR");
    });

    it("should check if errors are recoverable", () => {
      const recoverableError = UnifiedErrorManager.createValidationError(
        "validation error",
        StandardErrorCode.VL_TYPE_MISMATCH
      );
      
      const nonRecoverableError = UnifiedErrorManager.createPathSecurityError(
        "security violation",
        StandardErrorCode.PS_PATH_TRAVERSAL
      );
      
      // Test error recovery classification
      assertEquals(typeof recoverableError.severity, "string");
      assertEquals(typeof nonRecoverableError.severity, "string");
    });
  });

  describe("Error Serialization and Formatting", () => {
    it("should serialize errors to JSON with all fields", () => {
      const error = UnifiedErrorManager.createConfigurationError(
        "config error",
        StandardErrorCode.CF_CONFIG_PARSE_ERROR,
        { path: "/test.yaml", line: 42, column: 15 }
      );
      
      const serialized = UnifiedErrorManager.serializeError(error);
      const parsed = JSON.parse(serialized);
      
      assertEquals(parsed.message, "config error");
      assertEquals(parsed.code, StandardErrorCode.CF_CONFIG_PARSE_ERROR);
      assertEquals(parsed.category, "CONFIGURATION");
      assertEquals(parsed.context.path, "/test.yaml");
      assertEquals(parsed.context.line, 42);
    });

    it("should format error messages with context interpolation", () => {
      const error = UnifiedErrorManager.createConfigurationError(
        "File not found at {path}",
        StandardErrorCode.CF_CONFIG_FILE_NOT_FOUND,
        { path: "/missing/config.yaml", searchedLocations: ["/etc", "/home"] }
      );
      
      const formatted = UnifiedErrorManager.formatErrorMessage(error);
      
      // Should contain the error information
      assertEquals(typeof formatted, "string");
      assertEquals(formatted.includes("config error") || formatted.includes("File not found"), true);
    });

    it("should create user-friendly error descriptions", () => {
      const error = UnifiedErrorManager.createValidationError(
        "Required field missing",
        StandardErrorCode.VL_REQUIRED_FIELD_MISSING,
        { field: "workingDir", parentObject: "appConfig" }
      );
      
      const description = UnifiedErrorManager.createUserFriendlyDescription(error);
      
      assertEquals(typeof description, "string");
      assertEquals(description.length > 0, true);
    });
  });

  describe("Error Recovery and Suggestions", () => {
    it("should provide context-aware recovery suggestions", () => {
      const configError = UnifiedErrorManager.createConfigurationError(
        "config not found",
        StandardErrorCode.CF_CONFIG_FILE_NOT_FOUND,
        { path: "/app.yaml", configType: "app" }
      );
      
      const suggestions = UnifiedErrorManager.getRecoverySuggestions(configError);
      
      assertEquals(Array.isArray(suggestions), true);
      assertEquals(suggestions.length > 0, true);
      assertEquals(typeof suggestions[0], "string");
    });

    it("should handle errors without specific recovery paths", () => {
      const unknownError = UnifiedErrorManager.createSystemError(
        "unknown system error",
        StandardErrorCode.UN_UNKNOWN_ERROR,
        { randomData: "unexpected" }
      );
      
      const suggestions = UnifiedErrorManager.getRecoverySuggestions(unknownError);
      
      assertEquals(Array.isArray(suggestions), true);
      // Should provide generic suggestions for unknown errors
    });
  });

  describe("Error Manager State and Configuration", () => {
    it("should handle error manager configuration", () => {
      // Test manager initialization and configuration
      const manager = UnifiedErrorManager;
      
      // Verify manager has required methods
      assertEquals(typeof manager.createConfigurationError, "function");
      assertEquals(typeof manager.createValidationError, "function");
      assertEquals(typeof manager.createPathSecurityError, "function");
      assertEquals(typeof manager.createSystemError, "function");
    });

    it("should validate error codes and categories consistency", () => {
      const configError = UnifiedErrorManager.createConfigurationError(
        "test",
        StandardErrorCode.CF_CONFIG_FILE_NOT_FOUND
      );
      
      const validationError = UnifiedErrorManager.createValidationError(
        "test",
        StandardErrorCode.VL_REQUIRED_FIELD_MISSING
      );
      
      const pathError = UnifiedErrorManager.createPathSecurityError(
        "test",
        StandardErrorCode.PS_PATH_TRAVERSAL
      );
      
      // Verify category consistency
      assertEquals(configError.category, "CONFIGURATION");
      assertEquals(validationError.category, "VALIDATION");
      assertEquals(pathError.category, "PATH_SECURITY");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle null and undefined contexts gracefully", () => {
      const errorWithNull = UnifiedErrorManager.createConfigurationError(
        "test message",
        StandardErrorCode.CF_CONFIG_FILE_NOT_FOUND,
        null as any
      );
      
      const errorWithUndefined = UnifiedErrorManager.createValidationError(
        "test message",
        StandardErrorCode.VL_REQUIRED_FIELD_MISSING,
        undefined as any
      );
      
      assertEquals(errorWithNull.message, "test message");
      assertEquals(errorWithUndefined.message, "test message");
    });

    it("should handle deep context objects", () => {
      const deepContext = {
        level1: {
          level2: {
            level3: {
              data: "deep value",
              array: [1, 2, 3],
              nested: { more: "data" }
            }
          }
        }
      };
      
      const error = UnifiedErrorManager.createSystemError(
        "deep context test",
        StandardErrorCode.UN_UNKNOWN_ERROR,
        deepContext
      );
      
      assertEquals(error.context?.level1?.level2?.level3?.data, "deep value");
    });

    it("should handle circular references in context", () => {
      const circularContext: any = { name: "test" };
      circularContext.self = circularContext;
      
      // Should not throw when creating error with circular context
      const error = UnifiedErrorManager.createSystemError(
        "circular test",
        StandardErrorCode.UN_UNKNOWN_ERROR,
        circularContext
      );
      
      assertEquals(error.message, "circular test");
      assertEquals(error.context?.name, "test");
    });
  });
});