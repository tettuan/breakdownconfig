import { assertEquals } from "@std/assert/assert_equals";
import { describe, it } from "@std/testing/bdd";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { BreakdownConfig } from "./breakdown_config.ts";
import { assertRejects } from "@std/assert/assert_rejects";
import {
  afterEach,
  beforeEach,
} from "@std/testing/bdd";

describe('BreakdownConfig', () => {
  const testDir = 'test_config';
  const appConfig = {
    working_dir: 'workspace',
    app_prompt: {
      base_dir: 'prompts',
    },
    app_schema: {
      base_dir: 'schemas',
    },
  };

  beforeEach(async () => {
    // Setup test directories
    await ensureDir(join(testDir, 'breakdown', 'config'));
    await ensureDir(join(testDir, 'workspace', 'config'));

    // Create app.yaml with valid content
    const appConfigPath = join(testDir, 'breakdown', 'config', 'app.yaml');
    await Deno.writeTextFile(appConfigPath, `working_dir: workspace
app_prompt:
  base_dir: prompts
app_schema:
  base_dir: schemas`);
  });

  afterEach(async () => {
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // Ignore errors if directory doesn't exist
    }
  });

  it('should load and merge configurations correctly', async () => {
    // Create user.yaml with custom settings
    const userConfigPath = join(testDir, 'workspace', 'config', 'user.yaml');
    await ensureDir(join(testDir, 'workspace', 'config'));
    await Deno.writeTextFile(userConfigPath, `app_prompt:
  base_dir: custom_prompts
paths:
  - custom_path1
  - custom_path2`);

    const config = new BreakdownConfig(testDir);
    await config.loadConfig();
    const result = await config.getConfig();

    assertEquals(result.working_dir, 'workspace');
    assertEquals(result.app_prompt.base_dir, 'custom_prompts');
    assertEquals(result.app_schema.base_dir, 'schemas');
  });

  it('should use app config when user config is missing', async () => {
    const config = new BreakdownConfig(testDir);
    await config.loadConfig();
    const result = await config.getConfig();

    assertEquals(result.working_dir, 'workspace');
    assertEquals(result.app_prompt.base_dir, 'prompts');
    assertEquals(result.app_schema.base_dir, 'schemas');
  });

  it('should throw error when app config is missing', async () => {
    await Deno.remove(join(testDir, 'breakdown', 'config', 'app.yaml'));
    const config = new BreakdownConfig(testDir);

    await assertRejects(
      async () => {
        await config.loadConfig();
      },
      Error,
      'ERR1001: Application configuration file not found'
    );
  });

  it('should throw error when app config is invalid YAML', async () => {
    const appConfigPath = join(testDir, 'breakdown', 'config', 'app.yaml');
    await Deno.writeTextFile(appConfigPath, 'invalid: yaml: :');
    const config = new BreakdownConfig(testDir);

    await assertRejects(
      async () => {
        await config.loadConfig();
      },
      Error,
      'ERR1002: Invalid application configuration'
    );
  });

  it('should throw error when accessing config before loading', async () => {
    const config = new BreakdownConfig(testDir);
    await assertRejects(
      async () => {
        await config.getConfig();
      },
      Error,
      'Configuration not loaded'
    );
  });
});
