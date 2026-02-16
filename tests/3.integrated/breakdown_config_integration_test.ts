/**
 * Integration Tests for BreakdownConfig
 * Level 3: Verifies complete integration flows with Total Function design
 */

import { assert, assertEquals, assertExists, assertRejects, assertThrows } from "@std/assert";
import { BreakdownConfig } from "../../mod.ts";
import type { Result as _Result } from "../../src/types/unified_result.ts";
import type { UnifiedError as _UnifiedError } from "../../src/errors/unified_errors.ts";
import {
  cleanupTestConfigs,
  setupAppConfigOnly,
  setupInvalidConfig,
  setupMergeConfigs,
} from "../test_utils.ts";

Deno.test("Integration: BreakdownConfig Total Function Complete Flow", async (t) => {
  // deno-lint-ignore no-console
  console.log("Testing BreakdownConfig complete integration flow with Total Function principles");

  await t.step("Smart Constructor integration with valid inputs", () => {
    // Test 1: Default parameters
    const defaultResult = BreakdownConfig.create();
    assert(defaultResult.success, "Default parameters should succeed");
    if (defaultResult.success) {
      assertExists(defaultResult.data);
      assert(defaultResult.data instanceof BreakdownConfig);
    }

    // Test 2: With valid profile
    const profileResult = BreakdownConfig.create("production");
    assert(profileResult.success, "Valid profile should succeed");
    if (profileResult.success) {
      assertExists(profileResult.data);
    }

    // Test 3: With valid profile and baseDir
    const bothResult = BreakdownConfig.create("staging", "/tmp/test");
    assert(bothResult.success, "Valid parameters should succeed");
  });

  await t.step("Smart Constructor integration with invalid inputs", () => {
    // Test invalid profile names
    const invalidProfiles = [
      "invalid@profile",
      "profile!",
      "profile with spaces",
      "profile#hash",
    ];

    for (const profile of invalidProfiles) {
      const result = BreakdownConfig.create(profile);
      assert(!result.success, `Profile "${profile}" should fail`);
      if (!result.success) {
        assertEquals(result.error.kind, "CONFIG_VALIDATION_ERROR");
      }
    }
  });
});

Deno.test("Integration: Safe Method APIs with Result Pattern", async (t) => {
  await t.step("loadConfigSafe with successful configuration", async () => {
    const tempDir = await setupAppConfigOnly();
    try {
      const configResult = BreakdownConfig.create(undefined, tempDir);
      if (!configResult.success) {
        throw new Error("Failed to create config");
      }

      const config = configResult.data;
      const loadResult = await config.loadConfigSafe();

      assert(loadResult.success, "loadConfigSafe should succeed");
      // loadConfigSafe returns void, not the config data
      // We need to call getConfigSafe to get the actual config
      if (loadResult.success) {
        const configResult = await config.getConfigSafe();
        assert(configResult.success);
        if (configResult.success) {
          assertExists(configResult.data.working_dir);
          assertExists(configResult.data.app_prompt);
          assertExists(configResult.data.app_schema);
        }
      }
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  await t.step("loadConfigSafe with missing configuration", async () => {
    const configResult = BreakdownConfig.create("nonexistent", "/nonexistent/path");
    if (!configResult.success) {
      throw new Error("Failed to create config");
    }

    const config = configResult.data;
    const loadResult = await config.loadConfigSafe();

    assert(!loadResult.success, "loadConfigSafe should fail gracefully");
    if (!loadResult.success) {
      assertEquals(loadResult.error.kind, "CONFIG_FILE_NOT_FOUND");
    }
  });

  await t.step("getConfigSafe before loading", async () => {
    const configResult = BreakdownConfig.create();
    if (!configResult.success) {
      throw new Error("Failed to create config");
    }

    const config = configResult.data;
    const getResult = await config.getConfigSafe();

    assert(!getResult.success, "getConfigSafe should fail before loading");
    if (!getResult.success) {
      assertEquals(getResult.error.kind, "CONFIG_NOT_LOADED");
    }
  });

  await t.step("getWorkingDirSafe integration flow", async () => {
    const tempDir = await setupAppConfigOnly();
    try {
      const configResult = BreakdownConfig.create(undefined, tempDir);
      if (!configResult.success) {
        throw new Error("Failed to create config");
      }

      const config = configResult.data;

      // Before loading
      const beforeResult = await config.getWorkingDirSafe();
      assert(!beforeResult.success);
      if (!beforeResult.success) {
        assertEquals(beforeResult.error.kind, "CONFIG_NOT_LOADED");
      }

      // After loading
      await config.loadConfig();
      const afterResult = await config.getWorkingDirSafe();
      assert(afterResult.success);
      if (afterResult.success) {
        assertExists(afterResult.data);
      }
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
});

Deno.test("Integration: Error Propagation and Recovery", async (t) => {
  await t.step("Complete error flow with invalid YAML", async () => {
    const invalidYamlConfig = `
working_dir: ./.agent/climpt
app_prompt:
  base_dir: ./.agent/climpt/prompts/app
  invalid yaml here
app_schema:
  base_dir: ./.agent/climpt/schema/app
`;

    const tempDir = await Deno.makeTempDir();
    const configDir = `${tempDir}/.agent/climpt/config`;
    await Deno.mkdir(configDir, { recursive: true });
    await Deno.writeTextFile(`${configDir}/app.yml`, invalidYamlConfig);
    try {
      const configResult = BreakdownConfig.create(undefined, tempDir);
      if (!configResult.success) {
        throw new Error("Failed to create config");
      }

      const config = configResult.data;

      // Safe method should handle gracefully
      const loadResult = await config.loadConfigSafe();
      assert(!loadResult.success);
      if (!loadResult.success) {
        assertEquals(loadResult.error.kind, "CONFIG_PARSE_ERROR");
      }

      // Throwing method should throw
      await assertRejects(
        async () => await config.loadConfig(),
        Error,
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  await t.step("Complete error flow with validation failures", async () => {
    const invalidConfig = {
      "working_dir": "", // Empty working_dir
      "app_prompt": {
        "base_dir": "../../../escape", // Path traversal attempt
      },
      "app_schema": {
        "base_dir": "/absolute/path", // Absolute path where relative expected
      },
    };

    const tempDir = await setupInvalidConfig(invalidConfig);
    try {
      const configResult = BreakdownConfig.create(undefined, tempDir);
      if (!configResult.success) {
        throw new Error("Failed to create config");
      }

      const config = configResult.data;
      const loadResult = await config.loadConfigSafe();

      assert(!loadResult.success);
      if (!loadResult.success) {
        // Should be validation error
        assertExists(loadResult.error.kind);
      }
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
});

Deno.test("Integration: Complete Configuration Lifecycle", async (t) => {
  await t.step("Full lifecycle: create -> load -> access -> get paths", async () => {
    const tempDir = await setupMergeConfigs();
    try {
      // Step 1: Create configuration
      const createResult = BreakdownConfig.create(undefined, tempDir);
      assert(createResult.success);
      if (!createResult.success) {
        throw new Error("Create failed");
      }

      const config = createResult.data;

      // Step 2: Load configuration
      const loadResult = await config.loadConfigSafe();
      assert(loadResult.success);
      if (!loadResult.success) {
        throw new Error("Load failed");
      }

      // Step 3: Access configuration
      const configResult = await config.getConfigSafe();
      assert(configResult.success);
      if (configResult.success) {
        assertExists(configResult.data.working_dir);
        assertExists(configResult.data.app_prompt);
        assertExists(configResult.data.app_schema);
      }

      // Step 4: Get derived paths
      const workingDirResult = await config.getWorkingDirSafe();
      assert(workingDirResult.success);

      const promptDirResult = await config.getPromptDirSafe();
      assert(promptDirResult.success);

      const schemaDirResult = await config.getSchemaDirSafe();
      assert(schemaDirResult.success);

      // Verify all paths exist
      if (workingDirResult.success && promptDirResult.success && schemaDirResult.success) {
        assertExists(workingDirResult.data);
        assertExists(promptDirResult.data);
        assertExists(schemaDirResult.data);
      }
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  await t.step("Profile-based lifecycle: multiple profiles", async () => {
    const profiles = ["development", "staging", "production"];

    for (const profile of profiles) {
      // deno-lint-ignore no-await-in-loop
      const tempDir = await setupAppConfigOnly();
      try {
        // Create profile-specific config
        const createResult = BreakdownConfig.create(profile, tempDir);
        assert(createResult.success);

        if (createResult.success) {
          const config = createResult.data;

          // Each profile should work independently
          // deno-lint-ignore no-await-in-loop
          const loadResult = await config.loadConfigSafe();

          // loadConfigSafe might fail if profile config doesn't exist
          // This is expected behavior - profiles are optional
          if (loadResult.success) {
            const configData = loadResult.data;
            assertExists(configData);
          } else {
            // Should be CONFIG_FILE_NOT_FOUND for missing profile config
            assertEquals(loadResult.error.kind, "CONFIG_FILE_NOT_FOUND");
          }
        }
      } finally {
        // deno-lint-ignore no-await-in-loop
        await cleanupTestConfigs(tempDir);
      }
    }
  });
});

Deno.test("Integration: Result Type Chaining and Composition", async (t) => {
  await t.step("Result chain: create -> load -> get -> transform", async () => {
    const tempDir = await setupAppConfigOnly();
    try {
      // Demonstrate Result type chaining
      const finalResult = await (async () => {
        // Step 1: Create
        const createResult = BreakdownConfig.create(undefined, tempDir);
        if (!createResult.success) {
          return createResult;
        }

        // Step 2: Load
        const config = createResult.data;
        const loadResult = await config.loadConfigSafe();
        if (!loadResult.success) {
          return loadResult;
        }

        // Step 3: Get config
        const configResult = await config.getConfigSafe();
        if (!configResult.success) {
          return configResult;
        }

        // Step 4: Transform (example)
        const transformedData = {
          paths: {
            working: configResult.data.working_dir,
            prompts: configResult.data.app_prompt.base_dir,
            schemas: configResult.data.app_schema.base_dir,
          },
          hasFiles: {
            prompts: "files" in configResult.data.app_prompt &&
              Array.isArray(
                (configResult.data.app_prompt as unknown as Record<string, unknown>).files,
              ),
            schemas: "files" in configResult.data.app_schema &&
              Array.isArray(
                (configResult.data.app_schema as unknown as Record<string, unknown>).files,
              ),
          },
        };

        return { success: true as const, data: transformedData };
      })();

      assert(finalResult.success);
      if (finalResult.success) {
        assertExists(finalResult.data.paths);
        assertExists(finalResult.data.hasFiles);
      }
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
});

Deno.test("Integration: Legacy API Compatibility", async (t) => {
  await t.step("createLegacy should work with existing code patterns", async () => {
    const tempDir = await setupAppConfigOnly();
    try {
      // Legacy pattern that throws
      const config = BreakdownConfig.createLegacy(undefined, tempDir);
      assertExists(config);
      assert(config instanceof BreakdownConfig);

      // Should be able to use normally
      await config.loadConfig();
      const configData = await config.getConfig();
      assertExists(configData.working_dir);
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  await t.step("createLegacy should throw on invalid inputs", () => {
    assertThrows(
      () => BreakdownConfig.createLegacy("invalid@profile"),
      Error,
      "ERR1002: Configuration validation failed",
    );
  });
});

// deno-lint-ignore no-console
console.log("BreakdownConfig integration tests complete - Total Function principles verified");
