/**
 * Helper functions for error handling integration tests
 */

import { join } from "@std/path";
import { ensureDir } from "@std/fs";

export async function setupInvalidYamlFile(invalidYaml: string): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  const configDir = join(tempDir, ".agent", "breakdown", "config");
  await ensureDir(configDir);

  // Write invalid YAML
  await Deno.writeTextFile(join(configDir, "app.yml"), invalidYaml);

  return tempDir;
}

export async function setupMixedValidInvalidConfig(): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  const configDir = join(tempDir, ".agent", "breakdown", "config");
  await ensureDir(configDir);

  // Valid app config
  const validAppYaml = `
working_dir: ".agent/breakdown"
app_prompt:
  base_dir: "prompts"
app_schema:
  base_dir: "schemas"
`;
  await Deno.writeTextFile(join(configDir, "app.yml"), validAppYaml);

  // Invalid user config
  const invalidUserYaml = "invalid: yaml: [unclosed";
  await Deno.writeTextFile(join(configDir, "user.yml"), invalidUserYaml);

  return tempDir;
}

export async function fixConfiguration(tempDir: string): Promise<void> {
  const configDir = join(tempDir, ".agent", "breakdown", "config");
  const validConfig = `
working_dir: ".agent/breakdown"
app_prompt:
  base_dir: "prompts"
app_schema:
  base_dir: "schemas"
`;
  await Deno.writeTextFile(join(configDir, "app.yml"), validConfig);
}
