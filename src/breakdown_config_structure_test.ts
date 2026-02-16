/**
 * Structure Tests for BreakdownConfig
 * Level 1: Verifies API contracts, method signatures, and type constraints
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { BreakdownConfig } from "./breakdown_config.ts";
import type { Result as _Result } from "./types/unified_result.ts";
import type { UnifiedError as _UnifiedError } from "./errors/unified_errors.ts";

// Logger removed for dependency simplification

Deno.test("Structure: BreakdownConfig API Contract Validation", async (t) => {
  await t.step("Static factory methods should have correct signatures", () => {
    // Verifying static method signatures

    // create method signature
    const createMethod = BreakdownConfig.create;
    assertExists(createMethod, "create method should exist");

    // Test parameter types
    const resultWithNoParams = BreakdownConfig.create();
    assertExists(resultWithNoParams, "create should accept no parameters");

    const resultWithProfile = BreakdownConfig.create("test");
    assertExists(resultWithProfile, "create should accept profile parameter");

    const resultWithBothParams = BreakdownConfig.create("test", "/path");
    assertExists(resultWithBothParams, "create should accept both parameters");

    // createLegacy method signature
    const createLegacyMethod = BreakdownConfig.createLegacy;
    assertExists(createLegacyMethod, "createLegacy method should exist");

    // logger.debug("Static method signatures verified");
  });

  await t.step("Instance methods should have correct return types", async () => {
    // logger.debug("Verifying instance method return types");

    const configResult = BreakdownConfig.create("test");
    if (!configResult.success) {
      throw new Error("Failed to create config for testing");
    }

    const config = configResult.data;

    // Safe methods should return Result types
    const loadResult = await config.loadConfigSafe();
    assert("success" in loadResult, "loadConfigSafe should return Result");

    const getResult = await config.getConfigSafe();
    assert("success" in getResult, "getConfigSafe should return Result");

    const workingDirResult = await config.getWorkingDirSafe();
    assert("success" in workingDirResult, "getWorkingDirSafe should return Result");

    const promptDirResult = await config.getPromptDirSafe();
    assert("success" in promptDirResult, "getPromptDirSafe should return Result");

    const schemaDirResult = await config.getSchemaDirSafe();
    assert("success" in schemaDirResult, "getSchemaDirSafe should return Result");

    // logger.debug("Instance method return types verified");
  });

  await t.step("Legacy methods should maintain backward compatibility", () => {
    // logger.debug("Verifying legacy method compatibility");

    const legacyConfig = BreakdownConfig.createLegacy("test");
    assertExists(legacyConfig, "createLegacy should return instance");

    // Legacy methods should exist
    assertExists(legacyConfig.loadConfig, "loadConfig legacy method should exist");
    assertExists(legacyConfig.getConfig, "getConfig legacy method should exist");
    assertExists(legacyConfig.getWorkingDir, "getWorkingDir legacy method should exist");
    assertExists(legacyConfig.getPromptDir, "getPromptDir legacy method should exist");
    assertExists(legacyConfig.getSchemaDir, "getSchemaDir legacy method should exist");

    // logger.debug("Legacy method compatibility verified");
  });
});

Deno.test("Structure: BreakdownConfig Type Constraint Validation", async (t) => {
  // logger.debug("Testing type constraints");

  await t.step("Result types should be properly constrained", () => {
    // logger.debug("Verifying Result type constraints");

    const result = BreakdownConfig.create("test");

    // Result should have success property
    assert("success" in result, "Result should have success property");

    if (result.success) {
      // Success result should have data property
      assertExists(result.data, "Success result should have data");
      assert(
        result.data instanceof BreakdownConfig,
        "Data should be BreakdownConfig instance",
      );
    } else {
      // Error result should have error property
      assertExists(result.error, "Error result should have error");
      assert("kind" in result.error, "Error should have kind property");
      assert("message" in result.error, "Error should have message property");
    }

    // logger.debug("Result type constraints verified");
  });

  await t.step("Profile name validation should be consistent", () => {
    // logger.debug("Testing profile name constraint consistency");

    // Valid profile names
    const validProfiles = ["test", "production", "development", "staging"];
    for (const profile of validProfiles) {
      const result = BreakdownConfig.create(profile);
      assert(result.success, `Profile "${profile}" should be valid`);
    }

    // Invalid profile names
    const invalidProfiles = ["test@invalid", "profile!", "test spaces"];
    for (const profile of invalidProfiles) {
      const result = BreakdownConfig.create(profile);
      assert(!result.success, `Profile "${profile}" should be invalid`);
    }

    // Empty string is valid (defaults to no profile)
    const emptyResult = BreakdownConfig.create("");
    assert(emptyResult.success, "Empty profile should be valid (defaults)");

    // logger.debug("Profile name constraints verified");
  });

  await t.step("Base directory validation should be consistent", () => {
    // logger.debug("Testing base directory constraint consistency");

    // Empty string should be handled gracefully
    const emptyDirResult = BreakdownConfig.create("test", "");
    assert(
      emptyDirResult.success,
      "Empty base directory should default to current dir",
    );

    // Valid paths should work
    const validDirResult = BreakdownConfig.create("test", "/valid/path");
    assert(validDirResult.success, "Valid directory should be accepted");

    // logger.debug("Base directory constraints verified");
  });
});

Deno.test("Structure: BreakdownConfig Interface Consistency", async (t) => {
  // logger.debug("Testing interface consistency");

  await t.step("Safe and Legacy methods should be consistent", async () => {
    // logger.debug("Verifying Safe/Legacy method consistency");

    const safeConfig = BreakdownConfig.create("test");
    if (!safeConfig.success) {
      throw new Error("Failed to create safe config");
    }

    const legacyConfig = BreakdownConfig.createLegacy("test");

    // Try to load configs - if it fails, just verify the methods exist
    const safeLoadResult = await safeConfig.data.loadConfigSafe();

    if (safeLoadResult.success) {
      // If safe load succeeded, legacy should work too
      await legacyConfig.loadConfig();

      // Both should provide the same core functionality
      const safeWorkingDir = await safeConfig.data.getWorkingDirSafe();
      const legacyWorkingDir = await legacyConfig.getWorkingDir();

      if (safeWorkingDir.success) {
        assertEquals(
          safeWorkingDir.data,
          legacyWorkingDir,
          "Safe and legacy methods should return same data",
        );
      }
    } else {
      // If config loading fails, just verify method signatures exist
      assertEquals(
        typeof safeConfig.data.getWorkingDirSafe,
        "function",
        "Safe method should exist",
      );
      assertEquals(typeof legacyConfig.getWorkingDir, "function", "Legacy method should exist");
    }

    // logger.debug("Safe/Legacy method consistency verified");
  });

  await t.step("Configuration access patterns should be uniform", async () => {
    // logger.debug("Testing configuration access uniformity");

    const configResult = BreakdownConfig.create("test");
    if (!configResult.success) {
      throw new Error("Failed to create config for testing");
    }

    const config = configResult.data;

    // All config access methods should follow same pattern
    const loadResult = await config.loadConfigSafe();
    const getResult = await config.getConfigSafe();

    // Both should return Results with same structure
    assert("success" in loadResult, "loadConfigSafe should return Result");
    assert("success" in getResult, "getConfigSafe should return Result");

    if (loadResult.success && getResult.success) {
      assertEquals(
        typeof loadResult.data,
        typeof getResult.data,
        "Config data types should be consistent",
      );
    }

    // logger.debug("Configuration access uniformity verified");
  });
});

Deno.test("Structure: BreakdownConfig Error Handling Structure", async (t) => {
  // logger.debug("Testing error handling structure");

  await t.step("Error types should be structured consistently", () => {
    // logger.debug("Verifying error structure consistency");

    // Create error condition
    const errorResult = BreakdownConfig.create("invalid@profile");
    assert(!errorResult.success, "Invalid profile should produce error");

    if (!errorResult.success) {
      const error: unknown = errorResult.error;

      // Error should follow UnifiedError structure - treat as unknown per Total Function
      assertExists(error, "Error should exist");

      // Type guard for error with kind property
      if (error && typeof error === "object" && "kind" in error) {
        assertExists(error.kind, "Error should have kind property");
        assertEquals(typeof error.kind, "string", "Error kind should be string");
      }

      // Safe message access following Total Function principles
      if (error && typeof error === "object" && "message" in error) {
        assertExists(error.message, "Error should have message property when present");
        assertEquals(typeof error.message, "string", "Error message should be string");
      }

      // Additional properties should be optional
      if (error && typeof error === "object" && "details" in error) {
        assertEquals(typeof error.details, "object", "Error details should be object if present");
      }
    }

    // logger.debug("Error structure consistency verified");
  });

  await t.step("Error propagation should be predictable", async () => {
    // logger.debug("Testing error propagation predictability");

    const configResult = BreakdownConfig.create("test", "/nonexistent/path");
    if (!configResult.success) {
      throw new Error("Config creation should succeed even with nonexistent path");
    }

    const config = configResult.data;

    // Methods should handle errors consistently
    const loadResult = await config.loadConfigSafe();
    const getResult = await config.getConfigSafe();

    // If one fails, error structure should be consistent
    if (!loadResult.success && !getResult.success) {
      assertEquals(
        typeof loadResult.error.kind,
        typeof getResult.error.kind,
        "Error kinds should have same type",
      );

      // Safe message comparison following Total Function principles
      const loadHasMessage = "message" in loadResult.error;
      const getHasMessage = "message" in getResult.error;

      if (loadHasMessage && getHasMessage) {
        // Type guard ensures both have message property
        const loadError = loadResult.error as { kind: string; message: string };
        const getError = getResult.error as { kind: string; message: string };
        assertEquals(
          typeof loadError.message,
          typeof getError.message,
          "Error messages should have same type",
        );
      }
    }

    // logger.debug("Error propagation predictability verified");
  });
});

// logger.debug("BreakdownConfig Structure Tests completed");
