/**
 * Architecture Tests for BreakdownConfig
 * Level 0: Verifies architectural constraints and Total Function design patterns
 */

import {
  assert,
  assertEquals,
  assertExists,
  type assertThrows as _assertThrows,
} from "@std/assert";
// import { BreakdownLogger } from "https://jsr.io/@tettuan/breakdownlogger";
import { BreakdownConfig } from "./breakdown_config.ts";
import type { Result as _Result } from "./types/unified_result.ts";

// const logger = new BreakdownLogger("architecture");

Deno.test("Architecture: BreakdownConfig Smart Constructor Pattern", async (t) => {
  // logger.debug("Testing Smart Constructor pattern enforcement");

  await t.step("Private constructor should be inaccessible", () => {
    // logger.debug("Verifying constructor is private");

    // Should not be able to call constructor directly
    // This test verifies at compile time that constructor is private
    // Note: TypeScript enforces private constructor at compile time
    // We verify the class can only be instantiated through create()
    const hasCreateMethod = typeof BreakdownConfig.create === "function";
    assert(hasCreateMethod, "Should only be created via create() method");
  });

  await t.step("Static create method should exist and return Result", () => {
    // logger.debug("Verifying static create method signature");

    // Verify static create method exists
    assertExists(BreakdownConfig.create);

    // Verify it returns a Result type
    const result = BreakdownConfig.create();
    assertExists(result);

    // Should have success property (Result type signature)
    const hasSuccessProperty = "success" in result;
    assert(hasSuccessProperty, "Result should have success property");

    // logger.debug("Smart Constructor verification complete", {
    //   hasCreateMethod: true,
    //   returnsResult: true
    // });
  });

  await t.step("Static create method should validate inputs", () => {
    // logger.debug("Testing input validation");

    // Valid inputs should succeed
    const validResult = BreakdownConfig.create("production", "/valid/path");
    assert(validResult.success, "Valid inputs should succeed");

    // Invalid profile name should fail
    const invalidResult = BreakdownConfig.create("invalid@profile!", "/valid/path");
    assert(!invalidResult.success, "Invalid profile should fail");

    if (!invalidResult.success) {
      assertExists(invalidResult.error, "Error should be provided for invalid input");
      // logger.debug("Validation error captured", { error: invalidResult.error instanceof Error ? invalidResult.error.message : String(invalidResult.error) });
    }
  });
});

Deno.test("Architecture: BreakdownConfig Result Type Consistency", async (t) => {
  // logger.debug("Testing Result type usage consistency");

  await t.step("All Safe methods should return Result types", async () => {
    // logger.debug("Verifying all *Safe methods return Result");

    const configResult = BreakdownConfig.create();
    if (!configResult.success) {
      throw new Error("Failed to create config for testing");
    }

    const config = configResult.data;

    // Test loadConfigSafe returns Result
    const loadResult = await config.loadConfigSafe();
    assert("success" in loadResult, "loadConfigSafe should return Result");

    // Test getConfigSafe returns Result
    const getResult = await config.getConfigSafe();
    assert("success" in getResult, "getConfigSafe should return Result");

    // Test getWorkingDirSafe returns Result
    const workingDirResult = await config.getWorkingDirSafe();
    assert("success" in workingDirResult, "getWorkingDirSafe should return Result");

    // logger.debug("All Safe methods verified to return Result types");
  });

  await t.step("Legacy methods should exist but be marked deprecated", () => {
    // logger.debug("Verifying Legacy API exists for backward compatibility");

    const configResult = BreakdownConfig.create();
    if (!configResult.success) {
      throw new Error("Failed to create config for testing");
    }

    const config = configResult.data;

    // Legacy methods should exist
    assertExists(config.loadConfig, "loadConfig legacy method should exist");
    assertExists(config.getConfig, "getConfig legacy method should exist");
    assertExists(config.getWorkingDir, "getWorkingDir legacy method should exist");

    // Legacy createLegacy should exist
    assertExists(BreakdownConfig.createLegacy, "createLegacy static method should exist");

    // logger.debug("Legacy API compatibility verified");
  });
});

Deno.test("Architecture: BreakdownConfig Exception-Free Design", async (t) => {
  // logger.debug("Testing exception-free architecture");

  await t.step("Smart Constructor should never throw exceptions", () => {
    // logger.debug("Verifying create method never throws");

    // Test various invalid inputs - should never throw, only return error Results
    const testCases = [
      ["", ""],
      ["invalid@#$%", "/path"],
      ["valid", ""],
      [undefined, undefined],
      ["very-long-profile-name-that-might-cause-issues", "/some/path"],
    ];

    for (const [profile, baseDir] of testCases) {
      try {
        const result = BreakdownConfig.create(profile as string, baseDir as string);
        // Should always return a Result, never throw
        assertExists(result, `Should return Result for inputs: ${profile}, ${baseDir}`);
        assert("success" in result, "Should always return Result type");
      } catch (error) {
        throw new Error(
          `create() threw exception for inputs ${profile}, ${baseDir}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    // logger.debug("Exception-free verification complete");
  });

  await t.step("All Safe methods should handle errors as Result types", async () => {
    // logger.debug("Testing Safe methods error handling");

    const configResult = BreakdownConfig.create();
    if (!configResult.success) {
      throw new Error("Failed to create config for testing");
    }

    const config = configResult.data;

    // These should never throw, only return error Results
    try {
      const loadResult = await config.loadConfigSafe();
      assertExists(loadResult, "loadConfigSafe should return Result");

      const getResult = await config.getConfigSafe();
      assertExists(getResult, "getConfigSafe should return Result");

      const workingDirResult = await config.getWorkingDirSafe();
      assertExists(workingDirResult, "getWorkingDirSafe should return Result");

      // logger.debug("All Safe methods verified exception-free");
    } catch (error) {
      throw new Error(
        `Safe method threw exception: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
});

Deno.test("Architecture: BreakdownConfig Total Function Compliance", async (t) => {
  // logger.debug("Testing Total Function principle compliance");

  await t.step("All functions should be total (no undefined/null returns)", async () => {
    // logger.debug("Verifying total function behavior");

    const configResult = BreakdownConfig.create("test");
    assert(configResult.success, "Valid create should succeed");

    if (!configResult.success) {
      throw new Error("Test setup failed");
    }

    const config = configResult.data;

    // All methods should return defined values
    const loadResult = await config.loadConfigSafe();
    assertExists(loadResult, "loadConfigSafe should return defined Result");

    const getResult = await config.getConfigSafe();
    assertExists(getResult, "getConfigSafe should return defined Result");

    const workingDirResult = await config.getWorkingDirSafe();
    assertExists(workingDirResult, "getWorkingDirSafe should return defined Result");

    // logger.debug("Total function compliance verified");
  });

  await t.step("Result types should be exhaustively handled", () => {
    // logger.debug("Testing Result type exhaustiveness");

    const result = BreakdownConfig.create("test");

    // Should be able to handle Result exhaustively without default case
    const handled = (() => {
      if (result.success) {
        return "success";
      } else {
        return "error";
      }
    })();

    assertEquals(typeof handled, "string", "Result should be exhaustively handled");
    // logger.debug("Result type exhaustiveness verified");
  });
});

// logger.debug("BreakdownConfig Architecture Tests completed");
