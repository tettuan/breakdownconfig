import { BreakdownConfig } from "../mod.ts";
import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.220.1/assert/mod.ts";
import { afterEach, beforeEach, describe, it } from "https://deno.land/std@0.220.1/testing/bdd.ts";

describe("BreakdownConfig", () => {
  const testDir = "test_config";
  const appConfig = {
    working_dir: "workspace",
    app_prompt: {
      base_dir: "prompts",
    },
    app_schema: {
      base_dir: "schemas",
    },
  };

  beforeEach(async () => {
    // Setup test directories and files
    await Deno.mkdir(`${testDir}/breakdown/config`, { recursive: true });
    await Deno.mkdir(`${testDir}/workspace/config`, { recursive: true });

    // Create app.json
    await Deno.writeTextFile(
      `${testDir}/breakdown/config/app.json`,
      JSON.stringify(appConfig, null, 2),
    );
  });

  afterEach(async () => {
    // Cleanup test directories
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // Ignore errors if directory doesn't exist
    }
  });

  it("should load and merge configurations correctly", async () => {
    // Create user.json with custom settings
    const userConfig = {
      app_prompt: {
        base_dir: "custom_prompts",
      },
    };

    await Deno.writeTextFile(
      `${testDir}/workspace/config/user.json`,
      JSON.stringify(userConfig, null, 2),
    );

    const config = new BreakdownConfig(testDir);
    await config.loadConfig();
    const result = config.getConfig();

    assertEquals(result.working_dir, "workspace");
    assertEquals(result.app_prompt.base_dir, "custom_prompts"); // Should use user config
    assertEquals(result.app_schema.base_dir, "schemas"); // Should use app config
  });

  it("should use app config when user config is missing", async () => {
    const config = new BreakdownConfig(testDir);
    await config.loadConfig();
    const result = config.getConfig();

    assertEquals(result.working_dir, "workspace");
    assertEquals(result.app_prompt.base_dir, "prompts"); // Should use app config
    assertEquals(result.app_schema.base_dir, "schemas");
  });

  it("should throw error when app config is missing", async () => {
    await Deno.remove(`${testDir}/breakdown/config/app.json`);
    const config = new BreakdownConfig(testDir);

    await assertRejects(
      async () => {
        await config.loadConfig();
      },
      Error,
      "Application config file not found",
    );
  });

  it("should throw error when app config is invalid JSON", async () => {
    await Deno.writeTextFile(
      `${testDir}/breakdown/config/app.json`,
      "invalid json",
    );
    const config = new BreakdownConfig(testDir);

    await assertRejects(
      async () => {
        await config.loadConfig();
      },
      Error,
      "Invalid JSON in application config file",
    );
  });

  it("should throw error when accessing config before loading", () => {
    const config = new BreakdownConfig(testDir);

    try {
      config.getConfig();
      throw new Error("Expected getConfig() to throw");
    } catch (error) {
      if (error instanceof Error) {
        assertEquals(error.message, "Configuration not loaded");
      } else {
        throw new Error("Unexpected error type");
      }
    }
  });
}); 