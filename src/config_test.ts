import { assertEquals } from "@std/assert/assert_equals";
import { describe, it } from "@std/testing/bdd";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { BreakdownConfig } from "./breakdown_config.ts";
import { assertRejects } from "@std/assert/assert_rejects";
import { afterEach, beforeEach } from "@std/testing/bdd";
import { BreakdownLogger } from "@tettuan/breakdownlogger";

const logger = new BreakdownLogger();

describe("BreakdownConfig", () => {
  const testDir = "test_config";
  const _appConfig = {
    working_dir: "workspace",
    app_prompt: {
      base_dir: "prompts",
    },
    app_schema: {
      base_dir: "schemas",
    },
  };

  beforeEach(async () => {
    // Setup test directories
    await ensureDir(join(testDir, "breakdown", "config"));
    await ensureDir(join(testDir, ".agent", "breakdown", "config"));

    // Create app.yml with valid content
    const appConfigPath = join(testDir, "breakdown", "config", "app.yml");
    await Deno.writeTextFile(
      appConfigPath,
      `working_dir: workspace
app_prompt:
  base_dir: prompts
app_schema:
  base_dir: schemas`,
    );
    logger.debug("Created app config", { path: appConfigPath });
  });

  afterEach(async () => {
    try {
      await Deno.remove(testDir, { recursive: true });
      logger.debug("Cleaned up test directory", { testDir });
    } catch {
      // Ignore errors if directory doesn't exist
    }
  });

  it("should load and merge configurations correctly", async () => {
    // Create user.yml with custom settings
    const userConfigPath = join(testDir, ".agent", "breakdown", "config", "user.yml");
    await ensureDir(join(testDir, ".agent", "breakdown", "config"));
    await Deno.writeTextFile(
      userConfigPath,
      `app_prompt:
  base_dir: custom/prompts
paths:
  - custom_path1
  - custom_path2`,
    );
    logger.debug("Created user config", { path: userConfigPath });

    const config = new BreakdownConfig(testDir);
    logger.debug("Created BreakdownConfig instance", { baseDir: testDir });

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
  });

  it("should use app config when user config is missing", async () => {
    const config = new BreakdownConfig(testDir);
    logger.debug("Created BreakdownConfig instance", { baseDir: testDir });

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
  });

  it("should throw error when app config is missing", async () => {
    await Deno.remove(join(testDir, "breakdown", "config", "app.yml"));
    const config = new BreakdownConfig(testDir);
    logger.debug("Attempting to load config without app config file");

    await assertRejects(
      async () => {
        await config.loadConfig();
      },
      Error,
      "ERR1001: Application configuration file not found",
    );
    logger.debug("Successfully caught expected error");
  });

  it("should throw error when app config is invalid YAML", async () => {
    const appConfigPath = join(testDir, "breakdown", "config", "app.yml");
    await Deno.writeTextFile(appConfigPath, "invalid: yaml: :");
    const config = new BreakdownConfig(testDir);
    logger.debug("Attempting to load config with invalid YAML");

    await assertRejects(
      async () => {
        await config.loadConfig();
      },
      Error,
      "ERR1002: Invalid application configuration",
    );
    logger.debug("Successfully caught expected error");
  });

  it("should throw error when accessing config before loading", async () => {
    const config = new BreakdownConfig(testDir);
    logger.debug("Attempting to access config before loading");

    await assertRejects(
      async () => {
        await config.getConfig();
      },
      Error,
      "Configuration not loaded",
    );
    logger.debug("Successfully caught expected error");
  });
});
