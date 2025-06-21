import { assertRejects } from "@std/assert";
import { BreakdownConfig } from "../../mod.ts";
import { ErrorCode } from "../../src/error_manager.ts";

Deno.test("ERR1002 Invalid YAML Test - malformed YAML syntax", async () => {
  // Create config directory
  await Deno.mkdir(".agent/breakdown/config", { recursive: true });

  // Create an invalid YAML file (more clearly invalid syntax)
  const invalidYaml = `
working_dir: "./.agent/breakdown"
app_prompt:
  base_dir: "./.agent/breakdown/prompts/app"
  [ invalid YAML here
app_schema:
  base_dir: "./.agent/breakdown/schema/app"
`;

  await Deno.writeTextFile(".agent/breakdown/config/yaml-test-app.yml", invalidYaml);

  const config = new BreakdownConfig("yaml-test");

  try {
    await assertRejects(
      async () => {
        await config.loadConfig();
      },
      Error,
      ErrorCode.APP_CONFIG_INVALID,
      "Should throw ERR1002 when YAML syntax is invalid",
    );
  } finally {
    // Cleanup
    try {
      await Deno.remove(".agent/breakdown/config/yaml-test-app.yml");
    } catch {
      // Ignore cleanup errors
    }
  }
});

Deno.test("ERR1002 Invalid YAML Test - valid YAML but invalid structure", async () => {
  // Create config directory
  await Deno.mkdir(".agent/breakdown/config", { recursive: true });

  // Create YAML with valid syntax but invalid structure (array instead of object)
  const invalidStructure = `
- item1
- item2
- item3
`;

  await Deno.writeTextFile(".agent/breakdown/config/structure-test-app.yml", invalidStructure);

  const config = new BreakdownConfig("structure-test");

  try {
    await assertRejects(
      async () => {
        await config.loadConfig();
      },
      Error,
      ErrorCode.APP_CONFIG_INVALID,
      "Should throw ERR1002 when config structure is invalid (array instead of object)",
    );
  } finally {
    // Cleanup
    try {
      await Deno.remove(".agent/breakdown/config/structure-test-app.yml");
    } catch {
      // Ignore cleanup errors
    }
  }
});

Deno.test("ERR1002 Invalid YAML Test - missing required fields", async () => {
  // Create config directory
  await Deno.mkdir(".agent/breakdown/config", { recursive: true });

  // Create YAML with missing required fields
  const missingFields = `
# Missing working_dir
app_prompt:
  # Missing base_dir
app_schema:
  # Missing base_dir
`;

  await Deno.writeTextFile(".agent/breakdown/config/missing-test-app.yml", missingFields);

  const config = new BreakdownConfig("missing-test");

  try {
    await assertRejects(
      async () => {
        await config.loadConfig();
      },
      Error,
      ErrorCode.APP_CONFIG_INVALID,
      "Should throw ERR1002 when required fields are missing",
    );
  } finally {
    // Cleanup
    try {
      await Deno.remove(".agent/breakdown/config/missing-test-app.yml");
    } catch {
      // Ignore cleanup errors
    }
  }
});
