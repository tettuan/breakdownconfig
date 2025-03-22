/**
 * Path Resolution Tests
 *
 * Purpose:
 * Test the handling of file paths and directory structures
 *
 * Test Cases:
 * 1. Relative path handling
 * 2. Base directory handling
 * 3. File existence verification
 *
 * Success Criteria:
 * - Paths are resolved correctly
 * - Files are created in correct locations
 * - Directory structure is maintained
 */

import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import {
  cleanupTestConfigs,
  setupAppConfigOnly,
  setupMergeConfigs,
  TEST_WORKING_DIR,
  validAppConfig,
  validUserConfig,
} from "../test_utils.ts";
import { describe, it } from "@std/testing/bdd";

describe("Config Path Resolution", () => {
  it("should resolve paths correctly", async () => {
    const tempDir = await setupAppConfigOnly();
    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = await config.getConfig();

      assertEquals(result.working_dir, "workspace");
      assertEquals(result.app_prompt.base_dir, "prompts");
      assertEquals(result.app_schema.base_dir, "schemas");

      const expectedWorkingDir = join(tempDir, result.working_dir);
      const expectedPromptDir = join(expectedWorkingDir, result.app_prompt.base_dir);
      const expectedSchemaDir = join(expectedWorkingDir, result.app_schema.base_dir);

      assertEquals(await config.getWorkingDir(), expectedWorkingDir);
      assertEquals(await config.getPromptDir(), expectedPromptDir);
      assertEquals(await config.getSchemaDir(), expectedSchemaDir);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should handle relative paths correctly", async () => {
    const tempDir = await setupAppConfigOnly();
    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = await config.getConfig();
      assertEquals(result.working_dir, "workspace");
      assertEquals(result.app_prompt.base_dir, "prompts");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should handle base directory correctly", async () => {
    const tempDir = await setupMergeConfigs();
    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = await config.getConfig();
      assertEquals(result.working_dir, validAppConfig.working_dir);
      assertEquals(
        result.app_prompt.base_dir,
        validUserConfig.app_prompt?.base_dir,
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should verify config file creation and cleanup", async () => {
    const tempDir = await setupMergeConfigs();

    try {
      // Verify that files are created
      const appConfigPath = join(tempDir, "breakdown", "config", "app.yaml");
      const userConfigPath = join(
        tempDir,
        TEST_WORKING_DIR,
        "config",
        "user.yaml",
      );

      // Check app.yaml
      const appFileInfo = await Deno.stat(appConfigPath);
      assertEquals(appFileInfo.isFile, true);

      // Check user.yaml
      const userFileInfo = await Deno.stat(userConfigPath);
      assertEquals(userFileInfo.isFile, true);

      // Verify file contents
      const appConfigContent = await Deno.readTextFile(appConfigPath);
      assertEquals(JSON.parse(appConfigContent), validAppConfig);

      const userConfigContent = await Deno.readTextFile(userConfigPath);
      assertEquals(JSON.parse(userConfigContent), validUserConfig);
    } finally {
      await cleanupTestConfigs(tempDir);

      // Verify cleanup
      await assertRejects(
        () => Deno.stat(tempDir),
        Deno.errors.NotFound,
        undefined,
      );
    }
  });
});
