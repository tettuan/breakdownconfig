/**
 * Configuration Validation Tests
 * 
 * Purpose:
 * Test the validation of configuration content and structure
 * 
 * Test Cases:
 * 1. Required fields validation
 * 2. JSON structure validation
 * 3. Extra fields handling
 * 4. Empty values handling
 * 
 * Success Criteria:
 * - Required fields are properly validated
 * - Invalid JSON is rejected
 * - Extra fields are handled gracefully
 * - Empty values are handled appropriately
 */

import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { join } from "std/path/mod.ts";
import { BreakdownConfig } from "../../src/mod.ts";
import {
  TEST_WORKING_DIR,
  invalidAppConfigs,
  extraFieldConfigs,
  setupTestConfigs,
  cleanupTestConfigs
} from "../test_utils.ts";

Deno.test({
  name: "Should validate required fields",
  async fn() {
    for (const [key, invalidConfig] of Object.entries(invalidAppConfigs)) {
      const tempDir = await setupTestConfigs(invalidConfig, null, TEST_WORKING_DIR);

      try {
        const config = new BreakdownConfig(tempDir);
        await assertRejects(
          () => config.loadConfig(),
          Error,
          "Missing required fields in application config"
        );
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    }
  }
});

Deno.test({
  name: "Should validate JSON structure",
  async fn() {
    const tempDir = await setupTestConfigs(null, null, TEST_WORKING_DIR);
    const appConfigPath = join(tempDir, "breakdown", "config");
    
    await Deno.mkdir(appConfigPath, { recursive: true });
    await Deno.writeTextFile(
      join(appConfigPath, "app.json"),
      "invalid json content"
    );

    try {
      const config = new BreakdownConfig(tempDir);
      await assertRejects(
        () => config.loadConfig(),
        Error,
        "Invalid JSON in application config file"
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  }
});

Deno.test({
  name: "Should accept extra configuration fields",
  async fn() {
    // Test root level extra fields
    let tempDir = await setupTestConfigs(extraFieldConfigs.rootLevel, null, TEST_WORKING_DIR);
    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = config.getConfig();
      
      // Verify that required fields are present and correct
      assertEquals(result.working_dir, extraFieldConfigs.rootLevel.working_dir);
      assertEquals(result.app_prompt.base_dir, extraFieldConfigs.rootLevel.app_prompt.base_dir);
      assertEquals(result.app_schema.base_dir, extraFieldConfigs.rootLevel.app_schema.base_dir);
      
      // Verify that extra fields are not included in the result
      assertEquals(
        Object.keys(result).sort(),
        ["working_dir", "app_prompt", "app_schema"].sort()
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }

    // Test nested level extra fields
    tempDir = await setupTestConfigs(extraFieldConfigs.nestedLevel, null, TEST_WORKING_DIR);
    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = config.getConfig();
      
      // Verify that only expected fields are present in nested objects
      assertEquals(Object.keys(result.app_prompt), ["base_dir"]);
      assertEquals(Object.keys(result.app_schema), ["base_dir"]);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  }
});

Deno.test({
  name: "Should reject empty working directory",
  async fn() {
    const tempDir = await setupTestConfigs(extraFieldConfigs.emptyStrings, null, TEST_WORKING_DIR);

    try {
      const config = new BreakdownConfig(tempDir);
      await assertRejects(
        () => config.loadConfig(),
        Error,
        "Working directory not set"
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  }
}); 