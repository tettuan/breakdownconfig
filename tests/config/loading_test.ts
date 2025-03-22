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

import { assertEquals } from "@std/assert/assert_equals";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { cleanupTestConfigs, setupAppConfigOnly, setupMergeConfigs } from "../test_utils.ts";
import { describe, it } from "@std/testing/bdd";

describe("Config Loading", () => {
  it("should load and merge configurations correctly", async () => {
    const tempDir = await setupMergeConfigs();
    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = await config.getConfig();

      assertEquals(result.working_dir, "workspace");
      assertEquals(result.app_prompt.base_dir, "custom/prompts");
      assertEquals(result.app_schema.base_dir, "schemas");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should load app config only when user config is missing", async () => {
    const tempDir = await setupAppConfigOnly();
    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = await config.getConfig();

      assertEquals(result.working_dir, "workspace");
      assertEquals(result.app_prompt.base_dir, "prompts");
      assertEquals(result.app_schema.base_dir, "schemas");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
});
