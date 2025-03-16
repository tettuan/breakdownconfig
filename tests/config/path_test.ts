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

import { assertEquals, assertRejects } from 'std/testing/asserts.ts';
import { join } from 'std/path/mod.ts';
import { BreakdownConfig } from '../../src/mod.ts';
import {
  cleanupTestConfigs,
  setupTestConfigs,
  TEST_WORKING_DIR,
  validAppConfig,
  validUserConfig,
} from '../test_utils.ts';

Deno.test({
  name: 'Should handle relative paths correctly',
  async fn() {
    const tempDir = await setupTestConfigs(
      validAppConfig,
      null,
      TEST_WORKING_DIR,
    );

    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = config.getConfig();

      assertEquals(result.working_dir, './.agent/breakdown');
      assertEquals(result.app_prompt.base_dir, './prompts');
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  },
});

Deno.test({
  name: 'Should handle base directory correctly',
  async fn() {
    const tempDir = await setupTestConfigs(
      validAppConfig,
      validUserConfig,
      TEST_WORKING_DIR,
    );

    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      // Verify that the config file exists in the correct location
      const configPath = join(tempDir, 'breakdown', 'config', 'app.json');
      const fileInfo = await Deno.stat(configPath);
      assertEquals(fileInfo.isFile, true);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  },
});

Deno.test({
  name: 'Should verify config file creation and cleanup',
  async fn() {
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
  },
});
