/**
 * Error Handling Tests
 *
 * Purpose:
 * Test the error handling capabilities of the configuration system
 *
 * Test Cases:
 * 1. Missing config files
 * 2. Invalid config structures
 *
 * Success Criteria:
 * - Appropriate errors are returned for missing files
 * - Invalid configs return validation errors
 * - Error messages are clear and descriptive
 * - Result type pattern is properly implemented
 */

import { assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { cleanupTestConfigs, invalidAppConfigs, setupInvalidConfig } from "../test_utils.ts";
import {
  assertConfigValidationError,
  assertResultErrorKind,
  assertResultErrorMessage,
} from "../test_helpers/result_test_helpers.ts";

describe("Error Handling", () => {
  it("should handle missing working directory with Result type", async () => {
    const tempDir = await setupInvalidConfig(invalidAppConfigs.missingWorkingDir);
    try {
      const config = new BreakdownConfig(undefined, tempDir);
      const result = await config.loadConfigSafe();

      // Should return CONFIG_VALIDATION_ERROR for missing working_dir
      assertConfigValidationError(result, undefined, 1);
      assertResultErrorMessage(result, "Configuration validation failed");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should handle missing working directory with legacy API", async () => {
    const tempDir = await setupInvalidConfig(invalidAppConfigs.missingWorkingDir);
    try {
      const config = new BreakdownConfig(undefined, tempDir);
      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
        "Configuration validation failed",
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should handle missing app prompt with Result type", async () => {
    const tempDir = await setupInvalidConfig(invalidAppConfigs.missingPrompt);
    try {
      const config = new BreakdownConfig(undefined, tempDir);
      const result = await config.loadConfigSafe();

      // Should return CONFIG_VALIDATION_ERROR for missing app_prompt
      assertConfigValidationError(result, undefined, 1);
      assertResultErrorMessage(result, "Configuration validation failed");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should handle missing app prompt with legacy API", async () => {
    const tempDir = await setupInvalidConfig(invalidAppConfigs.missingPrompt);
    try {
      const config = new BreakdownConfig(undefined, tempDir);
      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
        "Configuration validation failed",
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should handle missing app schema with Result type", async () => {
    const tempDir = await setupInvalidConfig(invalidAppConfigs.missingSchema);
    try {
      const config = new BreakdownConfig(undefined, tempDir);
      const result = await config.loadConfigSafe();

      // Should return CONFIG_VALIDATION_ERROR for missing app_schema
      assertConfigValidationError(result, undefined, 1);
      assertResultErrorMessage(result, "Configuration validation failed");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should handle missing app schema with legacy API", async () => {
    const tempDir = await setupInvalidConfig(invalidAppConfigs.missingSchema);
    try {
      const config = new BreakdownConfig(undefined, tempDir);
      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
        "Configuration validation failed",
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should handle invalid types with Result type", async () => {
    const tempDir = await setupInvalidConfig(invalidAppConfigs.invalidTypes);
    try {
      const config = new BreakdownConfig(undefined, tempDir);
      const result = await config.loadConfigSafe();

      // Should return CONFIG_VALIDATION_ERROR for type mismatch
      assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
      assertResultErrorMessage(result, "Configuration validation failed");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("should handle invalid types with legacy API", async () => {
    const tempDir = await setupInvalidConfig(invalidAppConfigs.invalidTypes);
    try {
      const config = new BreakdownConfig(undefined, tempDir);
      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
        "Configuration validation failed",
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
});
