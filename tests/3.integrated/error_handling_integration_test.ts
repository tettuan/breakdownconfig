/**
 * Total Function Error Handling Integration Test
 *
 * Comprehensive test suite for verifying error handling patterns
 * in the Total Function implementation:
 * - Result type error propagation
 * - UnifiedError type consistency
 * - Exception-free error handling
 * - Error recovery patterns
 */

import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { BreakdownConfig } from "../../mod.ts";
import { Result } from "../../src/types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "../../src/errors/unified_errors.ts";
import { cleanupTestConfigs, setupInvalidConfig, setupMergeConfigs } from "../test_utils.ts";
import {
  assertResultError,
  assertResultErrorKind,
  assertUnifiedResultOk,
} from "../test_helpers/result_test_helpers.ts";

describe("Total Function Error Handling Integration", () => {
  describe("Result Type Error Propagation", () => {
    it("should propagate errors through Result chain without exceptions", async () => {
      // Create config with invalid path
      const configResult = BreakdownConfig.create("test", "/non/existent/path");
      assertExists(configResult.success);
      assertUnifiedResultOk(configResult);

      if (!configResult.success) {
        throw new Error("Expected successful config creation");
      }
      const config = configResult.data;

      // Load config should return error Result
      const loadResult = await config.loadConfigSafe();
      assertResultErrorKind(loadResult, "CONFIG_FILE_NOT_FOUND");

      // All subsequent operations should propagate the error
      const getConfigResult = await config.getConfigSafe();
      assertResultErrorKind(getConfigResult, "CONFIG_NOT_LOADED");

      const workingDirResult = await config.getWorkingDirSafe();
      assertResultErrorKind(workingDirResult, "CONFIG_NOT_LOADED");

      const promptDirResult = await config.getPromptDirSafe();
      assertResultErrorKind(promptDirResult, "CONFIG_NOT_LOADED");

      const schemaDirResult = await config.getSchemaDirSafe();
      assertResultErrorKind(schemaDirResult, "CONFIG_NOT_LOADED");

      // Verify all errors have same root cause
      if (!getConfigResult.success && !workingDirResult.success) {
        assertEquals(getConfigResult.error.kind, workingDirResult.error.kind);
      }
      if (!promptDirResult.success && !schemaDirResult.success) {
        assertEquals(promptDirResult.error.kind, schemaDirResult.error.kind);
      }
    });

    it("should handle error recovery with Result.map and Result.flatMap", async () => {
      const tempDir = await setupMergeConfigs();

      try {
        // Simulate error scenario
        const errorResult: Result<string, UnifiedError> = Result.err(
          ErrorFactories.configValidationError("test_field", [{
            field: "test",
            value: 123,
            expectedType: "string",
            actualType: "number",
          }]),
        );

        // Map should preserve error
        const mappedResult = Result.map(errorResult, (value: string) => value.toUpperCase());
        assertResultErrorKind(mappedResult, "CONFIG_VALIDATION_ERROR");

        // FlatMap should preserve error
        const flatMappedResult = Result.flatMap(
          errorResult,
          (value) => Result.ok(`Processed: ${value}`),
        );
        assertResultErrorKind(flatMappedResult, "CONFIG_VALIDATION_ERROR");

        // mapErr should transform error
        const mappedErrResult = Result.mapErr(
          errorResult,
          (error) =>
            ErrorFactories.unknown(
              `Wrapped: ${error instanceof Error ? error.message : error.message}`,
            ),
        );
        assertResultError(mappedErrResult);
        if (!mappedErrResult.success) {
          assertEquals(mappedErrResult.error.kind, "UNKNOWN_ERROR");
          if (mappedErrResult.error instanceof Error) {
            assert(mappedErrResult.error.message.includes("Wrapped:"));
          } else {
            assert(mappedErrResult.error.message.includes("Wrapped:"));
          }
        }
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should handle Result.all with mixed success and error results", () => {
      const results: Result<string, UnifiedError>[] = [
        Result.ok("success1"),
        Result.err(ErrorFactories.configFileNotFound("/test/path", "app")),
        Result.ok("success2"),
        Result.err(ErrorFactories.invalidProfileName("invalid@name")),
      ];

      const allResult = Result.all(results);
      assertResultError(allResult);

      // Should return first error
      if (!allResult.success) {
        assertEquals(allResult.error.kind, "CONFIG_FILE_NOT_FOUND");
      }
    });
  });

  describe("UnifiedError Type Consistency", () => {
    it("should maintain error type discrimination across operations", async () => {
      const tempDir = await setupInvalidConfig({
        working_dir: "",
        app_prompt: { base_dir: "../../../etc" },
        app_schema: { base_dir: "a".repeat(300) },
      });

      try {
        const configResult = BreakdownConfig.create(undefined, tempDir);
        assertUnifiedResultOk(configResult);

        if (!configResult.success) {
          throw new Error("Expected successful config creation");
        }
        const config = configResult.data;
        const loadResult = await config.loadConfigSafe();

        if (!loadResult.success) {
          const error = loadResult.error;

          // Type guard should work correctly
          switch (error.kind) {
            case "CONFIG_VALIDATION_ERROR":
              assertExists(error.violations);
              assert(error.violations.length > 0);
              error.violations.forEach(
                (violation: { field: string; expectedType: string; actualType: string }) => {
                  assertExists(violation.field);
                  assertExists(violation.expectedType);
                  assertExists(violation.actualType);
                },
              );
              break;
            case "PATH_VALIDATION_ERROR":
              assertExists(error.path);
              assertExists(error.reason);
              assertExists(error.affectedField);
              break;
            default:
              // Should be one of the above
              throw new Error(`Unexpected error kind: ${error.kind}`);
          }
        }
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should preserve error context through error factories", () => {
      // Test each error factory maintains proper type
      const fileNotFoundError = ErrorFactories.configFileNotFound("/test/path", "app");
      assertEquals(fileNotFoundError.kind, "CONFIG_FILE_NOT_FOUND");
      assertEquals(fileNotFoundError.path, "/test/path");
      assertEquals(fileNotFoundError.configType, "app");

      const parseError = ErrorFactories.configParseError("/test/config.yml", "Invalid YAML");
      assertEquals(parseError.kind, "CONFIG_PARSE_ERROR");
      assertEquals(parseError.path, "/test/config.yml");
      assertEquals(parseError.syntaxError, "Invalid YAML");

      const validationError = ErrorFactories.configValidationError("test_field", [{
        field: "working_dir",
        value: "",
        expectedType: "non-empty string",
        actualType: "string",
        constraint: "Working directory cannot be empty",
      }]);
      assertEquals(validationError.kind, "CONFIG_VALIDATION_ERROR");
      assertEquals(validationError.violations.length, 1);
      assertEquals(validationError.violations[0].field, "working_dir");

      const pathError = ErrorFactories.pathValidationError(
        "../../../etc/passwd",
        "PATH_TRAVERSAL",
        "app_prompt.base_dir",
      );
      assertEquals(pathError.kind, "PATH_VALIDATION_ERROR");
      assertEquals(pathError.reason, "PATH_TRAVERSAL");
      assertEquals(pathError.affectedField, "app_prompt.base_dir");
    });
  });

  describe("Exception-Free Error Handling", () => {
    it("should handle all error cases without throwing exceptions", async () => {
      // Test various error scenarios
      const errorScenarios = [
        { profile: "invalid@profile", baseDir: undefined },
        { profile: undefined, baseDir: "/non/existent/path" },
        { profile: "test", baseDir: "" },
        { profile: "../../etc", baseDir: "/tmp" },
        { profile: "a".repeat(100), baseDir: "/tmp" },
      ];

      for (const scenario of errorScenarios) {
        const configResult = BreakdownConfig.create(scenario.profile, scenario.baseDir);

        // Should always return a Result, never throw
        assertExists(configResult);
        assertExists(configResult.success);

        if (configResult.success) {
          const config = configResult.data;

          // Safe operations should never throw
          const loadResult = await config.loadConfigSafe();
          assertExists(loadResult);
          assertExists(loadResult.success);

          const getConfigResult = await config.getConfigSafe();
          assertExists(getConfigResult);
          assertExists(getConfigResult.success);

          const workingDirResult = await config.getWorkingDirSafe();
          assertExists(workingDirResult);
          assertExists(workingDirResult.success);
        }
      }
    });

    it("should handle concurrent error operations safely", async () => {
      const configResult = BreakdownConfig.create(undefined, "/invalid/path");
      assertUnifiedResultOk(configResult);

      if (!configResult.success) {
        throw new Error("Expected successful config creation");
      }
      const config = configResult.data;

      // Concurrent operations should all return errors safely
      const results = await Promise.all([
        config.loadConfigSafe(),
        config.getConfigSafe(),
        config.getWorkingDirSafe(),
        config.getPromptDirSafe(),
        config.getSchemaDirSafe(),
      ]);

      // All should be error results
      results.forEach((result: Result<unknown, UnifiedError>) => {
        assertExists(result);
        assertExists(result.success);
        assertEquals(result.success, false);
      });

      // loadConfigSafe should have CONFIG_FILE_NOT_FOUND
      assertResultErrorKind(results[0], "CONFIG_FILE_NOT_FOUND");

      // Others should have CONFIG_NOT_LOADED
      assertResultErrorKind(results[1], "CONFIG_NOT_LOADED");
      assertResultErrorKind(results[2], "CONFIG_NOT_LOADED");
      assertResultErrorKind(results[3], "CONFIG_NOT_LOADED");
      assertResultErrorKind(results[4], "CONFIG_NOT_LOADED");
    });
  });

  describe("Error Recovery Patterns", () => {
    it("should support error recovery with default values", async () => {
      const configResult = BreakdownConfig.create(undefined, "/invalid/path");
      assertUnifiedResultOk(configResult);

      if (!configResult.success) {
        throw new Error("Expected successful config creation");
      }
      const config = configResult.data;
      const loadResult = await config.loadConfigSafe();

      // Recover with default config
      const configWithDefault = Result.unwrapOr(loadResult, undefined);
      assertEquals(configWithDefault, undefined);

      // Recover with custom default
      const workingDirResult = await config.getWorkingDirSafe();
      const workingDirWithDefault = Result.unwrapOr(workingDirResult, "/default/working/dir");
      assertEquals(workingDirWithDefault, "/default/working/dir");
    });

    it("should support error transformation and recovery", async () => {
      const tempDir = await setupInvalidConfig({
        working_dir: "",
        app_prompt: { base_dir: "prompts" },
        app_schema: { base_dir: "schemas" },
      });

      try {
        const configResult = BreakdownConfig.create(undefined, tempDir);
        assertUnifiedResultOk(configResult);

        if (!configResult.success) {
          throw new Error("Expected successful config creation");
        }
        const config = configResult.data;
        const loadResult = await config.loadConfigSafe();

        // Transform validation error to user-friendly message
        const transformedResult = Result.mapErr(loadResult, (error: UnifiedError) => {
          if (error.kind === "CONFIG_VALIDATION_ERROR") {
            const fields = error.violations.map((v: { field: string }) => v.field).join(", ");
            return ErrorFactories.unknown(
              `Configuration invalid. Please check: ${fields}`,
            );
          }
          return error;
        });

        if (!transformedResult.success) {
          if (transformedResult.error instanceof Error) {
            assert(transformedResult.error.message.includes("Please check:"));
          } else {
            assert(transformedResult.error.message.includes("Please check:"));
          }
        }
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should chain error handling with Result.fromPromise", async () => {
      // Simulate async operation that might fail
      const asyncOperation = (shouldFail: boolean): Promise<string> => {
        if (shouldFail) {
          return Promise.reject(new Error("Async operation failed"));
        }
        return Promise.resolve("Success");
      };

      // Test success case
      const successResult = await Result.fromPromise(
        asyncOperation(false),
        (error) =>
          ErrorFactories.unknown(
            error instanceof Error ? error.message : "Unknown async error",
          ),
      );
      assertUnifiedResultOk(successResult);
      if (!successResult.success) {
        throw new Error("Expected successful result");
      }
      assertEquals(successResult.data, "Success");

      // Test failure case
      const failureResult = await Result.fromPromise(
        asyncOperation(true),
        (error) =>
          ErrorFactories.unknown(
            error instanceof Error ? error.message : "Unknown async error",
          ),
      );
      assertResultError(failureResult);
      if (!failureResult.success) {
        assertEquals(failureResult.error.kind, "UNKNOWN_ERROR");
        if (failureResult.error instanceof Error) {
          assert(failureResult.error.message.includes("Async operation failed"));
        } else {
          assert(failureResult.error.message.includes("Async operation failed"));
        }
      }
    });
  });

  describe("Legacy API Error Compatibility", () => {
    it("should maintain compatibility between Safe and legacy APIs", async () => {
      const tempDir = await setupMergeConfigs();

      try {
        const configResult = BreakdownConfig.create(undefined, tempDir);
        assertUnifiedResultOk(configResult);

        if (!configResult.success) {
          throw new Error("Expected successful config creation");
        }
        const config = configResult.data;

        // Load config successfully
        const loadResult = await config.loadConfigSafe();
        assertUnifiedResultOk(loadResult);

        // Safe API should return success
        const safeConfigResult = await config.getConfigSafe();
        assertUnifiedResultOk(safeConfigResult);

        // Legacy API should return same data without Result wrapper
        const legacyConfig = await config.getConfig();
        if (!safeConfigResult.success) {
          throw new Error("Expected successful config result");
        }
        assertEquals(safeConfigResult.data, legacyConfig);

        // Test error case - config not loaded
        const newConfigResult = BreakdownConfig.create(undefined, tempDir);
        assertUnifiedResultOk(newConfigResult);

        if (!newConfigResult.success) {
          throw new Error("Expected successful config creation");
        }
        const newConfig = newConfigResult.data;

        // Safe API returns error Result
        const errorResult = await newConfig.getConfigSafe();
        assertResultErrorKind(errorResult, "CONFIG_NOT_LOADED");

        // Legacy API throws exception
        await assertRejects(
          async () => await newConfig.getConfig(),
          Error,
          "ERR1010: Configuration not loaded. Cannot perform operation: getConfig",
        );
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });
});
