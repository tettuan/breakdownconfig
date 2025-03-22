import { assertEquals } from "@std/assert";
import { expect } from "@std/expect";
import { BreakdownConfig } from "../../mod.ts";

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

Deno.test("Basic Config Loading - App Config", async () => {
  const testDir = await Deno.makeTempDir();
  try {
    // Setup test environment
    const configDir = `${testDir}/breakdown/config`;
    await Deno.mkdir(configDir, { recursive: true });
    await Deno.writeTextFile(
      `${configDir}/app.yaml`,
      JSON.stringify(TEST_APP_CONFIG),
    );

    const config = new BreakdownConfig(testDir);
    await config.loadConfig();
    const result = await config.getConfig();

    assertEquals(result.working_dir, TEST_APP_CONFIG.working_dir);
    assertEquals(result.app_prompt.base_dir, TEST_APP_CONFIG.app_prompt.base_dir);
    assertEquals(result.app_schema.base_dir, TEST_APP_CONFIG.app_schema.base_dir);
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("Basic Config Loading - Missing App Config", async () => {
  const testDir = await Deno.makeTempDir();
  try {
    // Create directory structure but not the config file
    const configDir = `${testDir}/breakdown/config`;
    await Deno.mkdir(configDir, { recursive: true });

    const config = new BreakdownConfig(testDir);
    await expect(config.loadConfig()).rejects.toThrow("ERR1001");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("Basic Config Loading - User Config Integration", async () => {
  const testDir = await Deno.makeTempDir();
  try {
    // Setup test environment
    const configDir = `${testDir}/breakdown/config`;
    const userConfigDir = `${testDir}/.agent/breakdown/config`;
    await Deno.mkdir(configDir, { recursive: true });
    await Deno.mkdir(userConfigDir, { recursive: true });

    await Deno.writeTextFile(
      `${configDir}/app.yaml`,
      JSON.stringify(TEST_APP_CONFIG),
    );
    await Deno.writeTextFile(
      `${userConfigDir}/user.yaml`,
      JSON.stringify(TEST_USER_CONFIG),
    );

    const config = new BreakdownConfig(testDir);
    await config.loadConfig();
    const result = await config.getConfig();

    // User config should override app config
    assertEquals(result.working_dir, TEST_APP_CONFIG.working_dir);
    assertEquals(result.app_prompt.base_dir, TEST_USER_CONFIG.app_prompt.base_dir);
    assertEquals(result.app_schema.base_dir, TEST_USER_CONFIG.app_schema.base_dir);
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});
