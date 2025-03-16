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

import { join } from 'std/path/mod.ts';
import { debug } from '../utils/debug-logger.ts';

// Test data constants
export const TEST_WORKING_DIR = '.agent/breakdown';

// Valid configuration examples
export const validAppConfig = {
  working_dir: './.agent/breakdown',
  app_prompt: {
    base_dir: './prompts',
  },
  app_schema: {
    base_dir: './schemas',
  },
};

export const validUserConfig = {
  app_prompt: {
    base_dir: './custom/prompts',
  },
};

// Invalid configuration examples
export const invalidAppConfigs = {
  missingWorkingDir: {
    app_prompt: { base_dir: './prompts' },
    app_schema: { base_dir: './schemas' },
  },
  missingPrompt: {
    working_dir: './.agent/breakdown',
    app_schema: { base_dir: './schemas' },
  },
  missingSchema: {
    working_dir: './.agent/breakdown',
    app_prompt: { base_dir: './prompts' },
  },
  invalidTypes: {
    working_dir: 123,
    app_prompt: { base_dir: true },
    app_schema: { base_dir: null },
  },
};

// Extra fields configuration examples
export const extraFieldConfigs = {
  rootLevel: {
    working_dir: './.agent/breakdown',
    app_prompt: {
      base_dir: './prompts',
    },
    app_schema: {
      base_dir: './schemas',
    },
    extra_field: 'should be ignored',
    another_extra: {
      nested: 'value',
    },
  },
  nestedLevel: {
    working_dir: './.agent/breakdown',
    app_prompt: {
      base_dir: './prompts',
      unknown_setting: true,
      extra: {
        deeply: {
          nested: 'value',
        },
      },
    },
    app_schema: {
      base_dir: './schemas',
      custom_option: 123,
    },
  },
  emptyStrings: {
    working_dir: '',
    app_prompt: {
      base_dir: '',
    },
    app_schema: {
      base_dir: './schemas',
    },
  },
};

/**
 * Creates temporary configuration files for testing
 *
 * @param appConfig - Application configuration object
 * @param userConfig - User configuration object
 * @param workingDir - Working directory path
 * @returns Path to temporary directory
 */
export async function setupTestConfigs(
  appConfig: Record<string, unknown> | null,
  userConfig: Record<string, unknown> | null,
  workingDir: string,
): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  debug(`Created temporary directory: ${tempDir}`);

  const appConfigDir = join(tempDir, 'breakdown', 'config');
  const userConfigDir = join(tempDir, workingDir, 'config');

  // Create directories
  await Deno.mkdir(appConfigDir, { recursive: true });
  await Deno.mkdir(userConfigDir, { recursive: true });
  debug(`Created config directories: ${appConfigDir}, ${userConfigDir}`);

  // Write app config if provided
  if (appConfig) {
    const appConfigPath = join(appConfigDir, 'app.json');
    await Deno.writeTextFile(appConfigPath, JSON.stringify(appConfig));
    debug(`Created app config: ${appConfigPath}`);
  }

  // Write user config if provided
  if (userConfig) {
    const userConfigPath = join(userConfigDir, 'user.json');
    await Deno.writeTextFile(userConfigPath, JSON.stringify(userConfig));
    debug(`Created user config: ${userConfigPath}`);
  }

  return tempDir;
}

/**
 * Cleans up temporary test files and directories
 *
 * @param tempDir - Path to temporary directory to clean up
 */
export async function cleanupTestConfigs(tempDir: string): Promise<void> {
  try {
    await Deno.remove(tempDir, { recursive: true });
    debug(`Cleaned up temporary directory: ${tempDir}`);
  } catch (error) {
    if (error instanceof Error) {
      debug(`Failed to clean up directory ${tempDir}: ${error.message}`);
    } else {
      debug(`Failed to clean up directory ${tempDir}: Unknown error`);
    }
  }
}
