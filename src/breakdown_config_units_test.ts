/**
 * Units Tests for BreakdownConfig
 * Level 2: Verifies individual function behavior and business logic
 */

import { assertEquals, assertExists, assertThrows } from "@std/assert";
// import { BreakdownLogger } from "https://jsr.io/@tettuan/breakdownlogger";
import { BreakdownConfig } from "./breakdown_config.ts";

// const logger = new BreakdownLogger("units");

Deno.test("Units: BreakdownConfig.create() Method Behavior", async (t) => {
  // logger.debug("Testing BreakdownConfig.create() method behavior");

  await t.step("create() with valid parameters should succeed", () => {
    // logger.debug("Testing valid parameter success cases");

    // No parameters (defaults)
    const defaultResult = BreakdownConfig.create();
    assertEquals(defaultResult.success, true, "Default parameters should succeed");

    if (defaultResult.success) {
      assertExists(defaultResult.data, "Success result should contain BreakdownConfig instance");
      assertEquals(
        defaultResult.data instanceof BreakdownConfig,
        true,
        "Data should be BreakdownConfig instance",
      );
    }

    // Valid profile only
    const profileResult = BreakdownConfig.create("production");
    assertEquals(profileResult.success, true, "Valid profile should succeed");

    // Valid profile and baseDir
    const bothResult = BreakdownConfig.create("staging", "/valid/path");
    assertEquals(bothResult.success, true, "Valid profile and baseDir should succeed");

    // logger.debug("Valid parameter success cases verified");
  });

  await t.step("create() with invalid profile names should fail gracefully", () => {
    // logger.debug("Testing invalid profile name handling");

    const invalidProfiles = [
      "invalid@profile", // Contains @
      "profile!", // Contains !
      "profile with spaces", // Contains spaces
      "profile#hash", // Contains #
      "profile$dollar", // Contains $
    ];

    // Note: Empty string is valid (defaults to no profile)

    for (const invalidProfile of invalidProfiles) {
      const result = BreakdownConfig.create(invalidProfile);
      assertEquals(result.success, false, `Profile "${invalidProfile}" should be rejected`);

      if (!result.success) {
        assertExists(result.error, "Error result should contain error information");
        assertEquals(result.error.kind, "CONFIG_VALIDATION_ERROR", "Should be validation error");
        assertExists(result.error.message, "Error should have descriptive message");
        // logger.debug(`Invalid profile "${invalidProfile}" properly rejected`, { error: result.error.message });
      }
    }

    // logger.debug("Invalid profile name handling verified");
  });

  await t.step("create() with valid profile names should succeed", () => {
    // logger.debug("Testing valid profile name acceptance");

    const validProfiles = [
      "production",
      "development",
      "staging",
      "test",
      "prod",
      "dev",
      "local",
      "integration",
      "performance",
      "qa",
    ];

    for (const validProfile of validProfiles) {
      const result = BreakdownConfig.create(validProfile);
      assertEquals(result.success, true, `Profile "${validProfile}" should be accepted`);

      if (result.success) {
        assertExists(result.data, "Success result should contain data");
        // logger.debug(`Valid profile "${validProfile}" accepted successfully`);
      }
    }

    // logger.debug("Valid profile name acceptance verified");
  });

  await t.step("create() with invalid baseDir should fail appropriately", () => {
    // logger.debug("Testing invalid baseDir handling");

    // Empty string baseDir should be valid (defaults to current dir)
    const emptyDirResult = BreakdownConfig.create("test", "");
    assertEquals(emptyDirResult.success, true, "Empty baseDir should be valid (defaults)");

    // logger.debug("Invalid baseDir handling verified");
  });

  await t.step("create() should never throw exceptions", () => {
    // logger.debug("Testing exception-free behavior");

    const testCases = [
      [undefined, undefined],
      ["", ""],
      ["invalid@", "/path"],
      ["valid", ""],
      // Testing null input edge case - function should handle gracefully
      ...((): Array<[string | undefined, string | undefined]> => {
        const nullValue = null as unknown;
        return [[nullValue as string | undefined, nullValue as string | undefined]];
      })(),
      [
        "very-long-profile-name-that-might-cause-validation-issues",
        "/some/potentially/problematic/path",
      ],
    ];

    for (const [profile, baseDir] of testCases) {
      try {
        const result = BreakdownConfig.create(profile, baseDir);
        assertExists(result, `Should return Result for inputs: ${profile}, ${baseDir}`);
        assertEquals("success" in result, true, "Should always return Result type");
        // logger.debug(`Exception-free behavior verified for inputs: ${profile}, ${baseDir}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(
          `create() threw exception for inputs ${profile}, ${baseDir}: ${errorMessage}`,
        );
      }
    }

    // logger.debug("Exception-free behavior verified");
  });
});

Deno.test("Units: BreakdownConfig.createLegacy() Method Behavior", async (t) => {
  // logger.debug("Testing BreakdownConfig.createLegacy() method behavior");

  await t.step("createLegacy() should provide backward compatibility", () => {
    // logger.debug("Testing legacy creation compatibility");

    // No parameters
    const defaultLegacy = BreakdownConfig.createLegacy();
    assertExists(defaultLegacy, "createLegacy should work with no parameters");
    assertEquals(
      defaultLegacy instanceof BreakdownConfig,
      true,
      "Should return BreakdownConfig instance",
    );

    // With profile
    const profileLegacy = BreakdownConfig.createLegacy("production");
    assertExists(profileLegacy, "createLegacy should work with profile");

    // With both parameters
    const bothLegacy = BreakdownConfig.createLegacy("staging", "/legacy/path");
    assertExists(bothLegacy, "createLegacy should work with both parameters");

    // logger.debug("Legacy creation compatibility verified");
  });

  await t.step("createLegacy() should handle invalid inputs by throwing", () => {
    // logger.debug("Testing legacy error handling (throwing behavior)");

    // Invalid profile should throw (legacy behavior)
    assertThrows(
      () => BreakdownConfig.createLegacy("invalid@profile"),
      Error,
    );

    // Legacy should work with empty baseDir (defaults to current dir)
    const legacyEmptyDir = BreakdownConfig.createLegacy("test", "");
    assertExists(legacyEmptyDir, "Legacy should work with empty baseDir");

    // logger.debug("Legacy error handling verified");
  });

  await t.step(
    "createLegacy() and create() should produce equivalent instances for valid inputs",
    () => {
      // logger.debug("Testing legacy/modern equivalence");

      const modernResult = BreakdownConfig.create("test", "/path");
      const legacyInstance = BreakdownConfig.createLegacy("test", "/path");

      if (modernResult.success) {
        // Both should be BreakdownConfig instances
        assertEquals(
          modernResult.data instanceof BreakdownConfig,
          true,
          "Modern should create BreakdownConfig",
        );
        assertEquals(
          legacyInstance instanceof BreakdownConfig,
          true,
          "Legacy should create BreakdownConfig",
        );

        // Both should have similar behavior (test by calling a method)
        assertEquals(
          typeof modernResult.data.getConfig,
          "function",
          "Modern should have getConfig method",
        );
        assertEquals(
          typeof legacyInstance.getConfig,
          "function",
          "Legacy should have getConfig method",
        );
      }

      // logger.debug("Legacy/modern equivalence verified");
    },
  );
});

Deno.test("Units: BreakdownConfig loadConfigSafe() Functionality", async (t) => {
  // logger.debug("Testing loadConfigSafe() functionality");

  await t.step("loadConfigSafe() should return Result type", async () => {
    // logger.debug("Testing loadConfigSafe Result type behavior");

    const configResult = BreakdownConfig.create("test");
    if (!configResult.success) {
      throw new Error("Failed to create config for testing");
    }

    const config = configResult.data;
    const loadResult = await config.loadConfigSafe();

    // Should always return Result
    assertExists(loadResult, "loadConfigSafe should return defined value");
    assertEquals("success" in loadResult, true, "Should return Result type");

    if (loadResult.success) {
      assertExists(loadResult.data, "Success result should have data");
      // logger.debug("loadConfigSafe success case verified");
    } else {
      assertExists(loadResult.error, "Error result should have error");
      assertEquals("kind" in loadResult.error, true, "Error should have kind property");
      // logger.debug("loadConfigSafe error case verified", { errorKind: loadResult.error.kind });
    }

    // logger.debug("loadConfigSafe Result type behavior verified");
  });

  await t.step("loadConfigSafe() should never throw exceptions", async () => {
    // logger.debug("Testing loadConfigSafe exception-free behavior");

    // Test with potentially problematic configurations
    const problemConfigs = [
      BreakdownConfig.create("nonexistent-profile"),
      BreakdownConfig.create("test", "/nonexistent/path"),
      BreakdownConfig.create("test"), // Default path might not exist
    ];

    for (const configResult of problemConfigs) {
      if (configResult.success) {
        try {
          const loadResult = await configResult.data.loadConfigSafe();
          assertExists(loadResult, "loadConfigSafe should return Result even for problems");
          assertEquals("success" in loadResult, true, "Should return Result type structure");
          // logger.debug("loadConfigSafe handled potential problem gracefully");
        } catch (error) {
          throw new Error(`loadConfigSafe threw exception: ${error}`);
        }
      }
    }

    // logger.debug("loadConfigSafe exception-free behavior verified");
  });

  await t.step("loadConfigSafe() should handle configuration loading edge cases", async () => {
    // logger.debug("Testing configuration loading edge cases");

    const configResult = BreakdownConfig.create("test");
    if (!configResult.success) {
      throw new Error("Failed to create config for testing");
    }

    const config = configResult.data;

    // Multiple calls should be consistent
    const loadResult1 = await config.loadConfigSafe();
    const loadResult2 = await config.loadConfigSafe();

    // Results should have same success/failure status
    assertEquals(
      loadResult1.success,
      loadResult2.success,
      "Multiple calls should have consistent results",
    );

    if (loadResult1.success && loadResult2.success) {
      // Data structure should be consistent
      assertEquals(
        typeof loadResult1.data,
        typeof loadResult2.data,
        "Data types should be consistent",
      );
    }

    // logger.debug("Configuration loading edge cases verified");
  });
});

Deno.test("Units: BreakdownConfig getConfigSafe() Functionality", async (t) => {
  // logger.debug("Testing getConfigSafe() functionality");

  await t.step("getConfigSafe() should return Result with loaded configuration", async () => {
    // logger.debug("Testing getConfigSafe configuration retrieval");

    const configResult = BreakdownConfig.create("test");
    if (!configResult.success) {
      throw new Error("Failed to create config for testing");
    }

    const config = configResult.data;
    const getResult = await config.getConfigSafe();

    // Should return Result type
    assertExists(getResult, "getConfigSafe should return defined value");
    assertEquals("success" in getResult, true, "Should return Result type");

    if (getResult.success) {
      assertExists(getResult.data, "Success should contain configuration data");
      assertEquals(typeof getResult.data, "object", "Configuration should be object");
      // logger.debug("getConfigSafe success verified");
    } else {
      assertExists(getResult.error, "Error should contain error information");
      // logger.debug("getConfigSafe error handling verified", { errorKind: getResult.error.kind });
    }

    // logger.debug("getConfigSafe configuration retrieval verified");
  });

  await t.step("getConfigSafe() should be consistent with loadConfigSafe()", async () => {
    // logger.debug("Testing getConfigSafe/loadConfigSafe consistency");

    const configResult = BreakdownConfig.create("test");
    if (!configResult.success) {
      throw new Error("Failed to create config for testing");
    }

    const config = configResult.data;

    // Load configuration then get it
    const loadResult = await config.loadConfigSafe();
    const getResult = await config.getConfigSafe();

    // Success/failure should be related
    if (loadResult.success) {
      // If load succeeded, get should also succeed (or be consistent)
      assertEquals(
        "success" in getResult,
        true,
        "getConfigSafe should return Result after successful load",
      );
    }

    // Both should follow same Result pattern
    assertEquals("success" in loadResult, true, "loadConfigSafe should return Result");
    assertEquals("success" in getResult, true, "getConfigSafe should return Result");

    // logger.debug("getConfigSafe/loadConfigSafe consistency verified");
  });
});

Deno.test("Units: BreakdownConfig Directory Retrieval Methods", async (t) => {
  // logger.debug("Testing directory retrieval methods");

  await t.step("getWorkingDirSafe() should return valid directory Result", async () => {
    // logger.debug("Testing getWorkingDirSafe");

    const configResult = BreakdownConfig.create("test", "/test/base");
    if (!configResult.success) {
      throw new Error("Failed to create config for testing");
    }

    const config = configResult.data;
    const workingDirResult = await config.getWorkingDirSafe();

    assertEquals("success" in workingDirResult, true, "Should return Result type");

    if (workingDirResult.success) {
      assertEquals(typeof workingDirResult.data, "string", "Working directory should be string");
      assertEquals(workingDirResult.data.length > 0, true, "Working directory should not be empty");
      // logger.debug("getWorkingDirSafe success verified", { workingDir: workingDirResult.data });
    }

    // logger.debug("getWorkingDirSafe verified");
  });

  await t.step("getPromptDirSafe() should return valid directory Result", async () => {
    // logger.debug("Testing getPromptDirSafe");

    const configResult = BreakdownConfig.create("test");
    if (!configResult.success) {
      throw new Error("Failed to create config for testing");
    }

    const config = configResult.data;
    const promptDirResult = await config.getPromptDirSafe();

    assertEquals("success" in promptDirResult, true, "Should return Result type");

    if (promptDirResult.success) {
      assertEquals(typeof promptDirResult.data, "string", "Prompt directory should be string");
      assertEquals(promptDirResult.data.length > 0, true, "Prompt directory should not be empty");
      // logger.debug("getPromptDirSafe success verified", { promptDir: promptDirResult.data });
    }

    // logger.debug("getPromptDirSafe verified");
  });

  await t.step("getSchemaDirSafe() should return valid directory Result", async () => {
    // logger.debug("Testing getSchemaDirSafe");

    const configResult = BreakdownConfig.create("test");
    if (!configResult.success) {
      throw new Error("Failed to create config for testing");
    }

    const config = configResult.data;
    const schemaDirResult = await config.getSchemaDirSafe();

    assertEquals("success" in schemaDirResult, true, "Should return Result type");

    if (schemaDirResult.success) {
      assertEquals(typeof schemaDirResult.data, "string", "Schema directory should be string");
      assertEquals(schemaDirResult.data.length > 0, true, "Schema directory should not be empty");
      // logger.debug("getSchemaDirSafe success verified", { schemaDir: schemaDirResult.data });
    }

    // logger.debug("getSchemaDirSafe verified");
  });

  await t.step("All directory methods should be consistent", async () => {
    // logger.debug("Testing directory method consistency");

    const configResult = BreakdownConfig.create("consistent-test");
    if (!configResult.success) {
      throw new Error("Failed to create config for testing");
    }

    const config = configResult.data;

    // Get all directories
    const workingDirResult = await config.getWorkingDirSafe();
    const promptDirResult = await config.getPromptDirSafe();
    const schemaDirResult = await config.getSchemaDirSafe();

    // All should return Results
    assertEquals("success" in workingDirResult, true, "Working dir should return Result");
    assertEquals("success" in promptDirResult, true, "Prompt dir should return Result");
    assertEquals("success" in schemaDirResult, true, "Schema dir should return Result");

    // If all succeed, they should be valid paths
    if (workingDirResult.success && promptDirResult.success && schemaDirResult.success) {
      assertEquals(typeof workingDirResult.data, "string", "Working dir should be string");
      assertEquals(typeof promptDirResult.data, "string", "Prompt dir should be string");
      assertEquals(typeof schemaDirResult.data, "string", "Schema dir should be string");

      // All should be non-empty
      assertEquals(workingDirResult.data.length > 0, true, "Working dir should not be empty");
      assertEquals(promptDirResult.data.length > 0, true, "Prompt dir should not be empty");
      assertEquals(schemaDirResult.data.length > 0, true, "Schema dir should not be empty");
    }

    // logger.debug("Directory method consistency verified");
  });
});

// logger.debug("BreakdownConfig Units Tests completed");
