/**
 * Error Handling Tests
 *
 * Purpose:
 * Test the error handling capabilities of the configuration system
 *
 * Test Cases:
 * 1. Missing config files
 * 2. Missing user config
 *
 * Success Criteria:
 * - Appropriate errors are thrown for missing files
 * - Missing user config is handled gracefully
 * - Error messages are clear and descriptive
 */

import { assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { cleanupTestConfigs, invalidAppConfigs, setupInvalidConfig } from "../test_utils.ts";

describe("Error Handling", () => {
  it("should handle missing working directory", async () => {
    const tempDir = await setupInvalidConfig(invalidAppConfigs.missingWorkingDir);
    try {
      const config = new BreakdownConfig(undefined, tempDir);
      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
        "ERR1002: Invalid application configuration",
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should handle missing app prompt", async () => {
    const tempDir = await setupInvalidConfig(invalidAppConfigs.missingPrompt);
    try {
      const config = new BreakdownConfig(undefined, tempDir);
      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
        "ERR1002: Invalid application configuration",
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should handle missing app schema", async () => {
    const tempDir = await setupInvalidConfig(invalidAppConfigs.missingSchema);
    try {
      const config = new BreakdownConfig(undefined, tempDir);
      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
        "ERR1002: Invalid application configuration",
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should handle invalid types", async () => {
    const tempDir = await setupInvalidConfig(invalidAppConfigs.invalidTypes);
    try {
      const config = new BreakdownConfig(undefined, tempDir);
      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
        "ERR1002: Invalid application configuration",
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
});
