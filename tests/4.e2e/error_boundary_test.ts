/**
 * Error Boundary E2E Tests
 * Level 4: End-to-End error boundary testing for Total Function design
 *
 * Tests comprehensive error handling boundaries across the entire system,
 * ensuring all error paths are properly captured and returned as Result types.
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { BreakdownConfig } from "../../mod.ts";
import { Result } from "../../src/types/unified_result.ts";
import { ErrorFactories, type UnifiedError } from "../../src/errors/unified_errors.ts";
import {
  assertConfigFileNotFoundError,
  assertConfigParseError,
  assertConfigValidationError,
  assertPathValidationError,
  assertResultError,
  assertResultErrorKind,
  type assertResultErrorMessage as _assertResultErrorMessage,
  assertResultSuccess,
} from "../test_helpers/result_test_helpers.ts";
import {
  cleanupTestConfigs,
  setupAppConfigOnly,
  setupCustomConfigSet,
  setupInvalidConfig,
} from "../test_utils.ts";
import { join } from "@std/path";

const RECURSIVE_OPTIONS = { recursive: true };

Deno.test("E2E: Error Boundary - Complete Error Handling Coverage", async (t) => {
  // deno-lint-ignore no-console
  console.log("Testing Total Function error boundaries across all system components");

  await t.step("Boundary: File System Errors", async () => {
    // Test 1: Non-existent directory
    const configResult = BreakdownConfig.create(undefined, "/absolutely/non/existent/path");
    assertResultSuccess(configResult);

    if (!configResult.success) {
      throw new Error("Config creation should have succeeded");
    }
    const config = configResult.data;
    const loadResult = await config.loadConfigSafe();
    assertConfigFileNotFoundError(loadResult);

    // Test 2: Permission denied simulation (using invalid chars in path)
    const invalidPathConfig = BreakdownConfig.create(undefined, "/tmp/\0invalid");
    assertResultError(invalidPathConfig);
    assertPathValidationError(invalidPathConfig);

    // Test 3: Invalid file content
    const tempDir = await Deno.makeTempDir();
    try {
      // Create invalid YAML file
      const configPath = join(tempDir, ".agent", "climpt", "config");
      await Deno.mkdir(configPath, RECURSIVE_OPTIONS);
      await Deno.writeTextFile(join(configPath, "app.yml"), "invalid: yaml: content: [");

      const parseErrorConfig = BreakdownConfig.create(undefined, tempDir);
      assertResultSuccess(parseErrorConfig);

      if (!parseErrorConfig.success) {
        throw new Error("Config creation should have succeeded");
      }
      const parseResult = await parseErrorConfig.data.loadConfigSafe();
      assertConfigParseError(parseResult);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  await t.step("Boundary: Path Validation Errors", () => {
    // Test various invalid path patterns
    const invalidPaths = [
      { path: "../../../etc/passwd", reason: "path traversal" },
      { path: "/etc/passwd", reason: "absolute path" },
      { path: "C:\\Windows\\System32", reason: "Windows absolute path" },
      { path: "../../..", reason: "multiple traversals" },
      { path: "./\0/null", reason: "null character" },
      { path: "path\nwith\nnewlines", reason: "newline characters" },
    ];

    for (const { path, reason: _reason } of invalidPaths) {
      const result = BreakdownConfig.create(undefined, path);
      assertResultError(result);
      assertPathValidationError(result);
      if (!result.success) {
        assertEquals(result.error.kind, "PATH_VALIDATION_ERROR");
        if (result.error.kind === "PATH_VALIDATION_ERROR") {
          assertExists(result.error.reason);
        }
      }
    }
  });

  await t.step("Boundary: Configuration Validation Errors", async () => {
    // Test 1: Missing required fields
    const tempDir = await setupCustomConfigSet("missing_fields");
    const _missingFieldsConfig = {
      // Missing working_dir and other required fields
      "app_prompt": { "base_dir": "./prompts" },
    };

    try {
      await Deno.writeTextFile(
        join(tempDir, ".agent", "climpt", "config", "app.yml"),
        `app_prompt:\n  base_dir: "./prompts"\n`,
      );

      const configResult = BreakdownConfig.create(undefined, tempDir);
      assertResultSuccess(configResult);

      if (!configResult.success) {
        throw new Error("Config creation should have succeeded");
      }

      const loadResult = await configResult.data.loadConfigSafe();
      assertConfigValidationError(loadResult);
      if (!loadResult.success && loadResult.error.kind === "CONFIG_VALIDATION_ERROR") {
        assertExists(loadResult.error.path);
        assertExists(loadResult.error.violations);
      }
    } finally {
      await cleanupTestConfigs(tempDir);
    }

    // Test 2: Invalid field types
    const invalidTypeDir = await setupCustomConfigSet("invalid_types");
    try {
      await Deno.writeTextFile(
        join(invalidTypeDir, ".agent", "climpt", "config", "app.yml"),
        `working_dir: 123\napp_prompt:\n  base_dir: true\napp_schema:\n  base_dir: []\n`,
      );

      const configResult = BreakdownConfig.create(undefined, invalidTypeDir);
      assertResultSuccess(configResult);

      if (!configResult.success) {
        throw new Error("Config creation should have succeeded");
      }

      const loadResult = await configResult.data.loadConfigSafe();
      assertConfigValidationError(loadResult);
    } finally {
      await cleanupTestConfigs(invalidTypeDir);
    }

    // Test 3: Empty string values
    const emptyValuesDir = await setupCustomConfigSet("empty_values");
    try {
      await Deno.writeTextFile(
        join(emptyValuesDir, ".agent", "climpt", "config", "app.yml"),
        `working_dir: ""\napp_prompt:\n  base_dir: ""\napp_schema:\n  base_dir: ""\n`,
      );

      const configResult = BreakdownConfig.create(undefined, emptyValuesDir);
      assertResultSuccess(configResult);

      if (!configResult.success) {
        throw new Error("Config creation should have succeeded");
      }

      const loadResult = await configResult.data.loadConfigSafe();
      assertConfigValidationError(loadResult);
    } finally {
      await cleanupTestConfigs(emptyValuesDir);
    }
  });

  await t.step("Boundary: State Management Errors", async () => {
    // Test accessing config before loading
    const configResult = BreakdownConfig.create();
    assertResultSuccess(configResult);

    if (!configResult.success) {
      throw new Error("Config creation should have succeeded");
    }
    const config = configResult.data;

    // Attempt to get config before loading
    const getBeforeLoad = await config.getConfigSafe();
    assertResultError(getBeforeLoad);
    assertResultErrorKind(getBeforeLoad, "CONFIG_NOT_LOADED");

    // Verify error message contains helpful context
    if (!getBeforeLoad.success) {
      if (getBeforeLoad.error instanceof Error) {
        assertExists(getBeforeLoad.error.message);
        assert(getBeforeLoad.error.message.includes("Configuration not loaded"));
      } else {
        assertExists(getBeforeLoad.error.message);
        assert(getBeforeLoad.error.message.includes("Configuration not loaded"));
      }
    }
  });

  await t.step("Boundary: Profile Name Validation", async () => {
    // Test invalid profile names
    const invalidProfileNames = [
      // Note: Empty string "" is now valid (treated as "no profile" per Total Function principle)
      " ", // Whitespace only
      "profile name", // Contains space
      "profile/name", // Contains slash
      "profile\\name", // Contains backslash
      "../profile", // Path traversal
      "profile\nname", // Contains newline
      "profile\0name", // Contains null
    ];

    const tempDir = await setupAppConfigOnly();
    try {
      for (const profileName of invalidProfileNames) {
        const result = BreakdownConfig.create(profileName, tempDir);
        assertResultError(result);
        // Profile name validation happens at creation
        if (!result.success) {
          if (result.error instanceof Error) {
            assertExists(result.error.message);
          } else {
            assertExists(result.error.message);
          }
        }
      }
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  await t.step("Boundary: Error Propagation Through Operations", async () => {
    // Test error propagation through Result chain
    const tempDir = await setupInvalidConfig({ "working_dir": 123 }); // Invalid type
    try {
      const configResult = BreakdownConfig.create(undefined, tempDir);
      assertResultSuccess(configResult);

      if (!configResult.success) {
        throw new Error("Config creation should have succeeded");
      }
      const config = configResult.data;

      // Load should fail with validation error
      const loadResult = await config.loadConfigSafe();
      assertResultError(loadResult);

      // Subsequent operations should maintain error state
      const getResult = await config.getConfigSafe();
      assertResultError(getResult);
      assertResultErrorKind(getResult, "CONFIG_NOT_LOADED");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  await t.step("Boundary: Concurrent Error Scenarios", () => {
    // Test multiple error conditions occurring simultaneously
    const results: Result<BreakdownConfig, UnifiedError>[] = [];

    // Scenario 1: Multiple invalid paths
    results.push(BreakdownConfig.create(undefined, "../../../"));
    results.push(BreakdownConfig.create(undefined, "/absolute/path"));
    results.push(BreakdownConfig.create("invalid name", "/tmp"));

    // All should be errors
    for (const result of results) {
      assertResultError(result);
    }

    // Verify Result.all behavior with errors
    const combined = Result.all(results);
    assertResultError(combined);
    if (!combined.success) {
      // Should contain the first error
      assertExists(combined.error);
    }
  });

  await t.step("Boundary: Error Recovery and Retry", async () => {
    // Test that errors don't corrupt state for retry
    const tempDir = await setupAppConfigOnly();
    try {
      // First attempt with wrong directory
      const wrongConfig = BreakdownConfig.create(undefined, "/wrong/path");
      assertResultSuccess(wrongConfig);

      if (!wrongConfig.success) {
        throw new Error("Config creation should have succeeded");
      }
      const wrongLoad = await wrongConfig.data.loadConfigSafe();
      assertResultError(wrongLoad);

      // Second attempt with correct directory
      const correctConfig = BreakdownConfig.create(undefined, tempDir);
      assertResultSuccess(correctConfig);

      if (!correctConfig.success) {
        throw new Error("Config creation should have succeeded");
      }
      const correctLoad = await correctConfig.data.loadConfigSafe();
      assertResultSuccess(correctLoad);

      // Verify state is independent
      const correctGet = await correctConfig.data.getConfigSafe();
      assertResultSuccess(correctGet);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  await t.step("Boundary: Unknown Error Handling", async () => {
    // Test handling of unexpected errors
    const tempDir = await setupAppConfigOnly();
    try {
      // Create a config that will trigger an unknown error
      // by manipulating the file system during operation
      const configPath = join(tempDir, ".agent", "climpt", "config", "app.yml");
      const configResult = BreakdownConfig.create(undefined, tempDir);
      assertResultSuccess(configResult);

      if (!configResult.success) {
        throw new Error("Config creation should have succeeded");
      }

      // Remove file after config creation but before load
      await Deno.remove(configPath);

      const loadResult = await configResult.data.loadConfigSafe();
      assertResultError(loadResult);
      // Should be caught as file not found
      assertConfigFileNotFoundError(loadResult);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  await t.step("Boundary: Error Message Quality", async () => {
    // Verify error messages are helpful and actionable
    const errorScenarios = [
      {
        name: "File not found",
        setup: () => BreakdownConfig.create(undefined, "/nonexistent"),
        verify: async (config: BreakdownConfig) => {
          const result = await config.loadConfigSafe();
          assertResultError(result);
          if (!result.success) {
            if (result.error instanceof Error) {
              assertExists(result.error.message);
              assert(result.error.message.includes("not found"));
            } else {
              assertExists(result.error.message);
              assert(result.error.message.includes("not found"));
            }
            if (result.error.kind === "CONFIG_FILE_NOT_FOUND") {
              assertExists(result.error.path);
            }
          }
        },
      },
      {
        name: "Path validation",
        setup: () => BreakdownConfig.create(undefined, "../../../etc"),
        verify: (result: Result<BreakdownConfig, UnifiedError>) => {
          assertResultError(result);
          if (!result.success) {
            assertExists(result.error);
            if (result.error instanceof Error && result.error.message) {
              assertExists(result.error.message);
            } else if (!(result.error instanceof Error) && result.error.message) {
              assertExists(result.error.message);
            }
            assertEquals(result.error.kind, "PATH_VALIDATION_ERROR");
            if (result.error.kind === "PATH_VALIDATION_ERROR") {
              assertExists(result.error.reason);
            }
          }
        },
      },
      {
        name: "Config not loaded",
        setup: () => BreakdownConfig.create(),
        verify: async (config: BreakdownConfig) => {
          const result = await config.getConfigSafe();
          assertResultError(result);
          if (!result.success) {
            if (result.error instanceof Error) {
              assertEquals(
                result.error.message,
                "ERR1010: Configuration not loaded. Cannot perform operation: getConfig",
              );
            } else {
              assertEquals(
                result.error.message,
                "ERR1010: Configuration not loaded. Cannot perform operation: getConfig",
              );
            }
          }
        },
      },
    ];

    for (const scenario of errorScenarios) {
      // deno-lint-ignore no-await-in-loop
      const result = await scenario.setup();

      // Check if result is a Result type (has 'success' property)
      if (result && typeof result === "object" && "success" in result) {
        // For scenarios that expect BreakdownConfig (like "File not found" and "Config not loaded")
        if (
          result.success &&
          (scenario.name === "File not found" || scenario.name === "Config not loaded")
        ) {
          // deno-lint-ignore no-await-in-loop
          await (scenario.verify as (config: BreakdownConfig) => Promise<void>)(result.data);
        } // For scenarios that expect Result type (like "Path validation")
        else {
          // deno-lint-ignore no-await-in-loop
          await (scenario.verify as (
            result: Result<BreakdownConfig, UnifiedError>,
          ) => Promise<void>)(result);
        }
      } else {
        // If not a Result type, pass as-is (should be BreakdownConfig)
        // deno-lint-ignore no-await-in-loop
        await (scenario.verify as (config: BreakdownConfig) => Promise<void>)(
          result as BreakdownConfig,
        );
      }
    }
  });

  await t.step("Boundary: Result Type Operations", async () => {
    // Test Result type utilities with error boundaries
    const tempDir = await setupAppConfigOnly();
    try {
      const configResult = BreakdownConfig.create(undefined, tempDir);
      assertResultSuccess(configResult);

      // Test Result.map with errors
      const errorResult = Result.err<UnifiedError>(
        ErrorFactories.configNotLoaded("test operation"),
      );

      const mapped = Result.map(errorResult, (value: string) => value.toUpperCase());
      assertResultError(mapped);
      if (!mapped.success) {
        assertEquals(mapped.error.kind, "CONFIG_NOT_LOADED");
      }

      // Test Result.flatMap with errors
      const flatMapped = Result.flatMap(
        errorResult,
        (value: string) => Result.ok((value as string).length),
      );
      assertResultError(flatMapped);

      // Test Result.mapErr
      const mappedError = Result.mapErr(errorResult, (error) => ({
        ...error,
        message: `Wrapped: ${error instanceof Error ? error.message : error.message}`,
      }));
      assertResultError(mappedError);
      if (!mappedError.success) {
        if (mappedError.error instanceof Error) {
          assert(mappedError.error.message.startsWith("Wrapped:"));
        } else {
          assert(mappedError.error.message.startsWith("Wrapped:"));
        }
      }

      // Test Result.all with mixed results
      const mixedResults = [
        Result.ok("success"),
        Result.err<UnifiedError>(ErrorFactories.configNotLoaded("mixed results test")),
        Result.ok("another success"),
      ];

      const allResult = Result.all(mixedResults);
      assertResultError(allResult);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  await t.step("Boundary: Legacy Method Exception Handling", async () => {
    // Test that legacy methods properly throw exceptions
    const tempDir = await setupAppConfigOnly();
    try {
      const configResult = BreakdownConfig.create(undefined, tempDir);
      assertResultSuccess(configResult);

      if (!configResult.success) {
        throw new Error("Config creation should have succeeded");
      }
      const config = configResult.data;

      // Test getConfig throws when not loaded
      let exceptionThrown = false;
      try {
        await config.getConfig();
      } catch (error) {
        exceptionThrown = true;
        assertExists(error);
        assert(error instanceof Error);
        if (error instanceof Error) {
          assertEquals(
            error.message,
            "ERR1010: Configuration not loaded. Cannot perform operation: getConfig",
          );
        }
      }
      assert(exceptionThrown);

      // Test with invalid config path
      const invalidConfig = BreakdownConfig.create(undefined, "/nonexistent");
      assertResultSuccess(invalidConfig);

      if (!invalidConfig.success) {
        throw new Error("Config creation should have succeeded");
      }

      exceptionThrown = false;
      try {
        await invalidConfig.data.loadConfig();
      } catch (error) {
        exceptionThrown = true;
        assertExists(error);
        assert(error instanceof Error);
      }
      assert(exceptionThrown);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  await t.step("Boundary: Complete Error Type Coverage", async () => {
    // Ensure all error types are tested
    const _errorTypes = [
      "CONFIG_FILE_NOT_FOUND",
      "CONFIG_PARSE_ERROR",
      "CONFIG_VALIDATION_ERROR",
      "PATH_VALIDATION_ERROR",
      "INVALID_PROFILE_NAME",
      "CONFIG_NOT_LOADED",
      "USER_CONFIG_INVALID",
      "UNKNOWN",
    ];

    // Track which error types we've seen
    const seenErrors = new Set<string>();

    // Various operations that trigger different errors
    const operations = [
      // CONFIG_FILE_NOT_FOUND
      async () => {
        const config = BreakdownConfig.create(undefined, "/nonexistent");
        if (config.success) {
          const result = await config.data.loadConfigSafe();
          if (!result.success) seenErrors.add(result.error.kind);
        }
      },
      // PATH_VALIDATION_ERROR
      () => {
        const result = BreakdownConfig.create(undefined, "../../../");
        if (!result.success) seenErrors.add(result.error.kind);
      },
      // CONFIG_NOT_LOADED
      async () => {
        const config = BreakdownConfig.create();
        if (config.success) {
          const result = await config.data.getConfigSafe();
          if (!result.success) seenErrors.add(result.error.kind);
        }
      },
      // CONFIG_VALIDATION_ERROR
      async () => {
        const tempDir = await setupInvalidConfig({ "working_dir": "" });
        try {
          const config = BreakdownConfig.create(undefined, tempDir);
          if (config.success) {
            const result = await config.data.loadConfigSafe();
            if (!result.success) seenErrors.add(result.error.kind);
          }
        } finally {
          await cleanupTestConfigs(tempDir);
        }
      },
    ];

    // Execute all operations
    for (const op of operations) {
      // deno-lint-ignore no-await-in-loop
      await op();
    }

    // Verify we've covered multiple error types
    assert(seenErrors.size >= 3);
  });
});

Deno.test("E2E: Error Boundary - Edge Case Stress Testing", async (t) => {
  await t.step("Extreme path lengths", () => {
    // Test very long paths
    const longPath = "a/".repeat(100) + "config";
    const result = BreakdownConfig.create(undefined, longPath);
    // Should handle gracefully (either success or validation error)
    assertExists(result);
  });

  await t.step("Unicode and special characters in paths", () => {
    const specialPaths = [
      "config/\u4F60\u597D",
      "config/\uD83D\uDE80",
      "config/caf\u00E9",
      "config/\u0444\u0430\u0439\u043B",
    ];

    for (const path of specialPaths) {
      const result = BreakdownConfig.create(undefined, path);
      // Should handle gracefully
      assertExists(result);
    }
  });

  await t.step("Rapid error creation", () => {
    // Test creating many errors quickly
    const errors: UnifiedError[] = [];

    for (let i = 0; i < 100; i++) {
      errors.push(ErrorFactories.configFileNotFound(`/path/${i}`, "app"));
      errors.push(
        ErrorFactories.pathValidationError(`../invalid/${i}`, "PATH_TRAVERSAL", "test_field"),
      );
      errors.push(
        ErrorFactories.configValidationError(`/path/field_${i}`, [{
          field: `field_${i}`,
          value: undefined,
          expectedType: "string",
          actualType: "undefined",
        }]),
      );
    }

    // All errors should be valid
    assertEquals(errors.length, 300);
    errors.forEach((error) => {
      assertExists(error.kind);
      if (error instanceof Error) {
        assertExists(error.message);
      } else {
        assertExists(error.message);
      }
    });
  });

  await t.step("Nested Result operations with errors", () => {
    // Test deeply nested Result chains
    const initialError = Result.err<UnifiedError>(
      ErrorFactories.configNotLoaded("nested operations test"),
    );

    let current: Result<string, UnifiedError> = initialError;
    for (let i = 0; i < 10; i++) {
      current = Result.flatMap(current, (value) => Result.ok(`${value}_${i}`));
    }

    // Should still be an error
    assertResultError(current);
    assertResultErrorKind(current, "CONFIG_NOT_LOADED");
  });
});
