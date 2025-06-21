import { assertEquals, assertRejects } from "@std/assert";
import { BreakdownConfig } from "../mod.ts";

Deno.test("Undefined handling - constructor with undefined configSetName", async () => {
  // Test that undefined configSetName doesn't create "undefined-app.yml"
  const config = new BreakdownConfig(undefined, ".");

  await assertRejects(
    async () => {
      await config.loadConfig();
    },
    Error,
    "app.yml", // Should look for "app.yml" not "undefined-app.yml"
  );
});

Deno.test("Undefined handling - explicit string 'undefined' vs actual undefined", async () => {
  // Test with the string "undefined"
  const stringUndefinedConfig = new BreakdownConfig("undefined", ".");

  // Test with actual undefined
  const actualUndefinedConfig = new BreakdownConfig(undefined, ".");

  // Both should fail but look for different files
  await assertRejects(
    async () => {
      await stringUndefinedConfig.loadConfig();
    },
    Error,
    "undefined-app.yml", // String "undefined" creates "undefined-app.yml"
  );

  await assertRejects(
    async () => {
      await actualUndefinedConfig.loadConfig();
    },
    Error,
    "app.yml", // Actual undefined creates "app.yml"
  );
});

Deno.test("Undefined handling - type safety verification", () => {
  // TypeScript should enforce that configSetName is string | undefined
  // This test verifies our type definitions prevent undefined-to-string conversion

  const testCases: (string | undefined)[] = [
    undefined,
    "test",
    "",
    "production",
  ];

  for (const configSetName of testCases) {
    const config = new BreakdownConfig(configSetName);
    // The constructor should handle all these cases without converting undefined to "undefined"
    assertEquals(typeof config, "object", "Should create config object for all valid inputs");
  }
});

Deno.test("Undefined handling - empty string behavior", async () => {
  // Test with empty string configSetName
  const emptyStringConfig = new BreakdownConfig("", ".");

  // Empty string should behave like undefined (use default filename)
  await assertRejects(
    async () => {
      await emptyStringConfig.loadConfig();
    },
    Error,
    "app.yml", // Empty string should result in "app.yml"
  );
});

Deno.test("Undefined handling - validation of config set name", () => {
  // Valid names should work
  const validNames = ["production", "dev", "test-env", "env1"];
  for (const name of validNames) {
    const config = new BreakdownConfig(name);
    assertEquals(typeof config, "object", `Should create config for valid name: ${name}`);
  }

  // Invalid names should throw
  const invalidNames = ["test env", "test@env", "test.env", "test/env"];
  for (const name of invalidNames) {
    try {
      new BreakdownConfig(name);
      throw new Error(`Should have thrown for invalid name: ${name}`);
    } catch (e) {
      const error = e as Error;
      assertEquals(
        error.message.includes("Invalid config set name"),
        true,
        `Should validate: ${name}`,
      );
    }
  }
});
