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

import { assertEquals, assertRejects } from "@std/assert";
import { expect } from "@std/expect";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import {
  cleanupTestConfigs,
  invalidAppConfigs,
  setupAppConfigOnly,
  setupExtraFieldsConfig,
  setupInvalidConfig,
} from "../test_utils.ts";
import { describe, it } from "@std/testing/bdd";
import { BreakdownLogger } from "@tettuan/breakdownlogger";
import { ConfigValidator } from "../../src/validators/config_validator.ts";
import { DefaultPaths } from "../../src/types/app_config.ts";

const logger = new BreakdownLogger();

describe("Config Validation", () => {
  it("should validate extra fields in config", async () => {
    logger.debug("Starting extra fields validation test");
    const tempDir = await setupExtraFieldsConfig();
    logger.debug("Test directory setup completed", { tempDir });

    try {
      logger.debug("Creating BreakdownConfig instance");
      const config = new BreakdownConfig(undefined, tempDir);

      logger.debug("Loading configuration");
      await config.loadConfig();

      logger.debug("Retrieving configuration result");
      const result = await config.getConfig();

      logger.debug("Validating configuration fields");
      assertEquals(result.working_dir, DefaultPaths.WORKING_DIR);
      assertEquals(result.app_prompt.base_dir, DefaultPaths.PROMPT_BASE_DIR);
      assertEquals(result.app_schema.base_dir, DefaultPaths.SCHEMA_BASE_DIR);
      logger.debug("All field validations passed");
    } finally {
      logger.debug("Cleaning up test directory");
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should reject empty working directory", async () => {
    logger.debug("Starting empty working directory validation test");
    const tempDir = await setupInvalidConfig({ working_dir: "" });
    logger.debug("Test directory setup for empty working dir validation", { tempDir });

    try {
      logger.debug("Creating BreakdownConfig instance");
      const config = new BreakdownConfig(undefined, tempDir);
      logger.debug("Created BreakdownConfig instance", { baseDir: tempDir });

      await assertRejects(
        async () => {
          logger.debug("Attempting to load config with empty working directory");
          await config.loadConfig();
        },
        Error,
        "ERR1002: Invalid application configuration",
        "Expected error for empty working directory was not thrown",
      );
      logger.debug("Config validation rejected as expected");
    } catch (error) {
      logger.error("Test failed", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        tempDir,
      });
      throw error;
    } finally {
      logger.debug("Cleaning up test directory");
      await cleanupTestConfigs(tempDir);
      logger.debug("Test cleanup completed", { tempDir });
    }
  });
});

describe("Should validate required fields", () => {
  it("should validate required fields", async () => {
    logger.debug("Starting required fields validation test");
    const tempDir = await setupAppConfigOnly();
    logger.debug("Test directory setup completed", { tempDir });

    try {
      logger.debug("Creating BreakdownConfig instance");
      const config = new BreakdownConfig(undefined, tempDir);

      logger.debug("Loading configuration");
      await config.loadConfig();

      logger.debug("Retrieving configuration result");
      const result = await config.getConfigSafe();

      // Assert result is successful
      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error(`Config loading failed: ${result.error.message}`);
      }
      const configData = result.data;

      logger.debug("Validating configuration fields");
      ConfigValidator.validateAppConfig(configData);

      logger.debug("Checking working directory");
      assertEquals(configData.working_dir, DefaultPaths.WORKING_DIR);

      logger.debug("Checking app prompt base directory");
      assertEquals(configData.app_prompt.base_dir, DefaultPaths.PROMPT_BASE_DIR);

      logger.debug("Checking app schema base directory");
      assertEquals(configData.app_schema.base_dir, DefaultPaths.SCHEMA_BASE_DIR);

      logger.debug("All required fields validation passed");
    } finally {
      logger.debug("Cleaning up test directory");
      await cleanupTestConfigs(tempDir);
    }
  });
});

describe("Should validate JSON structure", () => {
  it("should reject invalid YAML", async () => {
    logger.debug("Starting invalid YAML validation test");
    const tempDir = await setupInvalidConfig({ invalid: "yaml: :" });
    logger.debug("Test directory setup completed", { tempDir });

    try {
      logger.debug("Creating BreakdownConfig instance");
      const config = new BreakdownConfig(undefined, tempDir);

      logger.debug("Attempting to load invalid YAML configuration");
      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
        "ERR1002: Invalid application configuration",
      );
      logger.debug("Invalid YAML was rejected as expected");
    } finally {
      logger.debug("Cleaning up test directory");
      await cleanupTestConfigs(tempDir);
    }
  });
});

describe("Should accept extra configuration fields", () => {
  it("should accept extra fields", async () => {
    logger.debug("Starting extra fields acceptance test");
    const tempDir = await setupExtraFieldsConfig();
    logger.debug("Test directory setup completed", { tempDir });

    try {
      logger.debug("Creating BreakdownConfig instance");
      const config = new BreakdownConfig(undefined, tempDir);

      logger.debug("Loading configuration");
      await config.loadConfig();

      logger.debug("Retrieving configuration result");
      const result = await config.getConfig();

      logger.debug("Validating configuration fields");
      assertEquals(result.working_dir, DefaultPaths.WORKING_DIR);
      assertEquals(result.app_prompt.base_dir, DefaultPaths.PROMPT_BASE_DIR);
      assertEquals(result.app_schema.base_dir, DefaultPaths.SCHEMA_BASE_DIR);
      logger.debug("All field validations passed");
    } finally {
      logger.debug("Cleaning up test directory");
      await cleanupTestConfigs(tempDir);
    }
  });
});

describe("Should reject empty working directory", () => {
  it("should reject empty working directory", async () => {
    logger.debug("Starting empty working directory rejection test");
    const tempDir = await setupInvalidConfig(invalidAppConfigs.emptyStrings);
    logger.debug("Test directory setup completed", { tempDir });

    try {
      logger.debug("Creating BreakdownConfig instance");
      const config = new BreakdownConfig(undefined, tempDir);

      logger.debug("Attempting to load configuration with empty working directory");
      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
        "ERR1002: Invalid application configuration",
      );
      logger.debug("Empty working directory was rejected as expected");
    } finally {
      logger.debug("Cleaning up test directory");
      await cleanupTestConfigs(tempDir);
    }
  });
});
