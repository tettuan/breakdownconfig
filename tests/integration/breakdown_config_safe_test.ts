/**
 * BreakdownConfig Safe Methods Integration Tests
 *
 * Purpose:
 * Test the Result-based Safe API methods for comprehensive error handling
 *
 * Test Cases:
 * 1. loadConfigSafe() error scenarios
 * 2. getConfigSafe() state management
 * 3. getWorkingDirSafe() path resolution
 * 4. getPromptDirSafe() and getSchemaDirSafe() directory resolution
 *
 * Success Criteria:
 * - All Safe methods return proper Result types
 * - Error states are handled gracefully
 * - Success states provide correct data
 * - Result type pattern is properly implemented
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { setupValidConfig, cleanupTestConfigs, invalidAppConfigs, setupInvalidConfig } from "../test_utils.ts";
import {
  assertResultSuccess,
  assertResultError,
  assertResultErrorKind,
} from "../test_helpers/result_test_helpers.ts";

describe("BreakdownConfig Safe Methods Integration", () => {
  describe("loadConfigSafe()", () => {
    it("should successfully load valid configuration", async () => {
      const tempDir = await setupValidConfig();
      try {
        const config = new BreakdownConfig(undefined, tempDir);
        const result = await config.loadConfigSafe();

        assertResultSuccess(result);
        // loadConfig returns void on success - just verify it's successful
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should handle missing working directory", async () => {
      const tempDir = await setupInvalidConfig(invalidAppConfigs.missingWorkingDir);
      try {
        const config = new BreakdownConfig(undefined, tempDir);
        const result = await config.loadConfigSafe();

        assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should handle empty working directory", async () => {
      const tempDir = await setupInvalidConfig(invalidAppConfigs.emptyWorkingDir);
      try {
        const config = new BreakdownConfig(undefined, tempDir);
        const result = await config.loadConfigSafe();

        assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should handle missing app config file", async () => {
      const config = new BreakdownConfig(undefined, "/nonexistent/path");
      const result = await config.loadConfigSafe();

      assertResultErrorKind(result, "CONFIG_FILE_NOT_FOUND");
    });
  });

  describe("getConfigSafe()", () => {
    it("should return config after successful load", async () => {
      const tempDir = await setupValidConfig();
      try {
        const config = new BreakdownConfig(undefined, tempDir);
        
        // Load config first
        const loadResult = await config.loadConfigSafe();
        assertResultSuccess(loadResult);
        
        // Then get config
        const getResult = await config.getConfigSafe();
        const configData = assertResultSuccess(getResult);
        
        assertExists(configData.working_dir);
        assertExists(configData.app_prompt.base_dir);
        assertExists(configData.app_schema.base_dir);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should fail when config not loaded", async () => {
      const config = new BreakdownConfig();
      const result = await config.getConfigSafe();

      assertResultErrorKind(result, "CONFIG_NOT_LOADED");
    });
  });

  describe("getWorkingDirSafe()", () => {
    it("should return absolute working directory path", async () => {
      const tempDir = await setupValidConfig();
      try {
        const config = new BreakdownConfig(undefined, tempDir);
        
        const loadResult = await config.loadConfigSafe();
        assertResultSuccess(loadResult);
        
        const workingDirResult = await config.getWorkingDirSafe();
        const workingDirData = assertResultSuccess(workingDirResult);
        
        // Should be absolute path combining baseDir and working_dir
        assertEquals(workingDirData.startsWith(tempDir), true);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should fail when config not loaded", async () => {
      const config = new BreakdownConfig();
      const result = await config.getWorkingDirSafe();

      assertResultErrorKind(result, "CONFIG_NOT_LOADED");
    });
  });

  describe("getPromptDirSafe()", () => {
    it("should return absolute prompt directory path", async () => {
      const tempDir = await setupValidConfig();
      try {
        const config = new BreakdownConfig(undefined, tempDir);
        
        const loadResult = await config.loadConfigSafe();
        assertResultSuccess(loadResult);
        
        const promptDirResult = await config.getPromptDirSafe();
        const promptDirData = assertResultSuccess(promptDirResult);
        
        // Should include prompt directory in path
        assertEquals(promptDirData.includes("prompts"), true);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should fail when config not loaded", async () => {
      const config = new BreakdownConfig();
      const result = await config.getPromptDirSafe();

      assertResultErrorKind(result, "CONFIG_NOT_LOADED");
    });
  });

  describe("getSchemaDirSafe()", () => {
    it("should return absolute schema directory path", async () => {
      const tempDir = await setupValidConfig();
      try {
        const config = new BreakdownConfig(undefined, tempDir);
        
        const loadResult = await config.loadConfigSafe();
        assertResultSuccess(loadResult);
        
        const schemaDirResult = await config.getSchemaDirSafe();
        const schemaDirData = assertResultSuccess(schemaDirResult);
        
        // Should include schema directory in path
        assertEquals(schemaDirData.includes("schema"), true);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should fail when config not loaded", async () => {
      const config = new BreakdownConfig();
      const result = await config.getSchemaDirSafe();

      assertResultErrorKind(result, "CONFIG_NOT_LOADED");
    });
  });

  describe("Error propagation", () => {
    it("should propagate config loading errors through all Safe methods", async () => {
      const tempDir = await setupInvalidConfig(invalidAppConfigs.missingWorkingDir);
      try {
        const config = new BreakdownConfig(undefined, tempDir);
        
        // All methods should fail with same underlying error after load attempt
        const loadResult = await config.loadConfigSafe();
        assertResultError(loadResult);
        
        const getResult = await config.getConfigSafe();
        assertResultErrorKind(getResult, "CONFIG_NOT_LOADED");
        
        const workingDirResult = await config.getWorkingDirSafe();
        assertResultErrorKind(workingDirResult, "CONFIG_NOT_LOADED");
        
        const promptDirResult = await config.getPromptDirSafe();
        assertResultErrorKind(promptDirResult, "CONFIG_NOT_LOADED");
        
        const schemaDirResult = await config.getSchemaDirSafe();
        assertResultErrorKind(schemaDirResult, "CONFIG_NOT_LOADED");
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });

  describe("Mixed API usage", () => {
    it("should work correctly when mixing Safe and legacy APIs", async () => {
      const tempDir = await setupValidConfig();
      try {
        const config = new BreakdownConfig(undefined, tempDir);
        
        // Use Safe API to load
        const loadResult = await config.loadConfigSafe();
        assertResultSuccess(loadResult);
        
        // Mix: Use legacy API to get config (should work)
        const legacyConfig = await config.getConfig();
        assertExists(legacyConfig.working_dir);
        
        // Use Safe API to get directories
        const workingDirResult = await config.getWorkingDirSafe();
        const workingDirData = assertResultSuccess(workingDirResult);
        
        const legacyWorkingDir = await config.getWorkingDir();
        assertEquals(workingDirData, legacyWorkingDir);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });
});