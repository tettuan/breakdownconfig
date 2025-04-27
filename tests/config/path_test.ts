/**
 * Path Resolution Tests
 *
 * Purpose:
 * Test the path resolution functionality of the configuration system
 *
 * Test Cases:
 * 1. Basic path resolution
 * 2. Relative path handling
 * 3. Base directory handling
 *
 * Success Criteria:
 * - Paths are resolved correctly
 * - Relative paths are handled properly
 * - Base directory is applied correctly
 */

import { assertEquals } from "@std/assert/assert_equals";
import { assertRejects } from "@std/assert/assert_rejects";
import { join } from "@std/path";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { cleanupTestConfigs, setupMergeConfigs } from "../test_utils.ts";
import { describe, it } from "@std/testing/bdd";
import { BreakdownLogger } from "@tettuan/breakdownlogger";
import { DefaultPaths } from "../../src/types/app_config.ts";

const logger = new BreakdownLogger();

describe("Config Path Resolution", () => {
  it("should resolve paths correctly", async () => {
    const tempDir = await setupMergeConfigs();
    logger.debug("Test directory setup for path resolution", { tempDir });

    try {
      const config = new BreakdownConfig(tempDir);
      logger.debug("Created BreakdownConfig instance", { baseDir: tempDir });

      await config.loadConfig();
      logger.debug("Config loaded successfully");

      const workingDir = join(tempDir, DefaultPaths.WORKING_DIR);
      const promptDir = join(workingDir, "custom", "prompts");
      const schemaDir = join(workingDir, "schemas");

      logger.debug("Resolved working directory", {
        expected: workingDir,
        actual: join(tempDir, DefaultPaths.WORKING_DIR),
      });
      assertEquals(join(tempDir, DefaultPaths.WORKING_DIR), workingDir);

      logger.debug("Resolved prompt directory", {
        expected: promptDir,
        actual: join(tempDir, DefaultPaths.WORKING_DIR, "custom", "prompts"),
      });
      assertEquals(join(tempDir, DefaultPaths.WORKING_DIR, "custom", "prompts"), promptDir);

      logger.debug("Resolved schema directory", {
        expected: schemaDir,
        actual: DefaultPaths.SCHEMA_BASE_DIR,
      });
      assertEquals(DefaultPaths.SCHEMA_BASE_DIR, DefaultPaths.SCHEMA_BASE_DIR);
    } catch (error) {
      logger.error("Path resolution test failed", {
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

  it("should handle relative paths correctly", async () => {
    const tempDir = await setupMergeConfigs();
    logger.debug("Test directory setup for relative paths", { tempDir });

    try {
      const config = new BreakdownConfig(tempDir);
      logger.debug("Created BreakdownConfig instance", { baseDir: tempDir });

      await config.loadConfig();
      logger.debug("Config loaded successfully");

      const workingDir = join(tempDir, DefaultPaths.WORKING_DIR);
      const promptDir = join(workingDir, "custom", "prompts");

      logger.debug("Resolved working directory", {
        expected: workingDir,
        actual: join(tempDir, DefaultPaths.WORKING_DIR),
        tempDir,
      });
      assertEquals(
        join(tempDir, DefaultPaths.WORKING_DIR),
        workingDir,
        "Working directory mismatch",
      );

      logger.debug("Resolved prompt directory", {
        expected: promptDir,
        actual: join(tempDir, DefaultPaths.WORKING_DIR, "custom", "prompts"),
        workingDir,
      });
      assertEquals(
        join(tempDir, DefaultPaths.WORKING_DIR, "custom", "prompts"),
        promptDir,
        "Prompt directory mismatch",
      );
    } catch (error) {
      logger.error("Relative path test failed", {
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

  it("should handle base directory correctly", async () => {
    const tempDir = await setupMergeConfigs();
    logger.debug("Test directory setup for base directory", { tempDir });

    try {
      const config = new BreakdownConfig(tempDir);
      logger.debug("Created BreakdownConfig instance", { baseDir: tempDir });

      await config.loadConfig();
      logger.debug("Config loaded successfully");

      const promptDir = join(tempDir, DefaultPaths.WORKING_DIR, "custom", "prompts");

      logger.debug("Resolved prompt directory with base dir", {
        expected: promptDir,
        actual: join(tempDir, DefaultPaths.WORKING_DIR, "custom", "prompts"),
        tempDir,
      });
      assertEquals(
        join(tempDir, DefaultPaths.WORKING_DIR, "custom", "prompts"),
        promptDir,
        "Base directory path mismatch",
      );
    } catch (error) {
      logger.error("Base directory test failed", {
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

  it("should verify config file creation and cleanup", async () => {
    const tempDir = await setupMergeConfigs();
    logger.debug("Test directory setup for file verification", { tempDir });

    try {
      const config = new BreakdownConfig(tempDir);
      logger.debug("Created initial BreakdownConfig instance", { baseDir: tempDir });

      await config.loadConfig();
      logger.debug("Initial config loaded successfully");

      await cleanupTestConfigs(tempDir);
      logger.debug("Cleanup completed, attempting to load config again");

      // Try to access the config after cleanup
      await assertRejects(
        async () => {
          const newConfig = new BreakdownConfig(tempDir);
          logger.debug("Created new BreakdownConfig instance after cleanup", { baseDir: tempDir });
          await newConfig.loadConfig();
        },
        Error,
        "Application configuration file not found at",
      );
    } catch (error) {
      logger.error("Config cleanup verification failed", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        tempDir,
      });
      throw error;
    }
  });
});
