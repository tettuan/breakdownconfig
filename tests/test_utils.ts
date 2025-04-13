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

const logger = new BreakdownLogger();

// Test data constants
export const TEST_WORKING_DIR = "workspace";

// Valid configuration examples
export const validAppConfig = {
  working_dir: "workspace",
  app_prompt: {
    base_dir: "prompts",
  },
  app_schema: {
    base_dir: "schemas",
  },
};

export const validUserConfig = {
  app_prompt: {
    base_dir: "custom/prompts",
  },
};

// Invalid configuration examples
export const invalidAppConfigs = {
  missingWorkingDir: {
    app_prompt: { base_dir: "prompts" },
    app_schema: { base_dir: "schemas" },
  },
  missingPrompt: {
    working_dir: "workspace",
    app_schema: { base_dir: "schemas" },
  },
  missingSchema: {
    working_dir: "workspace",
    app_prompt: { base_dir: "prompts" },
  },
  invalidTypes: {
    working_dir: 123,
    app_prompt: { base_dir: true },
    app_schema: { base_dir: null },
  },
  emptyStrings: {
    working_dir: "",
    app_prompt: { base_dir: "prompts" },
    app_schema: { base_dir: "schemas" },
  },
};

// Extra fields configuration examples
export const extraFieldConfigs = {
  rootLevel: {
    working_dir: "workspace",
    app_prompt: {
      base_dir: "prompts",
    },
    app_schema: {
      base_dir: "schemas",
    },
    extra_field: "should be ignored",
    another_extra: {
      nested: "value",
    },
  },
  nestedLevel: {
    working_dir: "workspace",
    app_prompt: {
      base_dir: "prompts",
      unknown_setting: true,
      extra: {
        deeply: {
          nested: "value",
        },
      },
    },
    app_schema: {
      base_dir: "schemas",
      custom_option: 123,
    },
  },
};

/**
 * Creates a base temporary test directory structure
 * @returns Path to temporary directory with created config directories
 */
async function createTestDirStructure(): Promise<
  { tempDir: string; configDir: string; userConfigDir: string }
> {
  const tempDir = await Deno.makeTempDir();
  logger.debug("Test setup", { tempDir });

  const configDir = join(tempDir, "breakdown", "config");
  const userConfigDir = join(tempDir, ".agent", "breakdown", "config");

  await Deno.mkdir(configDir, { recursive: true });
  await Deno.mkdir(userConfigDir, { recursive: true });
  logger.debug("Created config directories", { configDir, userConfigDir });

  return { tempDir, configDir, userConfigDir };
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
 * Cleans up temporary test files and directories
 * @param tempDir - Path to temporary directory to clean up
 */
export async function cleanupTestConfigs(tempDir: string): Promise<void> {
  try {
    await Deno.remove(tempDir, { recursive: true });
    logger.debug("Cleaned up test directory", { tempDir });
  } catch (error) {
    logger.error("Failed to clean up test directory", { tempDir, error });
  }
}
