/**
 * Test Utilities for BreakdownConfig
 *
 * This file contains:
 * 1. Common test data
 * 2. Helper functions for test setup and cleanup
 * 3. Type definitions for test data
 *
 * Testing Strategy:
 * - Each test file focuses on a specific aspect of the configuration system
 * - Test data is centralized here to ensure consistency
 * - Helper functions handle file operations and cleanup
 */

import { join } from "@std/path";
import { BreakdownLogger } from "@tettuan/breakdownlogger";
import { stringify as stringifyYaml } from "@std/yaml";
import { DefaultPaths } from "../src/types/app_config.ts";

const logger = new BreakdownLogger();

// Test data constants
export const TEST_WORKING_DIR = ".agent/climpt";

// Valid configuration examples
export const validAppConfig = {
  "working_dir": DefaultPaths.WORKING_DIR,
  "app_prompt": {
    "base_dir": DefaultPaths.PROMPT_BASE_DIR,
  },
  "app_schema": {
    "base_dir": DefaultPaths.SCHEMA_BASE_DIR,
  },
};

export const validUserConfig = {
  "app_prompt": {
    "base_dir": "custom/prompts",
  },
};

// Invalid configuration examples
export const invalidAppConfigs = {
  missingWorkingDir: {
    "app_prompt": { "base_dir": DefaultPaths.PROMPT_BASE_DIR },
    "app_schema": { "base_dir": DefaultPaths.SCHEMA_BASE_DIR },
  },
  missingPrompt: {
    "working_dir": DefaultPaths.WORKING_DIR,
    "app_schema": { "base_dir": DefaultPaths.SCHEMA_BASE_DIR },
  },
  missingSchema: {
    "working_dir": DefaultPaths.WORKING_DIR,
    "app_prompt": { "base_dir": DefaultPaths.PROMPT_BASE_DIR },
  },
  invalidTypes: {
    "working_dir": 123,
    "app_prompt": { "base_dir": true },
    "app_schema": { "base_dir": null },
  },
  emptyStrings: {
    "working_dir": "",
    "app_prompt": { "base_dir": DefaultPaths.PROMPT_BASE_DIR },
    "app_schema": { "base_dir": DefaultPaths.SCHEMA_BASE_DIR },
  },
  emptyWorkingDir: {
    "working_dir": "",
    "app_prompt": { "base_dir": DefaultPaths.PROMPT_BASE_DIR },
    "app_schema": { "base_dir": DefaultPaths.SCHEMA_BASE_DIR },
  },
};

// Extra field configurations for testing
export const extraFieldConfigs = {
  rootLevel: {
    "working_dir": DefaultPaths.WORKING_DIR,
    "app_prompt": {
      "base_dir": DefaultPaths.PROMPT_BASE_DIR,
      "extra_field": "extra",
    },
    "app_schema": {
      "base_dir": DefaultPaths.SCHEMA_BASE_DIR,
      "extra_field": "extra",
    },
    "extra_root_field": "extra",
  },
};

/**
 * Creates the test directory structure
 * @returns Object containing paths to created directories
 */
async function createTestDirStructure(): Promise<{
  tempDir: string;
  configDir: string;
  userConfigDir: string;
}> {
  const tempDir = await Deno.makeTempDir();
  logger.debug("Test setup", { tempDir });

  const configDir = join(tempDir, DefaultPaths.WORKING_DIR, "config");
  const userConfigDir = join(tempDir, ".agent", "climpt", "config");

  await Deno.mkdir(configDir, { recursive: true });
  await Deno.mkdir(userConfigDir, { recursive: true });

  logger.debug("Created config directories", { configDir, userConfigDir });

  return { tempDir, configDir, userConfigDir };
}

/**
 * Cleans up test directories
 * @param tempDir - Path to temporary directory to clean up
 */
export async function cleanupTestConfigs(tempDir: string): Promise<void> {
  await Deno.remove(tempDir, { recursive: true });
  logger.debug("Cleaned up test directory", { tempDir });
}

/**
 * Sets up test environment with only app config for basic validation tests
 * @returns Path to temporary directory
 */
export async function setupAppConfigOnly(): Promise<string> {
  const { tempDir, configDir } = await createTestDirStructure();
  const appConfigPath = join(configDir, "app.yml");
  await Deno.writeTextFile(appConfigPath, stringifyYaml(validAppConfig));
  logger.debug("Created app config only", { path: appConfigPath, config: validAppConfig });
  return tempDir;
}

/**
 * Sets up test environment with both app and user configs for merge testing
 * @returns Path to temporary directory
 */
export async function setupMergeConfigs(): Promise<string> {
  const { tempDir, configDir, userConfigDir } = await createTestDirStructure();

  const appConfigPath = join(configDir, "app.yml");
  const userConfigPath = join(userConfigDir, "user.yml");

  await Deno.writeTextFile(appConfigPath, stringifyYaml(validAppConfig));
  await Deno.writeTextFile(userConfigPath, stringifyYaml(validUserConfig));

  logger.debug("Created configs for merge testing", {
    appConfig: { path: appConfigPath, config: validAppConfig },
    userConfig: { path: userConfigPath, config: validUserConfig },
  });

  return tempDir;
}

/**
 * Alias for setupMergeConfigs for convenience in tests
 */
export const setupValidConfig = setupMergeConfigs;

/**
 * Sets up test environment with invalid app config for error testing
 * @param invalidConfig - The invalid configuration to use
 * @returns Path to temporary directory
 */
export async function setupInvalidConfig(invalidConfig: Record<string, unknown>): Promise<string> {
  const { tempDir, configDir } = await createTestDirStructure();
  const appConfigPath = join(configDir, "app.yml");
  await Deno.writeTextFile(appConfigPath, stringifyYaml(invalidConfig));
  logger.debug("Created invalid config", { path: appConfigPath, config: invalidConfig });
  return tempDir;
}

/**
 * Sets up test environment with extra fields in configs for validation testing
 * @returns Path to temporary directory
 */
export async function setupExtraFieldsConfig(): Promise<string> {
  const { tempDir, configDir } = await createTestDirStructure();
  const appConfigPath = join(configDir, "app.yml");
  await Deno.writeTextFile(appConfigPath, stringifyYaml(extraFieldConfigs.rootLevel));
  logger.debug("Created config with extra fields", {
    path: appConfigPath,
    config: extraFieldConfigs.rootLevel,
  });
  return tempDir;
}

/**
 * Sets up test environment with custom configuration set
 * @param prefix - The configuration set prefix (e.g., "production", "staging")
 * @returns Path to temporary directory
 */
export async function setupCustomConfigSet(prefix: string): Promise<string> {
  const { tempDir, configDir } = await createTestDirStructure();

  // Create custom app config
  const appConfigPath = join(configDir, `${prefix}-app.yml`);
  const customAppConfig = {
    "working_dir": DefaultPaths.WORKING_DIR,
    "app_prompt": {
      "base_dir": `${prefix}/prompts`,
    },
    "app_schema": {
      "base_dir": `${prefix}/schemas`,
    },
  };
  await Deno.writeTextFile(appConfigPath, stringifyYaml(customAppConfig));
  logger.debug("Created custom app config", { path: appConfigPath, config: customAppConfig });

  // Create custom user config
  const userConfigPath = join(configDir, `${prefix}-user.yml`);
  const customUserConfig = {
    "app_prompt": {
      "base_dir": `${prefix}/user-prompts`,
    },
  };
  await Deno.writeTextFile(userConfigPath, stringifyYaml(customUserConfig));
  logger.debug("Created custom user config", { path: userConfigPath, config: customUserConfig });

  return tempDir;
}
