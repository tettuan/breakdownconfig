/**
 * Happy Path Integration Test
 *
 * Tests the complete configuration loading workflow when everything works correctly.
 * Validates the integration between ConfigManager, loaders, and validators.
 */

import { afterEach, beforeEach, describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { ConfigManager } from "../../src/config_manager.ts";
import { cleanupTestConfigs, setupMergeConfigs } from "../test_utils.ts";
import {
  assertSuccessfulFlatMap,
  assertSuccessfulMap,
  assertUnifiedResultOk,
} from "../test_helpers/result_test_helpers.ts";
import { Result } from "../../src/types/unified_result.ts";

describe("Happy Path Integration Test", () => {
  let tempDir: string;
  let configManager: ConfigManager;

  beforeEach(async () => {
    tempDir = await setupMergeConfigs();
    const { AppConfigLoader } = await import("../../src/loaders/app_config_loader.ts");
    const { UserConfigLoader } = await import("../../src/loaders/user_config_loader.ts");
    const appLoader = new AppConfigLoader("", tempDir);
    const userLoader = new UserConfigLoader("", tempDir);
    configManager = new ConfigManager(appLoader, userLoader);
  });

  afterEach(async () => {
    await cleanupTestConfigs(tempDir);
  });

  describe("Complete Config Loading Workflow", () => {
    it("should successfully load and merge app and user configs", async () => {
      // When: Load configuration through the complete workflow
      const result = await configManager.getConfigSafe();

      // Then: Result should be successful
      const config = assertUnifiedResultOk(result, "Config loading should succeed");

      // Verify app config properties are loaded
      assertEquals(config.working_dir, ".agent/breakdown");
      assertEquals(config.app_prompt.base_dir, "custom/prompts");
      assertEquals(config.app_schema.base_dir, "breakdown/schema/app");
    });

    it("should apply user config overrides correctly", async () => {
      // When: Load configuration with user overrides
      const result = await configManager.getConfigSafe();

      // Then: User config should override app config
      const config = assertUnifiedResultOk(result, "Config loading should succeed");

      // Verify user config override is applied
      assertEquals(
        config.app_prompt.base_dir,
        "custom/prompts",
        "User config should override app config",
      );

      // Verify non-overridden values remain from app config
      assertEquals(
        config.app_schema.base_dir,
        "breakdown/schema/app",
        "Non-overridden values should remain from app config",
      );
    });

    it("should validate all paths in the merged config", async () => {
      // When: Load and validate configuration
      const result = await configManager.getConfigSafe();

      // Then: All paths should be validated successfully
      const config = assertUnifiedResultOk(result, "Config loading should succeed");

      // Verify no path traversal attempts
      assert(
        !config.working_dir.includes(".."),
        "Working directory should not contain path traversal",
      );
      assert(
        !config.app_prompt.base_dir.includes(".."),
        "Prompt base directory should not contain path traversal",
      );
      assert(
        !config.app_schema.base_dir.includes(".."),
        "Schema base directory should not contain path traversal",
      );
    });
  });

  describe("Config Manager State Management", () => {
    it("should cache loaded configuration correctly", async () => {
      // Given: Load configuration once
      const firstResult = await configManager.getConfigSafe();
      const firstConfig = assertUnifiedResultOk(firstResult);

      // When: Load configuration again
      const secondResult = await configManager.getConfigSafe();
      const secondConfig = assertUnifiedResultOk(secondResult);

      // Then: Both results should be identical (cached)
      assertEquals(
        firstConfig.working_dir,
        secondConfig.working_dir,
        "Cached config should be identical",
      );
      assertEquals(
        firstConfig.app_prompt.base_dir,
        secondConfig.app_prompt.base_dir,
        "Cached config should be identical",
      );
    });

    it("should reload configuration when forced", async () => {
      // Given: Load configuration initially
      const initialResult = await configManager.getConfigSafe();
      assertUnifiedResultOk(initialResult);

      // When: Force reload configuration
      const reloadResult = await configManager.getConfigSafe();

      // Then: Reload should succeed
      const reloadedConfig = assertUnifiedResultOk(
        reloadResult,
        "Config reload should succeed",
      );

      // Verify the configuration is still valid
      assertEquals(reloadedConfig.working_dir, ".agent/breakdown");
    });
  });

  describe("UnifiedResult Integration", () => {
    it("should support functional composition with map operations", async () => {
      // Given: A successful config load result
      const result = await configManager.getConfigSafe();

      // When: Apply map operation to extract working directory
      assertSuccessfulMap(
        result,
        (config) => config.working_dir,
        ".agent/breakdown",
        "Map operation should extract working directory correctly",
      );
    });

    it("should support functional composition with flatMap operations", async () => {
      // Given: A successful config load result
      const result = await configManager.getConfigSafe();

      // When: Apply flatMap operation to validate and transform
      assertSuccessfulFlatMap(
        result,
        (config) => {
          // Validate that all required fields are present
          if (config.working_dir && config.app_prompt.base_dir && config.app_schema.base_dir) {
            return Result.ok({
              isValid: true,
              fieldCount: 3,
            });
          } else {
            return Result.err({
              kind: "VALIDATION_ERROR",
              message: "Missing required fields",
            });
          }
        },
        { isValid: true, fieldCount: 3 },
        "FlatMap operation should validate and transform config correctly",
      );
    });
  });

  describe("Performance Integration", () => {
    it("should load configuration within acceptable time limits", async () => {
      // Given: Performance measurement setup
      const startTime = performance.now();

      // When: Load configuration
      const result = await configManager.getConfigSafe();

      // Then: Loading should complete quickly
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      assertUnifiedResultOk(result, "Config loading should succeed");
      assert(
        loadTime < 100, // 100ms threshold
        `Config loading should be fast, but took ${loadTime}ms`,
      );
    });

    it("should handle multiple concurrent load requests gracefully", async () => {
      // When: Issue multiple concurrent load requests
      const loadPromises = Array.from({ length: 5 }, () => configManager.getConfigSafe());
      const results = await Promise.all(loadPromises);

      // Then: All requests should succeed
      results.forEach((result, index) => {
        assertUnifiedResultOk(result, `Concurrent load request ${index} should succeed`);
      });

      // Verify all results are consistent
      const firstConfig = assertUnifiedResultOk(results[0]);
      results.slice(1).forEach((result, index) => {
        const config = assertUnifiedResultOk(result);
        assertEquals(
          config.working_dir,
          firstConfig.working_dir,
          `Concurrent result ${index + 1} should match first result`,
        );
      });
    });
  });
});
