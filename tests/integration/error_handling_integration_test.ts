/**
 * Error Handling Integration Test
 *
 * Tests error propagation and handling across the entire configuration system.
 * Validates that errors are properly unified and provide meaningful information.
 */

import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { join } from "@std/path";
import { ConfigManager } from "../../src/config_manager.ts";
import { AppConfigLoader } from "../../src/loaders/app_config_loader.ts";
import { UserConfigLoader } from "../../src/loaders/user_config_loader.ts";
import { cleanupTestConfigs, invalidAppConfigs, setupInvalidConfig } from "../test_utils.ts";
import {
  assertConfigFileNotFoundError,
  assertConfigParseError,
  assertConfigValidationError,
  assertUnifiedResultErr,
  assertUnifiedResultOk,
} from "../test_helpers/result_test_helpers.ts";

describe("Error Handling Integration Test", () => {
  let tempDir: string;
  let configManager: ConfigManager;

  afterEach(async () => {
    if (tempDir) {
      await cleanupTestConfigs(tempDir);
    }
  });

  describe("Parse Error Propagation", () => {
    it("should propagate YAML parse errors through the entire stack", async () => {
      // Given: Invalid YAML configuration
      const invalidYaml = "invalid: yaml: content: [unclosed";
      tempDir = await setupInvalidYamlFile(invalidYaml);
      const appLoader = new AppConfigLoader(undefined, tempDir);
      const userLoader = new UserConfigLoader(undefined, tempDir);
      configManager = new ConfigManager(appLoader, userLoader);

      // When: Attempt to load configuration
      const result = await configManager.getConfigSafe();

      // Then: Should receive CONFIG_PARSE_ERROR
      const error = assertUnifiedResultErr(result, "Should fail with parse error");

      if (error && error.kind === "CONFIG_PARSE_ERROR") {
        assert(error.path.includes("app.yml"), "Error should reference app.yml file");
        assert(
          error.message.includes("YAML") || error.message.includes("parse"),
          "Error message should indicate YAML parsing issue",
        );
      } else {
        assert(false, `Expected CONFIG_PARSE_ERROR but got ${error.kind}`);
      }
    });

    it("should handle user config parse errors separately", async () => {
      // Given: Valid app config but invalid user config
      tempDir = await setupValidAppWithInvalidUser();
      const appLoader = new AppConfigLoader(undefined, tempDir);
      const userLoader = new UserConfigLoader(undefined, tempDir);
      configManager = new ConfigManager(appLoader, userLoader);

      // When: Attempt to load configuration
      const result = await configManager.getConfigSafe();

      // Then: Should receive USER_CONFIG_INVALID error
      const error = assertUnifiedResultErr(result, "Should fail with user config error");

      if (error.kind === "USER_CONFIG_INVALID") {
        assertEquals(error.reason, "PARSE_ERROR", "Should specify parse error reason");
        assert(
          error.message.includes("user"),
          "Error message should indicate user config issue",
        );
      } else {
        assert(false, `Expected USER_CONFIG_INVALID but got ${error.kind}`);
      }
    });
  });

  describe("Validation Error Propagation", () => {
    it("should propagate validation errors with detailed information", async () => {
      // Given: Config with missing required fields
      tempDir = await setupInvalidConfig(invalidAppConfigs.missingWorkingDir);
      const appLoader = new AppConfigLoader(undefined, tempDir);
      const userLoader = new UserConfigLoader(undefined, tempDir);
      configManager = new ConfigManager(appLoader, userLoader);

      // When: Attempt to load configuration
      const result = await configManager.getConfigSafe();

      // Then: Should receive CONFIG_VALIDATION_ERROR with violations
      const error = assertConfigValidationError(result, undefined, 1);

      assert(
        error.violations.some((v) => v.field === "working_dir"),
        "Should include working_dir validation violation",
      );
    });

    it("should handle multiple validation errors simultaneously", async () => {
      // Given: Config with multiple invalid fields
      tempDir = await setupInvalidConfig(invalidAppConfigs.invalidTypes);
      const appLoader = new AppConfigLoader(undefined, tempDir);
      const userLoader = new UserConfigLoader(undefined, tempDir);
      configManager = new ConfigManager(appLoader, userLoader);

      // When: Attempt to load configuration
      const result = await configManager.getConfigSafe();

      // Then: Should receive multiple validation violations
      const error = assertConfigValidationError(result);

      assert(
        error.violations.length >= 2,
        `Should have multiple violations, got ${error.violations.length}`,
      );
    });
  });

  describe("File System Error Propagation", () => {
    it("should handle missing app config file", async () => {
      // Given: Directory without app.yml
      tempDir = await Deno.makeTempDir();
      const appLoader = new AppConfigLoader(undefined, tempDir);
      const userLoader = new UserConfigLoader(undefined, tempDir);
      configManager = new ConfigManager(appLoader, userLoader);

      // When: Attempt to load configuration
      const result = await configManager.getConfigSafe();

      // Then: Should receive CONFIG_FILE_NOT_FOUND error
      const error = assertConfigFileNotFoundError(result, undefined, "app");

      assert(
        error.path.includes("app.yml"),
        "Error should reference missing app.yml file",
      );
    });

    it("should handle permission denied errors", async () => {
      // This test would require specific file system permissions setup
      // Skip for now but include in the test structure
    });
  });

  describe("Path Validation Error Propagation", () => {
    it("should propagate path traversal validation errors", async () => {
      // Given: Config with path traversal attempt
      const pathTraversalConfig = {
        working_dir: "../../../etc",
        app_prompt: { base_dir: "../../sensitive" },
        app_schema: { base_dir: "schemas" },
      };

      tempDir = await setupInvalidConfig(pathTraversalConfig as any);
      const appLoader = new AppConfigLoader(undefined, tempDir);
      const userLoader = new UserConfigLoader(undefined, tempDir);
      configManager = new ConfigManager(appLoader, userLoader);

      // When: Attempt to load configuration
      const result = await configManager.getConfigSafe();

      // Then: Should receive PATH_VALIDATION_ERROR
      const error = assertUnifiedResultErr(result, "Should fail with path validation error");

      if (error.kind === "PATH_VALIDATION_ERROR") {
        assertEquals(error.reason, "PATH_TRAVERSAL", "Should specify path traversal reason");
        assert(
          error.message.includes("path traversal") || error.message.includes(".."),
          "Error message should indicate path traversal issue",
        );
      } else {
        assert(false, `Expected PATH_VALIDATION_ERROR but got ${error.kind}`);
      }
    });
  });

  describe("Error Context Preservation", () => {
    it("should preserve error context through the call stack", async () => {
      // Given: Nested error scenario
      tempDir = await setupInvalidConfig(invalidAppConfigs.missingPrompt);
      const appLoader = new AppConfigLoader(undefined, tempDir);
      const userLoader = new UserConfigLoader(undefined, tempDir);
      configManager = new ConfigManager(appLoader, userLoader);

      // When: Attempt to load configuration
      const result = await configManager.getConfigSafe();

      // Then: Error should contain context information
      const error = assertUnifiedResultErr(result, "Should fail with validation error");

      assert(error.context !== undefined, "Error should have context");
      assert(error.timestamp !== undefined, "Error should have timestamp");

      if (error.kind === "CONFIG_VALIDATION_ERROR") {
        assert(error.path !== undefined, "Error should have file path");
        assert(error.violations.length > 0, "Error should have validation violations");
      }
    });
  });

  describe("Error Recovery Scenarios", () => {
    it("should allow recovery after fixing configuration errors", async () => {
      // Given: Initially invalid configuration
      tempDir = await setupInvalidConfig(invalidAppConfigs.missingWorkingDir);
      const appLoader = new AppConfigLoader("", tempDir);
      const userLoader = new UserConfigLoader("", tempDir);
      configManager = new ConfigManager(appLoader, userLoader);

      // When: First load attempt fails
      const firstResult = await configManager.getConfigSafe();
      assertUnifiedResultErr(firstResult, "First load should fail");

      // And: Fix the configuration
      await fixConfiguration(tempDir);

      // And: Reload configuration (create new manager after fix)
      const newAppLoader = new AppConfigLoader("", tempDir);
      const newUserLoader = new UserConfigLoader("", tempDir);
      const newConfigManager = new ConfigManager(newAppLoader, newUserLoader);
      const secondResult = await newConfigManager.getConfigSafe();

      // Then: Second load should succeed
      const config = assertUnifiedResultOk(secondResult, "Second load should succeed after fix");
      assertEquals(config.working_dir, ".agent/breakdown");
    });
  });
});

// Helper functions for test setup

async function setupInvalidYamlFile(invalidYaml: string): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  const configDir = join(tempDir, ".agent", "breakdown", "config");
  await Deno.mkdir(configDir, { recursive: true });

  const appConfigPath = join(configDir, "app.yml");
  await Deno.writeTextFile(appConfigPath, invalidYaml);

  return tempDir;
}

async function setupValidAppWithInvalidUser(): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  const configDir = join(tempDir, ".agent", "breakdown", "config");
  await Deno.mkdir(configDir, { recursive: true });

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

async function fixConfiguration(tempDir: string): Promise<void> {
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
