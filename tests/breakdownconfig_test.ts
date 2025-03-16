/**
 * Test suite for BreakdownConfig
 * 
 * Test Categories:
 * 1. Configuration Loading
 *    - Application config loading
 *    - User config loading
 *    - Config merging
 * 2. Path Resolution
 *    - Relative paths
 *    - Base directory handling
 * 3. Validation
 *    - Required fields
 *    - Type checking
 *    - JSON structure
 * 4. Error Handling
 *    - Missing files
 *    - Invalid JSON
 *    - Invalid configurations
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

const invalidAppConfigs = {
  missingWorkingDir: {
    app_prompt: { base_dir: "./prompts" },
    app_schema: { base_dir: "./schemas" }
  },
  missingPrompt: {
    working_dir: "./.agent/breakdown",
    app_schema: { base_dir: "./schemas" }
  },
  missingSchema: {
    working_dir: "./.agent/breakdown",
    app_prompt: { base_dir: "./prompts" }
  },
  invalidTypes: {
    working_dir: 123,
    app_prompt: { base_dir: true },
    app_schema: { base_dir: null }
  }
};

const extraFieldConfigs = {
  rootLevel: {
    working_dir: "./.agent/breakdown",
    app_prompt: {
      base_dir: "./prompts"
    },
    app_schema: {
      base_dir: "./schemas"
    },
    extra_field: "should be ignored",
    another_extra: {
      nested: "value"
    }
  },
  nestedLevel: {
    working_dir: "./.agent/breakdown",
    app_prompt: {
      base_dir: "./prompts",
      unknown_setting: true,
      extra: {
        deeply: {
          nested: "value"
        }
      }
    },
    app_schema: {
      base_dir: "./schemas",
      custom_option: 123
    }
  },
  emptyStrings: {
    working_dir: "",
    app_prompt: {
      base_dir: ""
    },
    app_schema: {
      base_dir: "./schemas"
    }
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
 * Test Category 1: Configuration Loading
 */
Deno.test({
  name: "1.1 Should load valid app config without user config",
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

Deno.test({
  name: "1.2 Should merge app config with user config",
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
 * Test Category 2: Path Resolution
 */
Deno.test({
  name: "2.1 Should handle relative paths correctly",
  async fn() {
    const workingDir = ".agent/breakdown";
    const tempDir = await setupTestConfigs(validAppConfig, null, workingDir);

    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = config.getConfig();

      assertEquals(result.working_dir, "./.agent/breakdown");
      assertEquals(result.app_prompt.base_dir, "./prompts");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  }
});

Deno.test({
  name: "2.2 Should handle base directory correctly",
  async fn() {
    const workingDir = ".agent/breakdown";
    const tempDir = await setupTestConfigs(validAppConfig, validUserConfig, workingDir);

    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      // Verify that the config file exists in the correct location
      const configPath = join(tempDir, "breakdown", "config", "app.json");
      const fileInfo = await Deno.stat(configPath);
      assertEquals(fileInfo.isFile, true);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  }
});

/**
 * Test Category 3: Validation
 */
Deno.test({
  name: "3.1 Should validate required fields",
  async fn() {
    const workingDir = ".agent/breakdown";
    
    for (const [key, invalidConfig] of Object.entries(invalidAppConfigs)) {
      const tempDir = await setupTestConfigs(invalidConfig, null, workingDir);

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
  }
});

Deno.test({
  name: "3.2 Should validate JSON structure",
  async fn() {
    const workingDir = ".agent/breakdown";
    const tempDir = await setupTestConfigs(null, null, workingDir);
    const appConfigPath = join(tempDir, "breakdown", "config");
    
    await Deno.mkdir(appConfigPath, { recursive: true });
    await Deno.writeTextFile(
      join(appConfigPath, "app.json"),
      "invalid json content"
    );

    try {
      const config = new BreakdownConfig(tempDir);
      await assertRejects(
        () => config.loadConfig(),
        Error,
        "Invalid JSON in application config file"
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  }
});

Deno.test({
  name: "3.3 Should accept extra configuration fields",
  async fn() {
    const workingDir = ".agent/breakdown";
    
    // Test root level extra fields
    let tempDir = await setupTestConfigs(extraFieldConfigs.rootLevel, null, workingDir);
    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = config.getConfig();
      
      // Verify that required fields are present and correct
      assertEquals(result.working_dir, extraFieldConfigs.rootLevel.working_dir);
      assertEquals(result.app_prompt.base_dir, extraFieldConfigs.rootLevel.app_prompt.base_dir);
      assertEquals(result.app_schema.base_dir, extraFieldConfigs.rootLevel.app_schema.base_dir);
      
      // Verify that extra fields are not included in the result
      assertEquals(
        Object.keys(result).sort(),
        ["working_dir", "app_prompt", "app_schema"].sort()
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }

    // Test nested level extra fields
    tempDir = await setupTestConfigs(extraFieldConfigs.nestedLevel, null, workingDir);
    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = config.getConfig();
      
      // Verify that only expected fields are present in nested objects
      assertEquals(Object.keys(result.app_prompt), ["base_dir"]);
      assertEquals(Object.keys(result.app_schema), ["base_dir"]);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  }
});

Deno.test({
  name: "3.4 Should reject empty working directory",
  async fn() {
    const workingDir = ".agent/breakdown";
    const tempDir = await setupTestConfigs(extraFieldConfigs.emptyStrings, null, workingDir);

    try {
      const config = new BreakdownConfig(tempDir);
      await assertRejects(
        () => config.loadConfig(),
        Error,
        "Working directory not set"
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  }
});

/**
 * Test Category 4: Error Handling
 */
Deno.test({
  name: "4.1 Should handle missing config files appropriately",
  async fn() {
    const workingDir = ".agent/breakdown";
    const tempDir = await setupTestConfigs(null, null, workingDir);

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

Deno.test({
  name: "4.2 Should handle missing user config gracefully",
  async fn() {
    const workingDir = ".agent/breakdown";
    const tempDir = await setupTestConfigs(validAppConfig, null, workingDir);

    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = config.getConfig();

      assertEquals(result.working_dir, validAppConfig.working_dir);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  }
}); 