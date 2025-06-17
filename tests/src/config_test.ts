import { assertEquals } from "@std/assert/assert_equals";
import { describe, it } from "@std/testing/bdd";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { assertRejects } from "@std/assert/assert_rejects";
import { afterEach, beforeEach } from "@std/testing/bdd";
import { BreakdownLogger } from "@tettuan/breakdownlogger";
import { DefaultPaths } from "../../src/types/app_config.ts";

const logger = new BreakdownLogger();

const _TEST_CONFIG = {
  working_dir: DefaultPaths.WORKING_DIR,
  app_prompt: {
    base_dir: DefaultPaths.PROMPT_BASE_DIR,
  },
  app_schema: {
    base_dir: DefaultPaths.SCHEMA_BASE_DIR,
  },
};

describe("BreakdownConfig", () => {
  const testDir = "test_config";

  beforeEach(async () => {
    // Setup test directories
    await ensureDir(join(testDir, ".agent", "breakdown", "config"));

    // Create app.yml with valid content
    const appConfigPath = join(testDir, ".agent", "breakdown", "config", "app.yml");
    await Deno.writeTextFile(
      appConfigPath,
      `working_dir: ${DefaultPaths.WORKING_DIR}
app_prompt:
  base_dir: ${DefaultPaths.PROMPT_BASE_DIR}
app_schema:
  base_dir: ${DefaultPaths.SCHEMA_BASE_DIR}`,
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
    const config = new BreakdownConfig(undefined, testDir);
    await config.loadConfig();
    const result = await config.getConfig();

    assertEquals(result.working_dir, DefaultPaths.WORKING_DIR);
    assertEquals(result.app_prompt.base_dir, DefaultPaths.PROMPT_BASE_DIR);
    assertEquals(result.app_schema.base_dir, DefaultPaths.SCHEMA_BASE_DIR);
  });

  it("should use app config when user config is missing", async () => {
    const config = new BreakdownConfig(undefined, testDir);
    await config.loadConfig();
    const result = await config.getConfig();

    assertEquals(result.working_dir, DefaultPaths.WORKING_DIR);
    assertEquals(result.app_prompt.base_dir, DefaultPaths.PROMPT_BASE_DIR);
    assertEquals(result.app_schema.base_dir, DefaultPaths.SCHEMA_BASE_DIR);
  });

  it("should throw error when app config is missing", async () => {
    await Deno.remove(join(testDir, ".agent", "breakdown", "config", "app.yml"));
    const config = new BreakdownConfig(undefined, testDir);
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
    const appConfigPath = join(testDir, ".agent", "breakdown", "config", "app.yml");
    await Deno.writeTextFile(appConfigPath, "invalid: yaml: :");
    const config = new BreakdownConfig(undefined, testDir);
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
    const config = new BreakdownConfig(undefined, testDir);
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
