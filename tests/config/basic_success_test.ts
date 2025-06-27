/**
 * Basic success test for Result operations with mock data
 *
 * This tests the core Result functional patterns without depending
 * on the complex config loading system
 */

import { assert, assertEquals } from "@std/assert";
import { assertUnifiedResultOk } from "../test_helpers/result_test_helpers.ts";
import { Result } from "../../src/types/unified_result.ts";

// Mock config type for testing
interface MockConfig {
  working_dir: string;
  app_prompt: {
    base_dir: string;
  };
  app_schema: {
    base_dir: string;
  };
}

const mockSuccessfulConfig: MockConfig = {
  working_dir: "/test/working/dir",
  app_prompt: {
    base_dir: "/test/prompts",
  },
  app_schema: {
    base_dir: "/test/schemas",
  },
};

Deno.test("Result.ok with mock config data", () => {
  const configResult = Result.ok(mockSuccessfulConfig);

  const config = assertUnifiedResultOk(configResult, "Should successfully create mock config");

  // Verify basic structure
  assert(config.working_dir !== undefined, "Config should have working_dir");
  assert(config.app_prompt !== undefined, "Config should have app_prompt");
  assert(config.app_schema !== undefined, "Config should have app_schema");

  // Verify some expected values
  assertEquals(config.working_dir, "/test/working/dir", "Working dir should match");
  assertEquals(config.app_prompt.base_dir, "/test/prompts", "App prompt base_dir should match");
});

Deno.test("Result.map on successful mock config", () => {
  const configResult = Result.ok(mockSuccessfulConfig);

  // Map to extract just the working directory
  const workingDirResult = Result.map(configResult, (config) => config.working_dir);

  const workingDir = assertUnifiedResultOk(
    workingDirResult,
    "Should successfully map to working dir",
  );
  assertEquals(workingDir, "/test/working/dir", "Working dir should match expected value");
});

Deno.test("Result.flatMap chain with mock config", () => {
  const configResult = Result.ok(mockSuccessfulConfig);

  // Chain operation: load config → extract app_prompt section → validate base_dir
  const baseDirResult = Result.flatMap(configResult, (config) => {
    if (config.app_prompt && config.app_prompt.base_dir) {
      return Result.ok(config.app_prompt.base_dir);
    }
    return Result.err({
      kind: "CONFIG_VALIDATION_ERROR",
      message: "No app prompt base_dir configured",
      timestamp: new Date(),
      path: "app_prompt.base_dir",
      violations: [],
    });
  });

  // Should succeed for mock config
  const baseDir = assertUnifiedResultOk(baseDirResult, "Should extract app prompt base_dir");
  assertEquals(baseDir, "/test/prompts", "Base dir should match expected value");
});

Deno.test("Result.all with multiple mock operations", () => {
  const operations = [
    Result.ok(mockSuccessfulConfig),
    Result.ok(mockSuccessfulConfig), // Same config twice
  ];

  const combinedResult = Result.all(operations);

  const configs = assertUnifiedResultOk(combinedResult, "Should combine multiple config results");
  assertEquals(configs.length, 2, "Should have two configs");

  // Both configs should be equivalent
  assertEquals(
    configs[0].working_dir,
    configs[1].working_dir,
    "Both configs should have same working dir",
  );
});

Deno.test("Mock config transformation chain", () => {
  const configResult = Result.ok(mockSuccessfulConfig);

  // Chain: config → working_dir → uppercase
  const transformedResult = Result.flatMap(configResult, (config) => {
    if (!config.working_dir) {
      return Result.err({
        kind: "CONFIG_VALIDATION_ERROR",
        message: "No working dir found",
        timestamp: new Date(),
        path: "working_dir",
        violations: [],
      });
    }
    return Result.ok(config.working_dir);
  });

  const upperCaseResult = Result.map(
    transformedResult,
    (workingDir: string) => workingDir.toUpperCase(),
  );

  const upperWorkingDir = assertUnifiedResultOk(
    upperCaseResult,
    "Should transform working dir to uppercase",
  );
  assertEquals(upperWorkingDir, "/TEST/WORKING/DIR", "Should be uppercase");
});

Deno.test("Mock config merging success", () => {
  const appConfigResult = Result.ok(mockSuccessfulConfig);

  // Simulate user config override
  const userOverrides = {
    app_prompt: {
      base_dir: "custom-prompt-dir",
      custom_field: "test-value",
    },
  };

  // Merge configs using map
  const mergedResult = Result.map(appConfigResult, (appConfig) => ({
    ...appConfig,
    app_prompt: {
      ...appConfig.app_prompt,
      ...userOverrides.app_prompt,
    },
  }));

  const mergedConfig = assertUnifiedResultOk(mergedResult, "Should successfully merge configs");

  // Verify merge worked
  assertEquals(mergedConfig.app_prompt.base_dir, "custom-prompt-dir", "Should use user override");

  // Verify app config properties are preserved
  assertEquals(mergedConfig.working_dir, "/test/working/dir", "Should preserve working_dir");
  assertEquals(mergedConfig.app_schema.base_dir, "/test/schemas", "Should preserve app_schema");
});

Deno.test("Result.fromPromise with successful async operation", async () => {
  // Simulate async config processing
  const asyncConfigProcessor = async (config: MockConfig) => {
    await new Promise((resolve) => setTimeout(resolve, 1));
    return {
      ...config,
      processed: true,
      processedAt: new Date().toISOString(),
    };
  };

  const config = mockSuccessfulConfig;

  // Use Result.fromPromise to handle the async operation
  const processedResult = await Result.fromPromise(asyncConfigProcessor(config));

  const processedConfig = assertUnifiedResultOk(
    processedResult,
    "Should process config successfully",
  );

  assertEquals(processedConfig.processed, true, "Should mark as processed");
  assert(processedConfig.processedAt !== undefined, "Should have processed timestamp");
  assertEquals(
    processedConfig.working_dir,
    "/test/working/dir",
    "Should preserve original properties",
  );
});

Deno.test("Complex Result chain with mock data", () => {
  // Test a complete workflow using Result operations
  const step1 = Result.ok(mockSuccessfulConfig);

  const step2 = Result.flatMap(step1, (config) => {
    // Extract working directory
    return Result.ok(config.working_dir);
  });

  const step3 = Result.map(step2, (workingDir) => {
    // Transform to path parts
    return workingDir.split("/").filter((part) => part.length > 0);
  });

  const step4 = Result.flatMap(step3, (parts) => {
    // Validate has at least 2 parts
    if (parts.length >= 2) {
      return Result.ok(parts.join("_"));
    }
    return Result.err({
      kind: "CONFIG_VALIDATION_ERROR",
      message: "Path too short",
      timestamp: new Date(),
      path: "working_dir",
      violations: [],
    });
  });

  const finalResult = assertUnifiedResultOk(step4, "Should complete complex chain");
  assertEquals(finalResult, "test_working_dir", "Should transform path correctly");
});
