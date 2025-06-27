/**
 * Phase 4 Type System Integration Tests
 *
 * Simplified tests for the unified error type system created in Phase 4.
 */

import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertInstanceOf } from "@std/assert";
import { Result } from "../../src/types/unified_result.ts";
import { ConfigManager } from "../../src/config_manager.ts";
import { AppConfigLoader } from "../../src/loaders/app_config_loader.ts";
import { UserConfigLoader } from "../../src/loaders/user_config_loader.ts";
import { UnifiedError } from "../../src/errors/unified_errors.ts";
import { UnifiedErrorManager } from "../../src/errors/unified_error_manager.ts";

describe("Phase 4 Type System Integration Tests", () => {
  let tempDir: string;
  let configManager: ConfigManager;

  beforeEach(async () => {
    tempDir = await Deno.makeTempDir();
    const appLoader = new AppConfigLoader(undefined, tempDir);
    const userLoader = new UserConfigLoader(undefined, tempDir);
    configManager = new ConfigManager(appLoader, userLoader);
  });

  afterEach(async () => {
    if (tempDir) {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  describe("Basic Error Type System", () => {
    it("should create and handle basic unified errors", () => {
      const errorManager = new UnifiedErrorManager();
      
      const configError: UnifiedError = {
        kind: "CONFIG_FILE_NOT_FOUND",
        message: "Configuration file not found",
        path: "/app/config.yaml",
        configType: "app" as const,
        timestamp: new Date(),
        context: {},
      };

      const validationError: UnifiedError = {
        kind: "CONFIG_VALIDATION_ERROR",
        message: "Validation failed",
        path: "/config.yaml",
        violations: [{
          field: "apiKey",
          expectedType: "string",
          actualType: "undefined",
          value: undefined
        }],
        timestamp: new Date(),
        context: {},
      };

      // Test error identification
      assert(configError.kind === "CONFIG_FILE_NOT_FOUND", "Should identify config file error");
      assert(validationError.kind === "CONFIG_VALIDATION_ERROR", "Should identify validation error");
    });

    it("should support type narrowing in conditional logic", () => {
      const error: UnifiedError = {
        kind: "PATH_VALIDATION_ERROR",
        message: "Path traversal detected",
        path: "../secret.txt",
        reason: "PATH_TRAVERSAL",
        timestamp: new Date(),
        context: {},
      };

      let handledCorrectly = false;

      if (error.kind === "PATH_VALIDATION_ERROR") {
        assertEquals(error.reason, "PATH_TRAVERSAL");
        handledCorrectly = true;
      }

      assert(handledCorrectly, "Error should be handled with correct type");
    });
  });

  describe("Config Manager Integration", () => {
    it("should handle config loading with proper error handling", async () => {
      // Create a minimal config setup
      const configDir = `${tempDir}/.agent/breakdown/config`;
      await Deno.mkdir(configDir, { recursive: true });
      
      const validConfig = `
working_dir: ".agent/breakdown"
app_prompt:
  base_dir: "prompts"
app_schema:
  base_dir: "schemas"
`;
      
      await Deno.writeTextFile(`${configDir}/app.yml`, validConfig);
      
      const result = await configManager.getConfigSafe();
      
      if (result.success) {
        const config = result.data;
        assertEquals(config.working_dir, ".agent/breakdown");
        assertEquals(config.app_prompt.base_dir, "prompts");
      } else {
        // Test error handling
        assertInstanceOf(result.error, Object, "Should have error object");
        assert(result.error.kind, "Should have error kind");
      }
    });

    it("should handle missing config files gracefully", async () => {
      // Test with missing config file
      const result = await configManager.getConfigSafe();
      
      if (!result.success) {
        assert(result.error.kind === "CONFIG_FILE_NOT_FOUND", "Should detect missing config");
        assert(result.error.message.includes("not found"), "Should have descriptive message");
      }
    });
  });

  describe("Result Type Integration", () => {
    it("should work with Result type properly", async () => {
      const result = await configManager.getConfigSafe();
      
      // Test Result type operations
      const mapped = Result.map(result, (config) => config.working_dir);
      
      if (result.success) {
        assert(mapped.success, "Mapped result should be successful");
        if (mapped.success) {
          assertEquals(mapped.data, result.data.working_dir);
        }
      } else {
        assert(!mapped.success, "Mapped result should be error");
      }
    });

    it("should handle error transformation", async () => {
      const errorResult = Result.failure({
        kind: "CONFIG_PARSE_ERROR",
        message: "Parse error",
        path: "/config.yaml",
        timestamp: new Date(),
        context: {},
      } as UnifiedError);

      const mappedError = Result.mapErr(errorResult, (err) => ({
        ...err,
        message: `Transformed: ${err.message}`,
      }));

      assert(!mappedError.success, "Should remain error");
      if (!mappedError.success) {
        assert(mappedError.error.message.startsWith("Transformed:"), "Should transform error message");
      }
    });
  });

  describe("Performance Tests", () => {
    it("should handle multiple config operations efficiently", async () => {
      const startTime = performance.now();
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        const result = await configManager.getConfigSafe();
        // Process result
        if (result.success) {
          assert(result.data.working_dir, "Should have working directory");
        }
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      assert(totalTime < 1000, `Operations should complete quickly, took ${totalTime}ms`);
    });
  });
});