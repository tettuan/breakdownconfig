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

import { assertEquals, assertRejects } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { BreakdownConfig } from '../../src/mod.ts';
import {
  cleanupTestConfigs,
  setupTestConfigs,
  TEST_WORKING_DIR,
  validAppConfig,
} from '../test_utils.ts';
import { ErrorCode } from '../../src/error_manager.ts';

describe("Error Handling", () => {
  it("should handle missing app config", async () => {
    const config = new BreakdownConfig();
    await assertRejects(
      async () => {
        await config.getConfig();
      },
      Error,
      ErrorCode.APP_CONFIG_NOT_FOUND
    );
  });

  it('Should handle missing config files appropriately', async () => {
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
  });

  it("should handle missing user config gracefully", async () => {
    const tempDir = await setupTestConfigs(validAppConfig, null);
    try {
      const config = new BreakdownConfig(tempDir);
      const result = await config.getConfig();
      const mergedConfig = await result;
      assertEquals(mergedConfig.working_dir, validAppConfig.working_dir);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
});
