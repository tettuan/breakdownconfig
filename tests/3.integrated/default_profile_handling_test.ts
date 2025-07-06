import { assertEquals } from "@std/assert";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { ProfileConfigLoader } from "../../src/loaders/profile_config_loader.ts";
import { ConfigProfileGuards, ConfigProfileHelpers } from "../../src/types/merged_config.ts";
import { setupValidConfig, cleanupTestConfigs } from "../test_utils.ts";

Deno.test("Default Profile Handling", async (t) => {
  await t.step("should treat 'default' profile prefix same as undefined", async () => {
    const tempDir = await setupValidConfig();
    try {
      // Create profile loaders directly to test the file name generation
      const undefinedLoader = new ProfileConfigLoader(undefined, tempDir);
      const defaultLoader = new ProfileConfigLoader("default", tempDir);

      // Load both profiles
      const undefinedResult = await undefinedLoader.load();
      const defaultResult = await defaultLoader.load();

      if (!undefinedResult.success) {
        throw new Error(`Profile loading failed: ${undefinedResult.error}`);
      }
      if (!defaultResult.success) {
        throw new Error(`Profile loading failed: ${defaultResult.error}`);
      }

      const undefinedProfile = undefinedResult.data;
      const defaultProfile = defaultResult.data;

      // Both should be recognized as default profiles
      assertEquals(ConfigProfileGuards.isDefaultProfile(undefinedProfile), true);
      assertEquals(ConfigProfileGuards.isDefaultProfile(defaultProfile), true);

      // Both should have same display name
      assertEquals(ConfigProfileHelpers.getProfileDisplayName(undefinedProfile), "default");
      assertEquals(ConfigProfileHelpers.getProfileDisplayName(defaultProfile), "default");

      // Both should NOT be named profiles
      assertEquals(ConfigProfileGuards.isNamedProfile(undefinedProfile), false);
      assertEquals(ConfigProfileGuards.isNamedProfile(defaultProfile), false);

      // Both should have same working directory
      assertEquals(undefinedProfile.config.working_dir, defaultProfile.config.working_dir);

      // Both should have same prompt directory
      assertEquals(undefinedProfile.config.app_prompt.base_dir, defaultProfile.config.app_prompt.base_dir);

      // Both should have same schema directory
      assertEquals(undefinedProfile.config.app_schema.base_dir, defaultProfile.config.app_schema.base_dir);

    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });

  await t.step("should use same config file paths for 'default' and undefined profiles", async () => {
    const tempDir = await setupValidConfig();
    try {
      // Create BreakdownConfig instances
      const undefinedResult = BreakdownConfig.create(undefined, tempDir);
      const defaultResult = BreakdownConfig.create("default", tempDir);

      if (!undefinedResult.success) {
        throw new Error(`Config creation failed: ${undefinedResult.error}`);
      }
      if (!defaultResult.success) {
        throw new Error(`Config creation failed: ${defaultResult.error}`);
      }

      const undefinedConfig = undefinedResult.data;
      const defaultConfig = defaultResult.data;

      // Load both configs
      await undefinedConfig.loadConfig();
      await defaultConfig.loadConfig();

      // Both should have same working directory
      const undefinedWorkingDir = await undefinedConfig.getWorkingDir();
      const defaultWorkingDir = await defaultConfig.getWorkingDir();
      assertEquals(undefinedWorkingDir, defaultWorkingDir);

      // Both should have same prompt directory
      const undefinedPromptDir = await undefinedConfig.getPromptDir();
      const defaultPromptDir = await defaultConfig.getPromptDir();
      assertEquals(undefinedPromptDir, defaultPromptDir);

      // Both should have same schema directory
      const undefinedSchemaDir = await undefinedConfig.getSchemaDir();
      const defaultSchemaDir = await defaultConfig.getSchemaDir();
      assertEquals(undefinedSchemaDir, defaultSchemaDir);

    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
});
