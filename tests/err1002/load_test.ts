import { assertRejects } from "@std/assert";
import { BreakdownConfig } from "../../mod.ts";
import { ErrorCode } from "../../src/error_manager.ts";

Deno.test("ERR1002 Load Test - undefined prefix config loading", async () => {
  // Create instance with undefined prefix (string "undefined")
  const config = new BreakdownConfig("undefined");

  await assertRejects(
    async () => {
      await config.loadConfig();
    },
    Error,
    ErrorCode.APP_CONFIG_NOT_FOUND, // ERR1001 because the file won't exist
    "Should throw error when loading config with undefined prefix",
  );
});

Deno.test("ERR1002 Load Test - config loading with invalid file", async () => {
  // First create an invalid config file
  await Deno.mkdir(".agent/breakdown/config", { recursive: true });
  await Deno.writeTextFile(
    ".agent/breakdown/config/test-load-app.yml",
    `
# Invalid YAML content
working_dir: [not-a-string]
app_prompt:
  base_dir: 123
`,
  );

  const config = new BreakdownConfig("test-load");

  try {
    await assertRejects(
      async () => {
        await config.loadConfig();
      },
      Error,
      ErrorCode.APP_CONFIG_INVALID,
      "Should throw ERR1002 when config file has invalid content",
    );
  } finally {
    // Cleanup
    try {
      await Deno.remove(".agent/breakdown/config/test-load-app.yml");
    } catch {
      // Ignore cleanup errors
    }
  }
});
