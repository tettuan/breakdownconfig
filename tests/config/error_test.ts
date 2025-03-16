/**
 * Error Handling Tests
 *
 * Purpose:
 * Test the error handling capabilities of the configuration system
 *
 * Test Cases:
 * 1. Missing config files
 * 2. Missing user config
 *
 * Success Criteria:
 * - Appropriate errors are thrown for missing files
 * - Missing user config is handled gracefully
 * - Error messages are clear and descriptive
 */

import { assertEquals, assertRejects } from 'std/testing/asserts.ts';
import { BreakdownConfig } from '../../src/mod.ts';
import {
  cleanupTestConfigs,
  setupTestConfigs,
  TEST_WORKING_DIR,
  validAppConfig,
} from '../test_utils.ts';

Deno.test({
  name: 'Should handle missing config files appropriately',
  async fn() {
    const tempDir = await setupTestConfigs(null, null, TEST_WORKING_DIR);

    try {
      const config = new BreakdownConfig(tempDir);
      await assertRejects(
        () => config.loadConfig(),
        Error,
        'Application config file not found',
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  },
});

Deno.test({
  name: 'Should handle missing user config gracefully',
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
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  },
});
