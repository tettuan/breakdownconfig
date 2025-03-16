/**
 * Test suite for BreakdownConfig
 * 
 * Purpose:
 * - Verify the configuration loading and merging functionality
 * - Ensure proper handling of missing or invalid configurations
 * - Validate the configuration structure enforcement
 * 
 * Design Requirements:
 * - Application config must be in breakdown/config/app.json
 * - User config must be in $working_dir/config/user.json
 * - Application config is required and must have all fields
 * - User config is optional and can override app_prompt and app_schema
 */

import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { join } from "std/path/mod.ts";
import { BreakdownConfig } from "../src/mod.ts";

// Test data setup
const validAppConfig = {
  working_dir: "./.agent/breakdown",
  app_prompt: {
    base_dir: "./prompts"
  },
  app_schema: {
    base_dir: "./schemas"
  }
};

const validUserConfig = {
  app_prompt: {
    base_dir: "./custom/prompts"
  }
};

// Helper function to create temporary config files
async function setupTestConfigs(
  appConfig: Record<string, unknown> | null,
  userConfig: Record<string, unknown> | null,
  workingDir: string
) {
  const tempDir = await Deno.makeTempDir();
  const appConfigDir = join(tempDir, "breakdown", "config");
  const userConfigDir = join(tempDir, workingDir, "config");
  
  // Create directories
  await Deno.mkdir(appConfigDir, { recursive: true });
  await Deno.mkdir(userConfigDir, { recursive: true });

  // Write app config if provided
  if (appConfig) {
    await Deno.writeTextFile(
      join(appConfigDir, "app.json"),
      JSON.stringify(appConfig)
    );
  }

  // Write user config if provided
  if (userConfig) {
    await Deno.writeTextFile(
      join(userConfigDir, "user.json"),
      JSON.stringify(userConfig)
    );
  }

  return tempDir;
}

// Helper function to cleanup test files
async function cleanupTestConfigs(tempDir: string) {
  try {
    await Deno.remove(tempDir, { recursive: true });
  } catch (_) {
    // Ignore cleanup errors
  }
}

/**
 * Test: Basic application config loading
 * Success criteria:
 * - Config is loaded from the correct path
 * - All required fields are present in the result
 * - Values match the input configuration
 */
Deno.test({
  name: "BreakdownConfig - Should load valid app config without user config",
  async fn() {
    const workingDir = ".agent/breakdown";
    const tempDir = await setupTestConfigs(validAppConfig, null, workingDir);

    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = config.getConfig();

      assertEquals(result.working_dir, validAppConfig.working_dir);
      assertEquals(result.app_prompt.base_dir, validAppConfig.app_prompt.base_dir);
      assertEquals(result.app_schema.base_dir, validAppConfig.app_schema.base_dir);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  }
});

/**
 * Test: Configuration merging
 * Success criteria:
 * - User config values override application config values
 * - Non-overridden values remain from application config
 * - working_dir is not affected by user config
 */
Deno.test({
  name: "BreakdownConfig - Should merge app config with user config",
  async fn() {
    const workingDir = ".agent/breakdown";
    const tempDir = await setupTestConfigs(validAppConfig, validUserConfig, workingDir);

    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = config.getConfig();

      assertEquals(result.working_dir, validAppConfig.working_dir);
      assertEquals(result.app_prompt.base_dir, validUserConfig.app_prompt.base_dir);
      assertEquals(result.app_schema.base_dir, validAppConfig.app_schema.base_dir);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  }
});

/**
 * Test: Missing application config
 * Success criteria:
 * - Appropriate error is thrown when app config file is missing
 * - Error message is clear and descriptive
 */
Deno.test({
  name: "BreakdownConfig - Should throw error when app config is missing",
  async fn() {
    const workingDir = ".agent/breakdown";
    const tempDir = await setupTestConfigs(null, validUserConfig, workingDir);

    try {
      const config = new BreakdownConfig(tempDir);
      await assertRejects(
        () => config.loadConfig(),
        Error,
        "Application config file not found"
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  }
});

/**
 * Test: Invalid application config
 * Success criteria:
 * - Appropriate error is thrown when required fields are missing
 * - Validation catches missing app_prompt and app_schema
 */
Deno.test({
  name: "BreakdownConfig - Should throw error when required fields are missing",
  async fn() {
    const workingDir = ".agent/breakdown";
    const invalidAppConfig = {
      working_dir: "./.agent/breakdown"
      // Missing app_prompt and app_schema
    };
    
    const tempDir = await setupTestConfigs(invalidAppConfig, null, workingDir);

    try {
      const config = new BreakdownConfig(tempDir);
      await assertRejects(
        () => config.loadConfig(),
        Error,
        "Missing required fields in application config"
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  }
});

/**
 * Test: Missing user config
 * Success criteria:
 * - No error is thrown when user config is missing
 * - All values from application config are used
 */
Deno.test({
  name: "BreakdownConfig - Should ignore missing user config",
  async fn() {
    const workingDir = ".agent/breakdown";
    const tempDir = await setupTestConfigs(validAppConfig, null, workingDir);

    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = config.getConfig();

      assertEquals(result.working_dir, validAppConfig.working_dir);
      assertEquals(result.app_prompt.base_dir, validAppConfig.app_prompt.base_dir);
      assertEquals(result.app_schema.base_dir, validAppConfig.app_schema.base_dir);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  }
}); 