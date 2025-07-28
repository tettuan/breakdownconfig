/**
 * Profile Integration Tests
 *
 * Purpose:
 * Test the complete profile management functionality including:
 * - ConfigProfile Discriminated Union behavior
 * - App-only and merged profile states
 * - Profile name validation
 * - Integration with BreakdownConfig
 *
 * Test Cases:
 * 1. Profile creation and loading
 * 2. Discriminated union type safety
 * 3. Profile name validation rules
 * 4. State transitions between app-only and merged
 * 5. Integration with configuration loading
 */

import { assertEquals, assertExists, assertRejects as _assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { BreakdownConfig } from "../../mod.ts";
import {
  type AppConfig,
  AppOnlyProfile as _AppOnlyProfile,
  ConfigProfile as _ConfigProfile,
  ConfigProfileFactory,
  ConfigProfileGuards,
  ConfigProfileHelpers,
  MergedProfile as _MergedProfile,
  type UserConfig as _UserConfig,
} from "../../src/types/merged_config.ts";
import { UserConfigFactory } from "../../src/types/user_config.ts";
import { cleanupTestConfigs, setupValidConfig } from "../test_utils.ts";
import {
  assertResultError,
  assertResultErrorKind,
  assertResultSuccess,
} from "../test_helpers/result_test_helpers.ts";

describe("Profile Integration Tests", () => {
  describe("ConfigProfile Discriminated Union", () => {
    it("should correctly identify app-only profiles", async () => {
      const tempDir = await setupValidConfig();
      try {
        const configResult = BreakdownConfig.create(undefined, tempDir);
        if (!configResult.success) {
          throw new Error(
            `Config creation failed: ${
              configResult.error instanceof Error
                ? configResult.error.message
                : String(configResult.error)
            }`,
          );
        }
        const config = configResult.data;

        await config.loadConfig();

        // When no user config exists, should be app-only
        const mockAppConfig: AppConfig = {
          working_dir: "./workspace",
          app_prompt: { base_dir: "./prompts" },
          app_schema: { base_dir: "./schema" },
        };

        const profileResult = ConfigProfileFactory.createAppOnly(
          mockAppConfig,
          undefined,
          `${tempDir}/.agent/clipmt/config/app.yml`,
          true,
        );

        assertResultSuccess(profileResult);
        if (!profileResult.success) throw new Error("Profile creation should have succeeded");
        const profile = profileResult.data;

        // Verify discriminated union
        assertEquals(profile.kind, "app-only");
        assertEquals(ConfigProfileGuards.isAppOnly(profile), true);
        assertEquals(ConfigProfileGuards.isMerged(profile), false);
        assertEquals(profile.source.userConfigExists, false);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should correctly identify merged profiles", async () => {
      const tempDir = await setupValidConfig();
      try {
        const mockAppConfig: AppConfig = {
          working_dir: "./workspace",
          app_prompt: { base_dir: "./prompts/app" },
          app_schema: { base_dir: "./schema/app" },
        };

        const userConfig = UserConfigFactory.createComplete(
          "./prompts/user",
          "./schema/user",
        );

        const profileResult = ConfigProfileFactory.createMerged(
          mockAppConfig,
          userConfig,
          undefined,
          `${tempDir}/.agent/clipmt/config/app.yml`,
          `${tempDir}/.agent/clipmt/config/user.yml`,
        );

        assertResultSuccess(profileResult);
        if (!profileResult.success) throw new Error("Profile creation should have succeeded");
        const profile = profileResult.data;

        // Verify discriminated union
        assertEquals(profile.kind, "merged");
        assertEquals(ConfigProfileGuards.isMerged(profile), true);
        assertEquals(ConfigProfileGuards.isAppOnly(profile), false);
        assertEquals(profile.source.userConfigExists, true);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should handle state transitions correctly", async () => {
      const tempDir = await setupValidConfig();
      try {
        const mockAppConfig: AppConfig = {
          working_dir: "./workspace",
          app_prompt: { base_dir: "./prompts" },
          app_schema: { base_dir: "./schema" },
        };

        // Start with app-only
        const appOnlyResult = ConfigProfileFactory.createAppOnly(
          mockAppConfig,
          "development",
          `${tempDir}/app.yml`,
          false,
        );

        assertResultSuccess(appOnlyResult);
        if (!appOnlyResult.success) {
          throw new Error("App-only profile creation should have succeeded");
        }
        const appOnly = appOnlyResult.data;
        assertEquals(appOnly.kind, "app-only");

        // Transition to merged with user config
        const userConfig = UserConfigFactory.createPromptOnly("./prompts/custom");
        const mergedResult = ConfigProfileFactory.createMerged(
          mockAppConfig,
          userConfig,
          "development",
          `${tempDir}/app.yml`,
          `${tempDir}/user.yml`,
        );

        assertResultSuccess(mergedResult);
        if (!mergedResult.success) throw new Error("Merged profile creation should have succeeded");
        const merged = mergedResult.data;
        assertEquals(merged.kind, "merged");
        assertEquals(merged.profileName, appOnly.profileName);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });

  describe("Profile Name Validation", () => {
    it("should accept valid profile names", () => {
      const mockAppConfig: AppConfig = {
        working_dir: "./workspace",
        app_prompt: { base_dir: "./prompts" },
        app_schema: { base_dir: "./schema" },
      };

      const validNames = [
        "production",
        "development",
        "staging",
        "test",
        "local_dev",
        "feature_branch",
        "v2_migration",
      ];

      for (const name of validNames) {
        const result = ConfigProfileFactory.createAppOnly(
          mockAppConfig,
          name,
          "/test/app.yml",
          false,
        );

        assertResultSuccess(result);
        if (!result.success) throw new Error("Profile creation should have succeeded");
        assertEquals(result.data.profileName, name);
      }
    });

    it("should handle default profile (undefined name)", () => {
      const mockAppConfig: AppConfig = {
        working_dir: "./workspace",
        app_prompt: { base_dir: "./prompts" },
        app_schema: { base_dir: "./schema" },
      };

      const result = ConfigProfileFactory.createAppOnly(
        mockAppConfig,
        undefined,
        "/test/app.yml",
        false,
      );

      assertResultSuccess(result);
      if (!result.success) throw new Error("Profile creation should have succeeded");
      assertEquals(result.data.profileName, undefined);
      assertEquals(ConfigProfileGuards.isDefaultProfile(result.data), true);
      assertEquals(ConfigProfileHelpers.getProfileDisplayName(result.data), "default");
    });

    it("should maintain profile name consistency", () => {
      const mockAppConfig: AppConfig = {
        working_dir: "./workspace",
        app_prompt: { base_dir: "./prompts" },
        app_schema: { base_dir: "./schema" },
      };

      const profileName = "test_profile";

      // Create app-only profile
      const appOnlyResult = ConfigProfileFactory.createAppOnly(
        mockAppConfig,
        profileName,
        "/test/app.yml",
        false,
      );

      // Create merged profile with same name
      const userConfig = UserConfigFactory.createEmpty();
      const mergedResult = ConfigProfileFactory.createMerged(
        mockAppConfig,
        userConfig,
        profileName,
        "/test/app.yml",
        "/test/user.yml",
      );

      assertResultSuccess(appOnlyResult);
      assertResultSuccess(mergedResult);

      if (!appOnlyResult.success) {
        throw new Error("App-only profile creation should have succeeded");
      }
      if (!mergedResult.success) throw new Error("Merged profile creation should have succeeded");

      assertEquals(appOnlyResult.data.profileName, profileName);
      assertEquals(mergedResult.data.profileName, profileName);
      assertEquals(ConfigProfileGuards.isNamedProfile(appOnlyResult.data), true);
      assertEquals(ConfigProfileGuards.isNamedProfile(mergedResult.data), true);
    });
  });

  describe("App-Only and Merged State Verification", () => {
    it("should correctly handle app-only state", () => {
      const mockAppConfig: AppConfig = {
        working_dir: "./workspace",
        app_prompt: { base_dir: "./prompts/app" },
        app_schema: { base_dir: "./schema/app" },
      };

      const result = ConfigProfileFactory.createAppOnly(
        mockAppConfig,
        "app_only_test",
        "/config/app.yml",
        true,
      );

      assertResultSuccess(result);
      if (!result.success) throw new Error("Profile creation should have succeeded");
      const profile = result.data;

      // Verify app-only specific properties
      assertEquals(profile.kind, "app-only");
      assertEquals(profile.source.userConfigAttempted, true);
      assertEquals(profile.source.userConfigExists, false);
      assertEquals(profile.config.working_dir, "./workspace");
      assertEquals(profile.config.app_prompt.base_dir, "./prompts/app");
      assertEquals(profile.config.app_schema.base_dir, "./schema/app");

      // Helper functions should work correctly
      assertEquals(ConfigProfileHelpers.getWorkingDir(profile), "./workspace");
      assertEquals(ConfigProfileHelpers.getPromptBaseDir(profile), "./prompts/app");
      assertEquals(ConfigProfileHelpers.getSchemaBaseDir(profile), "./schema/app");
      assertEquals(ConfigProfileHelpers.hasUserCustomization(profile), false);
    });

    it("should correctly handle merged state with user overrides", () => {
      const mockAppConfig: AppConfig = {
        working_dir: "./workspace",
        app_prompt: { base_dir: "./prompts/app" },
        app_schema: { base_dir: "./schema/app" },
      };

      // User config with overrides
      const userConfig = UserConfigFactory.createComplete(
        "./prompts/user",
        "./schema/user",
      );

      const result = ConfigProfileFactory.createMerged(
        mockAppConfig,
        userConfig,
        "merged_test",
        "/config/app.yml",
        "/config/user.yml",
      );

      assertResultSuccess(result);
      if (!result.success) throw new Error("Profile creation should have succeeded");
      const profile = result.data;

      // Verify merged specific properties
      assertEquals(profile.kind, "merged");
      assertEquals(profile.source.userConfigExists, true);
      assertEquals(profile.source.userConfigPath, "/config/user.yml");

      // Working dir should not be overridden
      assertEquals(profile.config.working_dir, "./workspace");

      // Prompt and schema dirs should be overridden
      assertEquals(profile.config.app_prompt.base_dir, "./prompts/user");
      assertEquals(profile.config.app_schema.base_dir, "./schema/user");

      // Helper functions should reflect overrides
      assertEquals(ConfigProfileHelpers.getPromptBaseDir(profile), "./prompts/user");
      assertEquals(ConfigProfileHelpers.getSchemaBaseDir(profile), "./schema/user");
      assertEquals(ConfigProfileHelpers.hasUserCustomization(profile), true);
      assertEquals(ConfigProfileHelpers.getUserConfigPath(profile), "/config/user.yml");
    });

    it("should handle partial user configs in merged state", () => {
      const mockAppConfig: AppConfig = {
        working_dir: "./workspace",
        app_prompt: { base_dir: "./prompts/app" },
        app_schema: { base_dir: "./schema/app" },
      };

      // Test with prompt-only user config
      const promptOnlyUser = UserConfigFactory.createPromptOnly("./prompts/custom");
      const promptResult = ConfigProfileFactory.createMerged(
        mockAppConfig,
        promptOnlyUser,
        "partial_test",
        "/config/app.yml",
        "/config/user.yml",
      );

      assertResultSuccess(promptResult);
      if (!promptResult.success) throw new Error("Prompt profile creation should have succeeded");
      const promptProfile = promptResult.data;

      // Prompt should be overridden, schema should use app default
      assertEquals(promptProfile.config.app_prompt.base_dir, "./prompts/custom");
      assertEquals(promptProfile.config.app_schema.base_dir, "./schema/app");

      // Test with schema-only user config
      const schemaOnlyUser = UserConfigFactory.createSchemaOnly("./schema/custom");
      const schemaResult = ConfigProfileFactory.createMerged(
        mockAppConfig,
        schemaOnlyUser,
        "partial_test",
        "/config/app.yml",
        "/config/user.yml",
      );

      assertResultSuccess(schemaResult);
      if (!schemaResult.success) throw new Error("Schema profile creation should have succeeded");
      const schemaProfile = schemaResult.data;

      // Schema should be overridden, prompt should use app default
      assertEquals(schemaProfile.config.app_prompt.base_dir, "./prompts/app");
      assertEquals(schemaProfile.config.app_schema.base_dir, "./schema/custom");
    });
  });

  describe("Integration with BreakdownConfig", () => {
    it("should integrate with BreakdownConfig loading", async () => {
      const tempDir = await setupValidConfig();
      try {
        // Create config without profile (use default)
        const configResult = BreakdownConfig.create(undefined, tempDir);
        if (!configResult.success) {
          throw new Error(
            `Config creation failed: ${
              configResult.error instanceof Error
                ? configResult.error.message
                : String(configResult.error)
            }`,
          );
        }
        const config = configResult.data;

        // Load configuration
        await config.loadConfig();
        const settings = await config.getConfig();

        // Verify configuration loaded correctly
        assertExists(settings.working_dir);
        assertExists(settings.app_prompt.base_dir);
        assertExists(settings.app_schema.base_dir);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should handle profile-specific configuration paths", async () => {
      const tempDir = await setupValidConfig();
      try {
        // Test with default profile
        const defaultResult = BreakdownConfig.create(undefined, tempDir);
        if (!defaultResult.success) {
          throw new Error(
            `Config creation failed: ${
              defaultResult.error instanceof Error
                ? defaultResult.error.message
                : String(defaultResult.error)
            }`,
          );
        }
        const defaultConfig = defaultResult.data;

        // Load and verify default profile
        await defaultConfig.loadConfig();
        const defaultSettings = await defaultConfig.getConfig();

        assertExists(defaultSettings);
        assertExists(defaultSettings.working_dir);
        assertExists(defaultSettings.app_prompt.base_dir);
        assertExists(defaultSettings.app_schema.base_dir);

        // Verify path resolution works correctly
        const workingDir = await defaultConfig.getWorkingDir();
        const promptDir = await defaultConfig.getPromptDir();
        const schemaDir = await defaultConfig.getSchemaDir();

        assertExists(workingDir);
        assertExists(promptDir);
        assertExists(schemaDir);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should validate configuration constraints", () => {
      const invalidAppConfig: AppConfig = {
        working_dir: "", // Invalid empty string
        app_prompt: { base_dir: "./prompts" },
        app_schema: { base_dir: "./schema" },
      };

      const result = ConfigProfileFactory.createAppOnly(
        invalidAppConfig,
        "invalid_test",
        "/config/app.yml",
        false,
      );

      assertResultError(result);
      assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle missing required fields", () => {
      const incompleteAppConfig = {
        working_dir: "./workspace",
        // Missing app_prompt and app_schema
      } as AppConfig;

      const result = ConfigProfileFactory.createAppOnly(
        incompleteAppConfig,
        "incomplete",
        "/config/app.yml",
        false,
      );

      assertResultError(result);
      assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
    });

    it("should handle empty user config gracefully", () => {
      const mockAppConfig: AppConfig = {
        working_dir: "./workspace",
        app_prompt: { base_dir: "./prompts/app" },
        app_schema: { base_dir: "./schema/app" },
      };

      const emptyUser = UserConfigFactory.createEmpty();
      const result = ConfigProfileFactory.createMerged(
        mockAppConfig,
        emptyUser,
        "empty_user",
        "/config/app.yml",
        "/config/user.yml",
      );

      assertResultSuccess(result);
      if (!result.success) throw new Error("Profile creation should have succeeded");
      const profile = result.data;

      // Should use app defaults when user config is empty
      assertEquals(profile.config.app_prompt.base_dir, "./prompts/app");
      assertEquals(profile.config.app_schema.base_dir, "./schema/app");
    });

    it("should maintain immutability of profiles", () => {
      const mockAppConfig: AppConfig = {
        working_dir: "./workspace",
        app_prompt: { base_dir: "./prompts" },
        app_schema: { base_dir: "./schema" },
      };

      const result = ConfigProfileFactory.createAppOnly(
        mockAppConfig,
        "immutable_test",
        "/config/app.yml",
        false,
      );

      assertResultSuccess(result);
      if (!result.success) throw new Error("Profile creation should have succeeded");
      const profile = result.data;

      // Verify readonly properties
      assertEquals(profile.kind, "app-only");
      assertEquals(typeof profile.profileName, "string");

      // The TypeScript compiler should prevent mutations
      // profile.kind = "merged"; // This should cause a compile error
    });
  });
});
