/**
 * Configuration Loading Tests
 *
 * Purpose:
 * Test the loading and merging of configuration files
 *
 * Test Cases:
 * 1. Loading application config without user config
 * 2. Loading and merging both configs
 *
 * Success Criteria:
 * - Application config is loaded correctly
 * - User config overrides are applied properly
 * - Config structure matches specifications
 */

import { assertEquals } from '@std/assert';
import { BreakdownConfig } from '../../src/mod.ts';
import {
  cleanupTestConfigs,
  setupTestConfigs,
  TEST_WORKING_DIR,
  validAppConfig,
  validUserConfig,
} from '../test_utils.ts';

Deno.test({
  name: 'Should load valid app config without user config',
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

      assertEquals(result.working_dir, validAppConfig.working_dir);
      assertEquals(
        result.app_prompt.base_dir,
        validAppConfig.app_prompt.base_dir,
      );
      assertEquals(
        result.app_schema.base_dir,
        validAppConfig.app_schema.base_dir,
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  },
});

Deno.test({
  name: 'Should merge app config with user config',
  async fn() {
    const tempDir = await setupTestConfigs(
      validAppConfig,
      validUserConfig,
      TEST_WORKING_DIR,
    );

    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = config.getConfig();

      assertEquals(result.working_dir, validAppConfig.working_dir);
      assertEquals(
        result.app_prompt.base_dir,
        validUserConfig.app_prompt.base_dir,
      );
      assertEquals(
        result.app_schema.base_dir,
        validAppConfig.app_schema.base_dir,
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  },
});
