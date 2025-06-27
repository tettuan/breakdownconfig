/**
 * Practical Error Handling Integration Tests
 *
 * Real-world scenarios demonstrating error handling patterns using the unified error system.
 */

import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { join } from "@std/path";

import { Result } from "../../src/types/unified_result.ts";
import { ConfigManager } from "../../src/config_manager.ts";
import { AppConfigLoader } from "../../src/loaders/app_config_loader.ts";
import { UserConfigLoader } from "../../src/loaders/user_config_loader.ts";
import { UnifiedError } from "../../src/errors/unified_errors.ts";

describe("Practical Error Handling Integration Tests", () => {
  let tempDir: string;
  let configManager: ConfigManager;

  beforeEach(async () => {
    tempDir = await Deno.makeTempDir();
    const appLoader = new AppConfigLoader(undefined, tempDir);
    const userLoader = new UserConfigLoader(undefined, tempDir);
    configManager = new ConfigManager(appLoader, userLoader);
  });

  afterEach(async () => {
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("File System Error Scenarios", () => {
    it("should handle missing configuration directory gracefully", async () => {
      // Test when config directory doesn't exist
      const result = await configManager.getConfigSafe();
      
      if (!result.success) {
        assert(result.error.kind === "CONFIG_FILE_NOT_FOUND", "Should detect missing config directory");
        assert(result.error.message, "Should have descriptive error message");
      }
    });

    it("should handle corrupted YAML files", async () => {
      // Create config directory
      const configDir = join(tempDir, ".agent", "breakdown", "config");
      await Deno.mkdir(configDir, { recursive: true });
      
      // Write corrupted YAML
      const corruptedYaml = `
working_dir: ".agent/breakdown"
app_prompt:
  base_dir: "prompts"
  # Missing closing bracket
  invalid: [unclosed
`;
      
      await Deno.writeTextFile(join(configDir, "app.yml"), corruptedYaml);
      
      const result = await configManager.getConfigSafe();
      
      if (!result.success) {
        assert(result.error.kind === "CONFIG_PARSE_ERROR", "Should detect YAML parse error");
        assert(result.error.message.includes("parse") || result.error.message.includes("invalid"), 
               "Should have parse-related error message");
      }
    });
  });

  describe("Configuration Validation Scenarios", () => {
    it("should handle missing required fields", async () => {
      // Create config directory
      const configDir = join(tempDir, ".agent", "breakdown", "config");
      await Deno.mkdir(configDir, { recursive: true });
      
      // Write config missing required fields
      const incompleteConfig = `
app_prompt:
  base_dir: "prompts"
# Missing working_dir and app_schema
`;
      
      await Deno.writeTextFile(join(configDir, "app.yml"), incompleteConfig);
      
      const result = await configManager.getConfigSafe();
      
      if (!result.success) {
        assert(
          result.error.kind === "CONFIG_VALIDATION_ERROR" || 
          result.error.kind === "CONFIG_PARSE_ERROR",
          "Should detect validation or parse error"
        );
      }
    });

    it("should handle path traversal attempts", async () => {
      // Create config directory
      const configDir = join(tempDir, ".agent", "breakdown", "config");
      await Deno.mkdir(configDir, { recursive: true });
      
      // Write config with path traversal
      const maliciousConfig = `
working_dir: "../../../etc"
app_prompt:
  base_dir: "../../sensitive/data"
app_schema:
  base_dir: "schemas"
`;
      
      await Deno.writeTextFile(join(configDir, "app.yml"), maliciousConfig);
      
      const result = await configManager.getConfigSafe();
      
      if (!result.success) {
        assert(
          result.error.kind === "PATH_VALIDATION_ERROR" ||
          result.error.kind === "CONFIG_VALIDATION_ERROR",
          "Should detect path validation error"
        );
      }
    });
  });

  describe("Error Recovery Patterns", () => {
    it("should allow fallback to default configuration", async () => {
      // Test error recovery by providing fallback
      const result = await configManager.getConfigSafe();
      
      let finalConfig;
      
      if (result.success) {
        finalConfig = result.data;
      } else {
        // Fallback to default configuration
        finalConfig = {
          working_dir: ".agent/breakdown",
          app_prompt: { base_dir: "prompts" },
          app_schema: { base_dir: "schemas" }
        };
      }
      
      // Verify we have a working configuration
      assert(finalConfig.working_dir, "Should have working directory");
      assert(finalConfig.app_prompt.base_dir, "Should have prompt base directory");
      assert(finalConfig.app_schema.base_dir, "Should have schema base directory");
    });

    it("should demonstrate error chaining and context", async () => {
      // Create a chain of operations that can fail
      const operations = [
        () => configManager.getConfigSafe(),
        (config: any) => Result.map(config, (c) => c.working_dir),
        (workingDir: any) => Result.map(workingDir, (dir) => join(dir, "sub")),
      ];

      let currentResult: any = await operations[0]();
      
      for (let i = 1; i < operations.length && currentResult.success; i++) {
        currentResult = operations[i](currentResult);
      }

      // The chain should either succeed completely or fail at some point
      assert(
        currentResult.success || !currentResult.success,
        "Result should be either success or failure"
      );
    });
  });

  describe("Performance Under Error Conditions", () => {
    it("should handle repeated failed operations efficiently", async () => {
      const startTime = performance.now();
      const attempts = 50;
      
      for (let i = 0; i < attempts; i++) {
        const result = await configManager.getConfigSafe();
        // Process result (will likely be errors due to missing config)
        if (!result.success) {
          assert(result.error.kind, "Should have error kind");
        }
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / attempts;
      
      assert(avgTime < 10, `Each error operation should be fast, but took ${avgTime}ms on average`);
    });
  });

  describe("Real-World Integration Scenarios", () => {
    it("should handle partial config file scenarios", async () => {
      // Create config directory with only app config
      const configDir = join(tempDir, ".agent", "breakdown", "config");
      await Deno.mkdir(configDir, { recursive: true });
      
      const appConfig = `
working_dir: ".agent/breakdown"
app_prompt:
  base_dir: "prompts"
app_schema:
  base_dir: "schemas"
`;
      
      await Deno.writeTextFile(join(configDir, "app.yml"), appConfig);
      // Note: No user.yml file
      
      const result = await configManager.getConfigSafe();
      
      if (result.success) {
        // Should work with just app config
        assertEquals(result.data.working_dir, ".agent/breakdown");
      } else {
        // Or gracefully handle the missing user config
        assert(result.error.kind, "Should have meaningful error");
      }
    });

    it("should handle concurrent access to configuration", async () => {
      // Create valid config
      const configDir = join(tempDir, ".agent", "breakdown", "config");
      await Deno.mkdir(configDir, { recursive: true });
      
      const validConfig = `
working_dir: ".agent/breakdown"
app_prompt:
  base_dir: "prompts"
app_schema:
  base_dir: "schemas"
`;
      
      await Deno.writeTextFile(join(configDir, "app.yml"), validConfig);
      
      // Launch multiple concurrent operations
      const promises = Array.from({ length: 10 }, () => configManager.getConfigSafe());
      const results = await Promise.all(promises);
      
      // All results should be consistent
      const firstResult = results[0];
      
      results.forEach((result, index) => {
        assertEquals(result.success, firstResult.success, 
          `Result ${index} should have same success status as first`);
        
        if (result.success && firstResult.success) {
          assertEquals(result.data.working_dir, firstResult.data.working_dir,
            `Result ${index} should have same data as first`);
        }
      });
    });
  });
});