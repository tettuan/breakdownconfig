/**
 * Success path tests for Result type and safe APIs
 * Tests all successful operations using the new Result-based API
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { ConfigManager } from "../../src/config_manager.ts";
import { AppConfigLoader } from "../../src/loaders/app_config_loader.ts";
import { UserConfigLoader } from "../../src/loaders/user_config_loader.ts";
import { Result } from "../../src/types/unified_result.ts";
import { cleanupTestConfigs, setupMergeConfigs } from "../test_utils.ts";
import { assertUnifiedResultOk } from "../test_helpers/result_test_helpers.ts";
import { ErrorFactories } from "../../src/errors/unified_errors.ts";

describe("Success Path Tests", () => {
  it("BreakdownConfig.getConfigSafe - successful config retrieval", async () => {
    const tempDir = await setupMergeConfigs();
    try {
      const config = new BreakdownConfig("", tempDir);
      await config.loadConfig();

      const result = await config.getConfigSafe();
      const configData = assertUnifiedResultOk(result);
      assertEquals(configData.working_dir, ".agent/breakdown");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("ConfigManager.getConfigSafe - successful config retrieval", async () => {
    const tempDir = await setupMergeConfigs();
    try {
      const appLoader = new AppConfigLoader("", tempDir);
      const userLoader = new UserConfigLoader("", tempDir);
      const manager = new ConfigManager(appLoader, userLoader);

      const result = await manager.getConfigSafe();
      const configData = assertUnifiedResultOk(result);
      assertEquals(configData.working_dir, ".agent/breakdown");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("Result.map on successful config load", async () => {
    const tempDir = await setupMergeConfigs();
    try {
      const appLoader = new AppConfigLoader("", tempDir);
      const userLoader = new UserConfigLoader("", tempDir);
      const manager = new ConfigManager(appLoader, userLoader);

      const result = await manager.getConfigSafe();
      const mapped = Result.map(result, (config) => config.working_dir);

      const workingDir = assertUnifiedResultOk(mapped);
      assertEquals(workingDir, ".agent/breakdown");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("Result.flatMap chain with config loading", async () => {
    const tempDir = await setupMergeConfigs();
    try {
      const appLoader = new AppConfigLoader("", tempDir);
      const userLoader = new UserConfigLoader("", tempDir);
      const manager = new ConfigManager(appLoader, userLoader);

      const result = await manager.getConfigSafe();
      const chained = Result.flatMap(result, (config) => {
        if (config.working_dir) {
          return Result.ok(join(tempDir, config.working_dir));
        }
        return Result.err(ErrorFactories.configValidationError(
          tempDir,
          [{
            field: "working_dir",
            value: undefined,
            expectedType: "string",
            actualType: "undefined",
          }],
        ));
      });

      const fullPath = assertUnifiedResultOk(chained);
      assertEquals(fullPath, join(tempDir, ".agent/breakdown"));
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("Result.all with multiple config operations", async () => {
    const tempDir = await setupMergeConfigs();
    try {
      const appLoader = new AppConfigLoader("", tempDir);
      const userLoader = new UserConfigLoader("", tempDir);
      const manager = new ConfigManager(appLoader, userLoader);

      const configResult = await manager.getConfigSafe();

      // Only proceed if config loaded successfully
      if (configResult.success) {
        const results = [
          Result.map(configResult, (c) => c.working_dir),
          Result.map(configResult, (c) => c.app_prompt.base_dir),
          Result.map(configResult, (c) => c.app_schema.base_dir),
        ];

        const combined = Result.all(results);
        const values = assertUnifiedResultOk(combined);
        assertEquals(values, [".agent/breakdown", "custom/prompts", "breakdown/schema/app"]);
      } else {
        throw new Error("Config loading failed");
      }
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("Config loading with Result.unwrapOr fallback", async () => {
    const tempDir = await setupMergeConfigs();
    try {
      const appLoader = new AppConfigLoader("", tempDir);
      const userLoader = new UserConfigLoader("", tempDir);
      const manager = new ConfigManager(appLoader, userLoader);

      const result = await manager.getConfigSafe();
      const workingDir = Result.unwrapOr(
        Result.map(result, (c) => c.working_dir),
        "default-output",
      );

      assertEquals(workingDir, ".agent/breakdown");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("Successful config transformation chain", async () => {
    const tempDir = await setupMergeConfigs();
    try {
      const appLoader = new AppConfigLoader("", tempDir);
      const userLoader = new UserConfigLoader("", tempDir);
      const manager = new ConfigManager(appLoader, userLoader);

      const result = await manager.getConfigSafe();
      const transformed = Result.map(result, (config) => ({
        paths: {
          working: config.working_dir,
          prompts: config.app_prompt.base_dir,
          schemas: config.app_schema.base_dir,
        },
      }));

      const transformedData = assertUnifiedResultOk(transformed);
      assertEquals(transformedData.paths.working, ".agent/breakdown");
      assertEquals(transformedData.paths.prompts, "custom/prompts");
      assertEquals(transformedData.paths.schemas, "breakdown/schema/app");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("Config validation success with valid structure", async () => {
    const tempDir = await setupMergeConfigs();
    try {
      const appLoader = new AppConfigLoader("", tempDir);
      const userLoader = new UserConfigLoader("", tempDir);
      const manager = new ConfigManager(appLoader, userLoader);

      const result = await manager.getConfigSafe();
      const configData = assertUnifiedResultOk(result);

      // Validate structure
      assertExists(configData.working_dir);
      assertExists(configData.app_prompt);
      assertExists(configData.app_schema);
      assertExists(configData.app_prompt.base_dir);
      assertExists(configData.app_schema.base_dir);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("Nested property access success", async () => {
    const tempDir = await setupMergeConfigs();
    try {
      const appLoader = new AppConfigLoader("", tempDir);
      const userLoader = new UserConfigLoader("", tempDir);
      const manager = new ConfigManager(appLoader, userLoader);

      const result = await manager.getConfigSafe();
      const promptBase = Result.map(result, (c) => c.app_prompt.base_dir);
      const schemaBase = Result.map(result, (c) => c.app_schema.base_dir);

      const promptValue = assertUnifiedResultOk(promptBase);
      const schemaValue = assertUnifiedResultOk(schemaBase);
      assertEquals(promptValue, "custom/prompts");
      assertEquals(schemaValue, "breakdown/schema/app");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  it("Result.fromPromise with successful async operation", async () => {
    const asyncOperation = async () => {
      return { success: true, data: "async result" };
    };

    const result = await Result.fromPromise(asyncOperation());
    const data = assertUnifiedResultOk(result);
    assertEquals(data.success, true);
    assertEquals(data.data, "async result");
  });
});
