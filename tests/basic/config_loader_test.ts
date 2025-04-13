import { assertEquals } from "@std/assert/assert_equals";
import { expect } from "@std/expect";
import { BreakdownConfig } from "../../mod.ts";
import { cleanupTestConfigs, setupAppConfigOnly, setupMergeConfigs } from "../test_utils.ts";
import { describe, it } from "@std/testing/bdd";
import { BreakdownLogger } from "@tettuan/breakdownlogger";

const logger = new BreakdownLogger();

const TEST_APP_CONFIG = {
  working_dir: "./.agent/breakdown",
  app_prompt: {
    base_dir: "/breakdown/prompts/app",
  },
  app_schema: {
    base_dir: "/breakdown/schema/app",
  },
};

const TEST_USER_CONFIG = {
  app_prompt: {
    base_dir: "./prompts/user",
  },
  app_schema: {
    base_dir: "./schema/user",
  },
};

describe("Config Loading", () => {
  it("should load and merge configurations correctly", async () => {
    const tempDir = await setupMergeConfigs();
    logger.debug("Test directory setup for merged configs", { tempDir });

    try {
      const config = new BreakdownConfig(tempDir);
      logger.debug("Created BreakdownConfig instance", { baseDir: tempDir });

      await config.loadConfig();
      logger.debug("Config loaded successfully");

      const result = await config.getConfig();
      logger.debug("Retrieved merged configuration", {
        result,
        workingDir: result.working_dir,
        promptBaseDir: result.app_prompt.base_dir,
        schemaBaseDir: result.app_schema.base_dir,
      });

      // Verify each field individually for better error reporting
      logger.debug("Verifying working_dir", {
        expected: "workspace",
        actual: result.working_dir,
      });
      assertEquals(result.working_dir, "workspace");

      logger.debug("Verifying app_prompt.base_dir", {
        expected: "custom/prompts",
        actual: result.app_prompt.base_dir,
      });
      assertEquals(result.app_prompt.base_dir, "custom/prompts");

      logger.debug("Verifying app_schema.base_dir", {
        expected: "schemas",
        actual: result.app_schema.base_dir,
      });
      assertEquals(result.app_schema.base_dir, "schemas");
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
      const config = new BreakdownConfig(tempDir);
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
        expected: "workspace",
        actual: result.working_dir,
      });
      assertEquals(result.working_dir, "workspace");

      logger.debug("Verifying app_prompt.base_dir", {
        expected: "prompts",
        actual: result.app_prompt.base_dir,
      });
      assertEquals(result.app_prompt.base_dir, "prompts");

      logger.debug("Verifying app_schema.base_dir", {
        expected: "schemas",
        actual: result.app_schema.base_dir,
      });
      assertEquals(result.app_schema.base_dir, "schemas");
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

Deno.test("Basic Config Loading - App Config", async () => {
  const testDir = await Deno.makeTempDir();
  logger.debug("Created test directory for app config test", { testDir });

  try {
    // Setup test environment
    const configDir = `${testDir}/breakdown/config`;
    await Deno.mkdir(configDir, { recursive: true });
    await Deno.writeTextFile(
      `${configDir}/app.yml`,
      JSON.stringify(TEST_APP_CONFIG),
    );
    logger.debug("Created app config file", { configDir, config: TEST_APP_CONFIG });

    const config = new BreakdownConfig(testDir);
    await config.loadConfig();
    const result = await config.getConfig();
    logger.debug("Loaded configuration", { result });

    logger.debug("Verifying app config values", {
      expectedWorkingDir: TEST_APP_CONFIG.working_dir,
      actualWorkingDir: result.working_dir,
      expectedPromptBaseDir: TEST_APP_CONFIG.app_prompt.base_dir,
      actualPromptBaseDir: result.app_prompt.base_dir,
      expectedSchemaBaseDir: TEST_APP_CONFIG.app_schema.base_dir,
      actualSchemaBaseDir: result.app_schema.base_dir,
    });

    assertEquals(result.working_dir, TEST_APP_CONFIG.working_dir);
    assertEquals(result.app_prompt.base_dir, TEST_APP_CONFIG.app_prompt.base_dir);
    assertEquals(result.app_schema.base_dir, TEST_APP_CONFIG.app_schema.base_dir);
  } catch (error) {
    logger.error("App config test failed", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      testDir,
    });
    throw error;
  } finally {
    await Deno.remove(testDir, { recursive: true });
    logger.debug("Cleaned up test directory", { testDir });
  }
});

Deno.test("Basic Config Loading - Missing App Config", async () => {
  const testDir = await Deno.makeTempDir();
  logger.debug("Created test directory for missing app config test", { testDir });

  try {
    // Create directory structure but not the config file
    const configDir = `${testDir}/breakdown/config`;
    await Deno.mkdir(configDir, { recursive: true });
    logger.debug("Created config directory without app config file", { configDir });

    const config = new BreakdownConfig(testDir);
    logger.debug("Attempting to load config without app config file");
    await expect(config.loadConfig()).rejects.toThrow("ERR1001");
    logger.debug("Successfully caught expected error");
  } catch (error) {
    logger.error("Missing app config test failed", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      testDir,
    });
    throw error;
  } finally {
    await Deno.remove(testDir, { recursive: true });
    logger.debug("Cleaned up test directory", { testDir });
  }
});

Deno.test("Basic Config Loading - User Config Integration", async () => {
  const testDir = await Deno.makeTempDir();
  logger.debug("Created test directory for user config integration test", { testDir });

  try {
    // Setup test environment
    const configDir = `${testDir}/breakdown/config`;
    const userConfigDir = `${testDir}/.agent/breakdown/config`;
    await Deno.mkdir(configDir, { recursive: true });
    await Deno.mkdir(userConfigDir, { recursive: true });

    await Deno.writeTextFile(
      `${configDir}/app.yml`,
      JSON.stringify(TEST_APP_CONFIG),
    );
    await Deno.writeTextFile(
      `${userConfigDir}/user.yml`,
      JSON.stringify(TEST_USER_CONFIG),
    );
    logger.debug("Created config files", {
      configDir,
      userConfigDir,
      appConfig: TEST_APP_CONFIG,
      userConfig: TEST_USER_CONFIG,
    });

    const config = new BreakdownConfig(testDir);
    await config.loadConfig();
    const result = await config.getConfig();
    logger.debug("Loaded merged configuration", { result });

    // User config should override app config
    logger.debug("Verifying merged config values", {
      expectedWorkingDir: TEST_APP_CONFIG.working_dir,
      actualWorkingDir: result.working_dir,
      expectedPromptBaseDir: TEST_USER_CONFIG.app_prompt.base_dir,
      actualPromptBaseDir: result.app_prompt.base_dir,
      expectedSchemaBaseDir: TEST_USER_CONFIG.app_schema.base_dir,
      actualSchemaBaseDir: result.app_schema.base_dir,
    });

    assertEquals(result.working_dir, TEST_APP_CONFIG.working_dir);
    assertEquals(result.app_prompt.base_dir, TEST_USER_CONFIG.app_prompt.base_dir);
    assertEquals(result.app_schema.base_dir, TEST_USER_CONFIG.app_schema.base_dir);
  } catch (error) {
    logger.error("User config integration test failed", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      testDir,
    });
    throw error;
  } finally {
    await Deno.remove(testDir, { recursive: true });
    logger.debug("Cleaned up test directory", { testDir });
  }
});
