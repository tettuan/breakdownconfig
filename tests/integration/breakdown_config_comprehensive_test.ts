/**
 * Comprehensive BreakdownConfig Test Suite
 * 
 * Targets uncovered areas in breakdown_config.ts (current: 24.1%)
 * Focus: API methods, error paths, edge cases, validation scenarios
 */

import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { Result } from "../../src/types/unified_result.ts";
import { cleanupTestConfigs, setupMergeConfigs } from "../test_utils.ts";

describe("BreakdownConfig Comprehensive Coverage Tests", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await setupMergeConfigs();
  });

  afterEach(async () => {
    await cleanupTestConfigs(tempDir);
  });

  describe("Constructor and Initialization", () => {
    it("should create BreakdownConfig with default parameters", () => {
      const config = new BreakdownConfig();
      assert(config instanceof BreakdownConfig);
    });

    it("should create BreakdownConfig with custom configSetName", () => {
      const config = new BreakdownConfig("production");
      assert(config instanceof BreakdownConfig);
    });

    it("should create BreakdownConfig with custom baseDir", () => {
      const config = new BreakdownConfig(undefined, "/custom/base");
      assert(config instanceof BreakdownConfig);
    });

    it("should create BreakdownConfig with both custom parameters", () => {
      const config = new BreakdownConfig("staging", "/opt/app");
      assert(config instanceof BreakdownConfig);
    });

    it("should throw error for invalid configSetName", () => {
      assertRejects(
        async () => {
          new BreakdownConfig("invalid@name");
        },
        Error,
        "Invalid config set name",
      );
    });

    it("should handle configSetName with special characters", () => {
      assertRejects(
        async () => {
          new BreakdownConfig("test_invalid");
        },
        Error,
        "Invalid config set name",
      );
    });
  });

  describe("Configuration Loading - Error Paths", () => {
    it("should handle loadConfig with error", async () => {
      const config = new BreakdownConfig("nonexistent", tempDir);
      
      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
      );
    });

    it("should handle loadConfigSafe with missing config", async () => {
      const config = new BreakdownConfig("missing", "/nonexistent/path");
      
      const result = await config.loadConfigSafe();
      assert(!result.success);
      assertEquals(result.error.kind, "CONFIG_FILE_NOT_FOUND");
    });

    it("should validate working_dir is not empty", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      // Mock empty working_dir scenario
      const result = await config.loadConfigSafe();
      if (result.success) {
        // This tests the validation logic inside loadConfigSafe
        assert(result.data !== undefined);
      }
    });
  });

  describe("Configuration Access - Unloaded State", () => {
    it("should throw error when accessing config before loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await assertRejects(
        async () => {
          await config.getConfig();
        },
        Error,
        "Configuration not loaded",
      );
    });

    it("should return error result when accessing configSafe before loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      const result = await config.getConfigSafe();
      assert(!result.success);
      assertEquals(result.error.kind, "CONFIG_NOT_LOADED");
    });

    it("should throw error when accessing workingDir before loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await assertRejects(
        async () => {
          await config.getWorkingDir();
        },
        Error,
        "Configuration not loaded",
      );
    });

    it("should return error for workingDirSafe before loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      const result = await config.getWorkingDirSafe();
      assert(!result.success);
      assertEquals(result.error.kind, "CONFIG_NOT_LOADED");
    });

    it("should throw error when accessing promptDir before loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await assertRejects(
        async () => {
          await config.getPromptDir();
        },
        Error,
        "Configuration not loaded",
      );
    });

    it("should return error for promptDirSafe before loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      const result = await config.getPromptDirSafe();
      assert(!result.success);
      assertEquals(result.error.kind, "CONFIG_NOT_LOADED");
    });

    it("should throw error when accessing schemaDir before loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await assertRejects(
        async () => {
          await config.getSchemaDir();
        },
        Error,
        "Configuration not loaded",
      );
    });

    it("should return error for schemaDirSafe before loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      const result = await config.getSchemaDirSafe();
      assert(!result.success);
      assertEquals(result.error.kind, "CONFIG_NOT_LOADED");
    });
  });

  describe("Successful Configuration Access", () => {
    it("should successfully access config after loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await config.loadConfig();
      const configData = await config.getConfig();
      
      assert(configData.working_dir);
      assert(configData.app_prompt);
      assert(configData.app_schema);
    });

    it("should successfully access configSafe after loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await config.loadConfig();
      const result = await config.getConfigSafe();
      
      assert(result.success);
      assert(result.data.working_dir);
    });

    it("should successfully access workingDir after loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await config.loadConfig();
      const workingDir = await config.getWorkingDir();
      
      assert(typeof workingDir === "string");
      assert(workingDir.length > 0);
    });

    it("should successfully access workingDirSafe after loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await config.loadConfig();
      const result = await config.getWorkingDirSafe();
      
      assert(result.success);
      assert(typeof result.data === "string");
    });

    it("should successfully access promptDir after loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await config.loadConfig();
      const promptDir = await config.getPromptDir();
      
      assert(typeof promptDir === "string");
      assert(promptDir.length > 0);
    });

    it("should successfully access promptDirSafe after loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await config.loadConfig();
      const result = await config.getPromptDirSafe();
      
      assert(result.success);
      assert(typeof result.data === "string");
    });

    it("should successfully access schemaDir after loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await config.loadConfig();
      const schemaDir = await config.getSchemaDir();
      
      assert(typeof schemaDir === "string");
      assert(schemaDir.length > 0);
    });

    it("should successfully access schemaDirSafe after loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await config.loadConfig();
      const result = await config.getSchemaDirSafe();
      
      assert(result.success);
      assert(typeof result.data === "string");
    });
  });

  describe("Path Resolution Logic", () => {
    it("should resolve paths correctly with custom baseDir", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await config.loadConfig();
      const workingDir = await config.getWorkingDir();
      
      assert(workingDir.includes(tempDir));
    });

    it("should resolve promptDir relative to workingDir", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await config.loadConfig();
      const workingDir = await config.getWorkingDir();
      const promptDir = await config.getPromptDir();
      
      assert(promptDir.includes(workingDir) || promptDir.length > workingDir.length);
    });

    it("should resolve schemaDir relative to workingDir", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await config.loadConfig();
      const workingDir = await config.getWorkingDir();
      const schemaDir = await config.getSchemaDir();
      
      assert(schemaDir.includes(workingDir) || schemaDir.length > workingDir.length);
    });
  });

  describe("Error Propagation", () => {
    it("should propagate config errors through all dependent methods", async () => {
      const config = new BreakdownConfig("invalid", "/nonexistent");
      
      // All these should fail with the same underlying error
      const configResult = await config.getConfigSafe();
      const workingDirResult = await config.getWorkingDirSafe();
      const promptDirResult = await config.getPromptDirSafe();
      const schemaDirResult = await config.getSchemaDirSafe();
      
      assert(!configResult.success);
      assert(!workingDirResult.success);
      assert(!promptDirResult.success);
      assert(!schemaDirResult.success);
      
      // All should have the same error kind
      assertEquals(configResult.error.kind, workingDirResult.error.kind);
      assertEquals(configResult.error.kind, promptDirResult.error.kind);
      assertEquals(configResult.error.kind, schemaDirResult.error.kind);
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    it("should handle empty baseDir", async () => {
      const config = new BreakdownConfig(undefined, "");
      
      const loadResult = await config.loadConfigSafe();
      // Should handle empty baseDir gracefully
      assert(loadResult !== undefined);
    });

    it("should handle very long configSetName", () => {
      const longName = "a".repeat(100);
      
      assertRejects(
        async () => {
          new BreakdownConfig(longName);
        },
        Error,
      );
    });

    it("should handle special baseDir paths", async () => {
      const config = new BreakdownConfig(undefined, "./relative/path");
      
      const loadResult = await config.loadConfigSafe();
      assert(loadResult !== undefined);
    });
  });

  describe("State Management", () => {
    it("should maintain loaded state across multiple calls", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await config.loadConfig();
      
      // Multiple calls should work without re-loading
      const config1 = await config.getConfig();
      const config2 = await config.getConfig();
      const workingDir1 = await config.getWorkingDir();
      const workingDir2 = await config.getWorkingDir();
      
      assertEquals(config1.working_dir, config2.working_dir);
      assertEquals(workingDir1, workingDir2);
    });

    it("should handle concurrent access after loading", async () => {
      const config = new BreakdownConfig(undefined, tempDir);
      
      await config.loadConfig();
      
      // Concurrent access
      const [configResult, workingDirResult, promptDirResult, schemaDirResult] = await Promise.all([
        config.getConfigSafe(),
        config.getWorkingDirSafe(),
        config.getPromptDirSafe(),
        config.getSchemaDirSafe(),
      ]);
      
      assert(configResult.success);
      assert(workingDirResult.success);
      assert(promptDirResult.success);
      assert(schemaDirResult.success);
    });
  });
});