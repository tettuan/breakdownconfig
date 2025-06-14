/**
 * Custom Configuration Set Tests
 *
 * Purpose:
 * Test the custom configuration set functionality
 *
 * Test Cases:
 * 1. Loading custom configuration with valid prefix
 * 2. Validating prefix format (alphanumeric and hyphens only)
 * 3. Loading production-app.yml and production-user.yml
 * 4. Backward compatibility with single argument
 */

import { assertEquals, assertRejects } from "@std/assert";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { cleanupTestConfigs, setupCustomConfigSet } from "../test_utils.ts";
import { describe, it } from "@std/testing/bdd";
import { BreakdownLogger } from "@tettuan/breakdownlogger";
import { DefaultPaths } from "../../src/types/app_config.ts";

const logger = new BreakdownLogger();

describe("Custom Configuration Sets", () => {
  it("should load custom configuration set with valid prefix", async () => {
    const tempDir = await setupCustomConfigSet("production");
    logger.debug("Test directory setup for custom config set", { tempDir, prefix: "production" });

    try {
      const config = new BreakdownConfig(tempDir, "production");
      logger.debug("Created BreakdownConfig instance with custom prefix", {
        baseDir: tempDir,
        prefix: "production",
      });

      await config.loadConfig();
      logger.debug("Config loaded successfully");

      const result = await config.getConfig();
      logger.debug("Retrieved custom configuration", {
        result,
        workingDir: result.working_dir,
        promptBaseDir: result.app_prompt.base_dir,
        schemaBaseDir: result.app_schema.base_dir,
      });

      // Verify custom config values (user config overrides app config)
      assertEquals(result.working_dir, DefaultPaths.WORKING_DIR);
      assertEquals(result.app_prompt.base_dir, "production/user-prompts"); // User config overrides
      assertEquals(result.app_schema.base_dir, "production/schemas");
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

  it("should reject invalid config set names", async () => {
    const tempDir = await setupCustomConfigSet("valid");

    try {
      // Test various invalid names
      const invalidNames = [
        "production@2024",
        "dev/test",
        "test config",
        "test.config",
        "../config",
      ];

      for (const invalidName of invalidNames) {
        await assertRejects(
          async () => {
            const config = new BreakdownConfig(tempDir, invalidName);
            await config.loadConfig();
          },
          Error,
          "ERR4001",
        );
      }
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should support backward compatibility with single argument as config set name", async () => {
    const tempDir = await setupCustomConfigSet("staging");
    logger.debug("Test directory setup for backward compatibility test", { tempDir });

    try {
      // When passing only one argument that looks like a config set name
      const config = new BreakdownConfig("staging");
      logger.debug("Created BreakdownConfig with single argument", { argument: "staging" });

      // This test expects the file not to be found since we're using current directory
      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
        "ERR1001", // APP_CONFIG_NOT_FOUND
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should handle missing custom config files", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const config = new BreakdownConfig(tempDir, "nonexistent");

      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
        "ERR1001", // APP_CONFIG_NOT_FOUND
      );
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
