import { assertRejects } from "@std/assert";
import { BreakdownConfig } from "../../mod.ts";
import { ErrorCode } from "../../src/error_manager.ts";

Deno.test("ERR1002 Undefined Prefix Test - string 'undefined' as prefix", async () => {
  // Test when prefix is the literal string "undefined"
  const config = new BreakdownConfig("undefined");

  // This should trigger ERR1001 (file not found) first, not ERR1002
  await assertRejects(
    async () => {
      await config.loadConfig();
    },
    Error,
    ErrorCode.APP_CONFIG_NOT_FOUND,
    "Should throw ERR1001 when undefined-app.yml file doesn't exist",
  );
});

Deno.test("ERR1002 Undefined Prefix Test - with invalid config file", async () => {
  // Create invalid config file for undefined prefix
  await Deno.mkdir(".agent/breakdown/config", { recursive: true });
  await Deno.writeTextFile(
    ".agent/breakdown/config/undefined-app.yml",
    `
# Invalid config that should trigger ERR1002
working_dir: 
app_prompt:
  # missing base_dir
app_schema:
  base_dir: 
`,
  );

  const config = new BreakdownConfig("undefined");

  try {
    await assertRejects(
      async () => {
        await config.loadConfig();
      },
      Error,
      ErrorCode.APP_CONFIG_INVALID,
      "Should throw ERR1002 when undefined config file has invalid content",
    );
  } finally {
    // Cleanup
    try {
      await Deno.remove(".agent/breakdown/config/undefined-app.yml");
    } catch {
      // Ignore cleanup errors
    }
  }
});

Deno.test("ERR1002 Undefined Prefix Test - empty baseDir behavior", async () => {
  // Test with empty baseDir (converted to empty string)
  const config = new BreakdownConfig("", "test-undefined");

  await assertRejects(
    async () => {
      await config.loadConfig();
    },
    Error,
    ErrorCode.APP_CONFIG_NOT_FOUND,
    "Should throw error when config file doesn't exist with empty baseDir",
  );
});
