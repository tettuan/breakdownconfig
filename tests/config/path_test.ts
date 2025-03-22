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

import { assertEquals, assertRejects } from '@std/assert';
import { join } from '@std/path';
import { BreakdownConfig } from '../../src/mod.ts';
import {
  cleanupTestConfigs,
  setupTestConfigs,
  TEST_WORKING_DIR,
  validAppConfig,
  validUserConfig,
} from '../test_utils.ts';
import { describe, it } from "@std/testing/bdd";

describe("Path Handling", () => {
  it("should handle relative paths correctly", async () => {
    const tempDir = await setupTestConfigs(validAppConfig, null);
    try {
      const config = new BreakdownConfig(tempDir);
      const result = await config.getConfig();
      const mergedConfig = await result;
      assertEquals(mergedConfig.working_dir, "./.agent/breakdown");
      assertEquals(mergedConfig.app_prompt.base_dir, "./prompts");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should handle base directory correctly", async () => {
    const tempDir = await setupTestConfigs(validAppConfig, validUserConfig);
    try {
      const config = new BreakdownConfig(tempDir);
      const result = await config.getConfig();
      const mergedConfig = await result;
      assertEquals(mergedConfig.working_dir, validAppConfig.working_dir);
      assertEquals(
        mergedConfig.app_prompt.base_dir,
        validUserConfig.app_prompt?.base_dir
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should verify config file creation and cleanup", async () => {
    const tempDir = await setupTestConfigs(
      validAppConfig,
      validUserConfig,
      TEST_WORKING_DIR,
    );

    try {
      // Verify that files are created
      const appConfigPath = join(tempDir, 'breakdown', 'config', 'app.json');
      const userConfigPath = join(
        tempDir,
        TEST_WORKING_DIR,
        'config',
        'user.json',
      );

      // Check app.json
      const appFileInfo = await Deno.stat(appConfigPath);
      assertEquals(appFileInfo.isFile, true);

      // Check user.json
      const userFileInfo = await Deno.stat(userConfigPath);
      assertEquals(userFileInfo.isFile, true);

      // Verify file contents
      const appConfigContent = JSON.parse(
        await Deno.readTextFile(appConfigPath),
      );
      assertEquals(appConfigContent, validAppConfig);

      const userConfigContent = JSON.parse(
        await Deno.readTextFile(userConfigPath),
      );
      assertEquals(userConfigContent, validUserConfig);
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
