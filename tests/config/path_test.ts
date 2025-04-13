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

import { assertEquals } from "@std/assert/assert_equals";
import { assertRejects } from "@std/assert/assert_rejects";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { cleanupTestConfigs, setupMergeConfigs } from "../test_utils.ts";
import { describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import { BreakdownLogger } from "@tettuan/breakdownlogger";

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

      const workingDir = await config.getWorkingDir();
      logger.debug("Resolved working directory", {
        expected: join(tempDir, "workspace"),
        actual: workingDir,
      });

      const promptDir = await config.getPromptDir();
      logger.debug("Resolved prompt directory", {
        expected: join(tempDir, "workspace", "custom/prompts"),
        actual: promptDir,
      });

      const schemaDir = await config.getSchemaDir();
      logger.debug("Resolved schema directory", {
        expected: join(tempDir, "workspace", "schemas"),
        actual: schemaDir,
      });

      // Verify each path individually for better error reporting
      assertEquals(workingDir, join(tempDir, "workspace"));
      assertEquals(promptDir, join(tempDir, "workspace", "custom/prompts"));
      assertEquals(schemaDir, join(tempDir, "workspace", "schemas"));
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

      const workingDir = await config.getWorkingDir();
      logger.debug("Resolved working directory", {
        expected: join(tempDir, "workspace"),
        actual: workingDir,
        tempDir,
      });

      const promptDir = await config.getPromptDir();
      logger.debug("Resolved prompt directory", {
        expected: join(tempDir, "workspace", "custom/prompts"),
        actual: promptDir,
        workingDir,
      });

      // Verify paths with detailed context
      assertEquals(workingDir, join(tempDir, "workspace"), "Working directory mismatch");
      assertEquals(
        promptDir,
        join(tempDir, "workspace", "custom/prompts"),
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

      const promptDir = await config.getPromptDir();
      logger.debug("Resolved prompt directory with base dir", {
        expected: join(tempDir, "workspace", "custom/prompts"),
        actual: promptDir,
        tempDir,
      });

      assertEquals(
        promptDir,
        join(tempDir, "workspace", "custom/prompts"),
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
