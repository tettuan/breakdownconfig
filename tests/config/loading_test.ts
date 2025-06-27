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
import { expect } from "@std/expect";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { cleanupTestConfigs, setupAppConfigOnly, setupMergeConfigs } from "../test_utils.ts";
import { describe, it } from "@std/testing/bdd";
import { BreakdownLogger } from "@tettuan/breakdownlogger";
import { DefaultPaths } from "../../src/types/app_config.ts";

const logger = new BreakdownLogger();

describe("Config Loading", () => {
  it("should load and merge configurations correctly", async () => {
    const tempDir = await setupMergeConfigs();
    logger.debug("Test directory setup for merged configs", { tempDir });

    try {
      const config = new BreakdownConfig(undefined, tempDir);
      logger.debug("Created BreakdownConfig instance", { baseDir: tempDir });

      await config.loadConfig();
      logger.debug("Config loaded successfully");

      const result = await config.getConfigSafe();
      logger.debug("Retrieved merged configuration", {
        result,
        success: result.success,
        workingDir: result.success ? result.data.working_dir : undefined,
        promptBaseDir: result.success ? result.data.app_prompt.base_dir : undefined,
        schemaBaseDir: result.success ? result.data.app_schema.base_dir : undefined,
      });

      // Assert result is successful
      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error(`Config loading failed: ${result.error.message}`);
      }
      const configData = result.data;

      // Verify each field individually for better error reporting
      logger.debug("Verifying working_dir", {
        expected: DefaultPaths.WORKING_DIR,
        actual: configData.working_dir,
      });
      assertEquals(result.working_dir, DefaultPaths.WORKING_DIR);

      logger.debug("Verifying app_prompt.base_dir", {
        expected: "custom/prompts",
        actual: result.app_prompt.base_dir,
      });
      assertEquals(result.app_prompt.base_dir, "custom/prompts");

      logger.debug("Verifying app_schema.base_dir", {
        expected: DefaultPaths.SCHEMA_BASE_DIR,
        actual: result.app_schema.base_dir,
      });
      assertEquals(result.app_schema.base_dir, DefaultPaths.SCHEMA_BASE_DIR);
    } catch (error) {
      logger.error("Test failed", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        tempDir,
      });
      throw error;
    } finally {
      await cleanupTestConfigs(tempDir);
      logger.debug("Test cleanup completed", { tempDir });
    }
  });

  it("should load app config only when user config is missing", async () => {
    const tempDir = await setupAppConfigOnly();
    logger.debug("Test directory setup for app-only config", { tempDir });

    try {
      const config = new BreakdownConfig(undefined, tempDir);
      logger.debug("Created BreakdownConfig instance", { baseDir: tempDir });

      await config.loadConfig();
      logger.debug("Config loaded successfully");

      const result = await config.getConfig();
      logger.debug("Retrieved app-only configuration", {
        result,
        workingDir: result.working_dir,
        promptBaseDir: result.app_prompt.base_dir,
        schemaBaseDir: result.app_schema.base_dir,
      });

      // Verify each field individually for better error reporting
      logger.debug("Verifying working_dir", {
        expected: DefaultPaths.WORKING_DIR,
        actual: result.working_dir,
      });
      assertEquals(result.working_dir, DefaultPaths.WORKING_DIR);

      logger.debug("Verifying app_prompt.base_dir", {
        expected: DefaultPaths.PROMPT_BASE_DIR,
        actual: result.app_prompt.base_dir,
      });
      assertEquals(result.app_prompt.base_dir, DefaultPaths.PROMPT_BASE_DIR);

      logger.debug("Verifying app_schema.base_dir", {
        expected: DefaultPaths.SCHEMA_BASE_DIR,
        actual: result.app_schema.base_dir,
      });
      assertEquals(result.app_schema.base_dir, DefaultPaths.SCHEMA_BASE_DIR);
    } catch (error) {
      logger.error("Test failed", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        tempDir,
      });
      throw error;
    } finally {
      await cleanupTestConfigs(tempDir);
      logger.debug("Test cleanup completed", { tempDir });
    }
  });
});
