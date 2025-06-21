import { assertRejects } from "@std/assert";
import { BreakdownConfig } from "../../mod.ts";
import { ErrorCode } from "../../src/error_manager.ts";

Deno.test("ERR1002 Malformed Config Test - invalid YAML syntax", async () => {
  // Ensure config directory exists
  await Deno.mkdir(".agent/breakdown/config", { recursive: true });

  // Test 1: Invalid YAML syntax
  const invalidYaml = `
working_dir: "./.agent/breakdown"
app_prompt:
  base_dir: "./.agent/breakdown/prompts/app"
  - invalid list item here
app_schema:
  base_dir: "./.agent/breakdown/schema/app"
`;

  await Deno.writeTextFile(".agent/breakdown/config/malformed1-app.yml", invalidYaml);

  const config1 = new BreakdownConfig("malformed1");

  try {
    await assertRejects(
      async () => {
        await config1.loadConfig();
      },
      Error,
      ErrorCode.APP_CONFIG_INVALID,
      "Should throw ERR1002 when YAML syntax is invalid (list item in wrong place)",
    );
  } finally {
    // Cleanup
    try {
      await Deno.remove(".agent/breakdown/config/malformed1-app.yml");
    } catch {
      // Ignore cleanup errors
    }
  }
});

Deno.test("ERR1002 Malformed Config Test - invalid structure (array instead of object)", async () => {
  // Ensure config directory exists
  await Deno.mkdir(".agent/breakdown/config", { recursive: true });

  // Test 2: Invalid structure (not an object)
  const invalidStructure = `
- item1
- item2
- item3
`;

  await Deno.writeTextFile(".agent/breakdown/config/malformed2-app.yml", invalidStructure);

  const config2 = new BreakdownConfig("malformed2");

  try {
    await assertRejects(
      async () => {
        await config2.loadConfig();
      },
      Error,
      ErrorCode.APP_CONFIG_INVALID,
      "Should throw ERR1002 when config structure is array instead of object",
    );
  } finally {
    // Cleanup
    try {
      await Deno.remove(".agent/breakdown/config/malformed2-app.yml");
    } catch {
      // Ignore cleanup errors
    }
  }
});

Deno.test("ERR1002 Malformed Config Test - invalid field types", async () => {
  // Ensure config directory exists
  await Deno.mkdir(".agent/breakdown/config", { recursive: true });

  // Test 3: Invalid field types
  const invalidTypes = `
working_dir: 123
app_prompt: "should be an object"
app_schema:
  base_dir: true
`;

  await Deno.writeTextFile(".agent/breakdown/config/malformed3-app.yml", invalidTypes);

  const config3 = new BreakdownConfig("malformed3");

  try {
    await assertRejects(
      async () => {
        await config3.loadConfig();
      },
      Error,
      ErrorCode.APP_CONFIG_INVALID,
      "Should throw ERR1002 when field types are invalid (number instead of string, etc.)",
    );
  } finally {
    // Cleanup
    try {
      await Deno.remove(".agent/breakdown/config/malformed3-app.yml");
    } catch {
      // Ignore cleanup errors
    }
  }
});

Deno.test("ERR1002 Malformed Config Test - empty working_dir", async () => {
  // Ensure config directory exists
  await Deno.mkdir(".agent/breakdown/config", { recursive: true });

  // Test 4: Empty working_dir
  const emptyWorkingDir = `
working_dir: ""
app_prompt:
  base_dir: "./.agent/breakdown/prompts/app"
app_schema:
  base_dir: "./.agent/breakdown/schema/app"
`;

  await Deno.writeTextFile(".agent/breakdown/config/malformed4-app.yml", emptyWorkingDir);

  const config4 = new BreakdownConfig("malformed4");

  try {
    await assertRejects(
      async () => {
        await config4.loadConfig();
      },
      Error,
      ErrorCode.APP_CONFIG_INVALID,
      "Should throw ERR1002 when working_dir is empty",
    );
  } finally {
    // Cleanup
    try {
      await Deno.remove(".agent/breakdown/config/malformed4-app.yml");
    } catch {
      // Ignore cleanup errors
    }
  }
});
