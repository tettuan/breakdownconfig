import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/testing/asserts.ts";
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
  const encoder = new TextEncoder();
  
  // Create directories
  await Deno.mkdir("/breakdown/config", { recursive: true });
  await Deno.mkdir(`${workingDir}/config`, { recursive: true });

  // Write app config if provided
  if (appConfig) {
    await Deno.writeFile(
      "/breakdown/config/app.json",
      encoder.encode(JSON.stringify(appConfig))
    );
  }

  // Write user config if provided
  if (userConfig) {
    await Deno.writeFile(
      `${workingDir}/config/user.json`,
      encoder.encode(JSON.stringify(userConfig))
    );
  }
}

// Helper function to cleanup test files
async function cleanupTestConfigs(workingDir: string) {
  try {
    await Deno.remove("/breakdown/config", { recursive: true });
    await Deno.remove(workingDir, { recursive: true });
  } catch (_) {
    // Ignore cleanup errors
  }
}

Deno.test({
  name: "BreakdownConfig - Should load valid app config without user config",
  async fn() {
    const workingDir = "./.agent/breakdown";
    await setupTestConfigs(validAppConfig, null, workingDir);

    try {
      const config = new BreakdownConfig();
      await config.loadConfig();
      const result = config.getConfig();

      assertEquals(result.working_dir, validAppConfig.working_dir);
      assertEquals(result.app_prompt.base_dir, validAppConfig.app_prompt.base_dir);
      assertEquals(result.app_schema.base_dir, validAppConfig.app_schema.base_dir);
    } finally {
      await cleanupTestConfigs(workingDir);
    }
  }
});

Deno.test({
  name: "BreakdownConfig - Should merge app config with user config",
  async fn() {
    const workingDir = "./.agent/breakdown";
    await setupTestConfigs(validAppConfig, validUserConfig, workingDir);

    try {
      const config = new BreakdownConfig();
      await config.loadConfig();
      const result = config.getConfig();

      assertEquals(result.working_dir, validAppConfig.working_dir);
      assertEquals(result.app_prompt.base_dir, validUserConfig.app_prompt.base_dir);
      assertEquals(result.app_schema.base_dir, validAppConfig.app_schema.base_dir);
    } finally {
      await cleanupTestConfigs(workingDir);
    }
  }
});

Deno.test({
  name: "BreakdownConfig - Should throw error when app config is missing",
  async fn() {
    const workingDir = "./.agent/breakdown";
    await setupTestConfigs(null, validUserConfig, workingDir);

    try {
      const config = new BreakdownConfig();
      await assertThrows(
        async () => {
          await config.loadConfig();
        },
        Error,
        "Application config file not found"
      );
    } finally {
      await cleanupTestConfigs(workingDir);
    }
  }
});

Deno.test({
  name: "BreakdownConfig - Should throw error when required fields are missing",
  async fn() {
    const workingDir = "./.agent/breakdown";
    const invalidAppConfig = {
      working_dir: "./.agent/breakdown"
      // Missing app_prompt and app_schema
    };
    
    await setupTestConfigs(invalidAppConfig, null, workingDir);

    try {
      const config = new BreakdownConfig();
      await assertThrows(
        async () => {
          await config.loadConfig();
        },
        Error,
        "Missing required fields in application config"
      );
    } finally {
      await cleanupTestConfigs(workingDir);
    }
  }
});

Deno.test({
  name: "BreakdownConfig - Should ignore missing user config",
  async fn() {
    const workingDir = "./.agent/breakdown";
    await setupTestConfigs(validAppConfig, null, workingDir);

    try {
      const config = new BreakdownConfig();
      await config.loadConfig();
      const result = config.getConfig();

      assertEquals(result.working_dir, validAppConfig.working_dir);
      assertEquals(result.app_prompt.base_dir, validAppConfig.app_prompt.base_dir);
      assertEquals(result.app_schema.base_dir, validAppConfig.app_schema.base_dir);
    } finally {
      await cleanupTestConfigs(workingDir);
    }
  }
}); 