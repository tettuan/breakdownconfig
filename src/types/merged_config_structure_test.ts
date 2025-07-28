/**
 * Structure Tests for MergedConfig
 * Level 1: Verifies configuration schema validation and profile type integrity
 */

import { assertEquals, assertExists } from "@std/assert";
// BreakdownLogger replaced with console for test stability
import {
  AppConfig,
  AppOnlyProfile as _AppOnlyProfile,
  ConfigProfile as _ConfigProfile,
  ConfigProfileFactory,
  MergedConfig as _MergedConfig,
  MergedProfile as _MergedProfile,
  UserConfig as _UserConfig,
} from "./merged_config.ts";
import { UserConfigFactory } from "./user_config.ts";

// Logger removed for test stability

Deno.test("Structure: ConfigProfile Discriminated Union Integrity", async (t) => {
  // console.log("Testing ConfigProfile discriminated union structure");

  await t.step("ConfigProfile union variants should have correct discriminators", () => {
    // console.log("Verifying ConfigProfile discriminators");

    const mockAppConfig: AppConfig = {
      working_dir: ".agent/climpt",
      app_prompt: {
        base_dir: "climpt/prompts/app",
      },
      app_schema: {
        base_dir: "climpt/schema/app",
      },
    };

    // Create AppOnlyProfile
    const appOnlyResult = ConfigProfileFactory.createAppOnly(
      mockAppConfig,
      "test",
      "/test/base",
      false,
    );
    if (!appOnlyResult.success) {
      throw new Error("Failed to create AppOnlyProfile");
    }
    const appOnly = appOnlyResult.data;

    // Create MergedProfile
    const userConfig = UserConfigFactory.createComplete("/test/prompt", "/test/schema");
    const mergedResult = ConfigProfileFactory.createMerged(
      mockAppConfig,
      userConfig,
      "test",
      "/test/base",
      "/test/user",
    );
    if (!mergedResult.success) {
      throw new Error("Failed to create MergedProfile");
    }
    const merged = mergedResult.data;

    // Verify discriminators
    assertEquals(appOnly.kind, "app-only", "AppOnlyProfile should have kind 'app-only'");
    assertEquals(merged.kind, "merged", "MergedProfile should have kind 'merged'");

    // console.log("ConfigProfile discriminators verified");
  });

  await t.step("AppOnlyProfile should have correct structure", () => {
    // console.log("Verifying AppOnlyProfile structure");

    const mockAppConfig: AppConfig = {
      working_dir: ".agent/climpt",
      app_prompt: {
        base_dir: "climpt/prompts/app",
      },
      app_schema: {
        base_dir: "climpt/schema/app",
      },
    };

    const appOnlyResult = ConfigProfileFactory.createAppOnly(
      mockAppConfig,
      "test",
      "/test/app.config",
      false,
    );

    if (!appOnlyResult.success) {
      throw new Error("Failed to create AppOnlyProfile");
    }
    const appOnly = appOnlyResult.data;

    // Verify required properties
    assertEquals(appOnly.kind, "app-only", "Should have correct kind");
    assertEquals(appOnly.profileName, "test", "Should have profileName");
    assertEquals(
      appOnly.source.appConfigPath,
      "/test/app.config",
      "Should have correct config path",
    );
    assertEquals(appOnly.source.userConfigExists, false, "Should not have userConfig");

    // console.log("AppOnlyProfile structure verified");
  });

  await t.step("MergedProfile should have correct structure", () => {
    // console.log("Verifying MergedProfile structure");

    const mockAppConfig: AppConfig = {
      working_dir: ".agent/climpt",
      app_prompt: {
        base_dir: "climpt/prompts/app",
      },
      app_schema: {
        base_dir: "climpt/schema/app",
      },
    };

    const userConfig = UserConfigFactory.createComplete("/test/prompt", "/test/schema");
    const mergedResult = ConfigProfileFactory.createMerged(
      mockAppConfig,
      userConfig,
      "test",
      "/test/app.config",
      "/test/user.config",
    );

    if (!mergedResult.success) {
      throw new Error("Failed to create MergedProfile");
    }
    const merged = mergedResult.data;

    // Verify required properties
    assertEquals(merged.kind, "merged", "Should have correct kind");
    assertEquals(merged.profileName, "test", "Should have profileName");
    assertEquals(
      merged.source.appConfigPath,
      "/test/app.config",
      "Should have correct app config path",
    );
    assertEquals(
      merged.source.userConfigPath,
      "/test/user.config",
      "Should have correct user config path",
    );
    assertEquals(merged.source.userConfigExists, true, "Should have userConfig");

    // console.log("MergedProfile structure verified");
  });
});

Deno.test("Structure: ConfigProfileFactory Contract Validation", async (t) => {
  // console.log("Testing ConfigProfileFactory contracts");

  await t.step("Factory methods should have correct signatures", () => {
    // console.log("Verifying factory method signatures");

    // Factory methods should exist
    assertExists(ConfigProfileFactory.createAppOnly, "createAppOnly should exist");
    assertExists(ConfigProfileFactory.createMerged, "createMerged should exist");

    const mockAppConfig: AppConfig = {
      working_dir: ".agent/climpt",
      app_prompt: {
        base_dir: "climpt/prompts/app",
      },
      app_schema: {
        base_dir: "climpt/schema/app",
      },
    };

    // Test createAppOnly signature
    const appOnlyResult = ConfigProfileFactory.createAppOnly(
      mockAppConfig,
      "test",
      "/base/app.config",
      false,
    );
    assertEquals(appOnlyResult.success, true, "createAppOnly should work with required parameters");

    // Test createMerged signature
    const userConfig = UserConfigFactory.createEmpty();
    const mergedResult = ConfigProfileFactory.createMerged(
      mockAppConfig,
      userConfig,
      "test",
      "/base/app.config",
      "/base/user.config",
    );
    assertEquals(mergedResult.success, true, "createMerged should work with required parameters");

    // console.log("Factory method signatures verified");
  });

  await t.step("Factory should validate input parameters", () => {
    // console.log("Testing factory parameter validation");

    const mockAppConfig: AppConfig = {
      working_dir: ".agent/climpt",
      app_prompt: {
        base_dir: "climpt/prompts/app",
      },
      app_schema: {
        base_dir: "climpt/schema/app",
      },
    };

    // Valid parameters should work
    const validAppOnlyResult = ConfigProfileFactory.createAppOnly(
      mockAppConfig,
      "test",
      "/valid/app.config",
      true,
    );
    assertEquals(validAppOnlyResult.success, true, "Valid parameters should succeed");
    if (validAppOnlyResult.success) {
      assertEquals(
        validAppOnlyResult.data.kind,
        "app-only",
        "Valid parameters should create AppOnlyProfile",
      );
    }

    const userConfig = UserConfigFactory.createPromptOnly("/test/prompt");
    const validMergedResult = ConfigProfileFactory.createMerged(
      mockAppConfig,
      userConfig,
      "test",
      "/valid/app.config",
      "/valid/user.config",
    );
    assertEquals(validMergedResult.success, true, "Valid parameters should succeed");
    if (validMergedResult.success) {
      assertEquals(
        validMergedResult.data.kind,
        "merged",
        "Valid parameters should create MergedProfile",
      );
    }

    // console.log("Factory parameter validation verified");
  });

  await t.step("Factory should produce consistent profile structures", () => {
    // console.log("Testing factory output consistency");

    const mockAppConfig: AppConfig = {
      working_dir: ".agent/climpt",
      app_prompt: {
        base_dir: "climpt/prompts/app",
      },
      app_schema: {
        base_dir: "climpt/schema/app",
      },
    };

    // Create multiple profiles with same base data
    const appOnly1Result = ConfigProfileFactory.createAppOnly(
      mockAppConfig,
      "production",
      "/base1/app.config",
      false,
    );
    const appOnly2Result = ConfigProfileFactory.createAppOnly(
      mockAppConfig,
      "production",
      "/base2/app.config",
      false,
    );

    assertEquals(appOnly1Result.success, true, "First profile creation should succeed");
    assertEquals(appOnly2Result.success, true, "Second profile creation should succeed");

    if (appOnly1Result.success && appOnly2Result.success) {
      const appOnly1 = appOnly1Result.data;
      const appOnly2 = appOnly2Result.data;

      // Structure should be consistent
      assertEquals(appOnly1.kind, appOnly2.kind, "Same factory method should produce same kind");
      assertEquals(appOnly1.profileName, appOnly2.profileName, "ProfileName should be consistent");

      // Only config paths should differ
      assertEquals(
        appOnly1.source.appConfigPath !== appOnly2.source.appConfigPath,
        true,
        "Config paths should differ when specified differently",
      );
    }

    // console.log("Factory output consistency verified");
  });
});

Deno.test("Structure: MergedConfig Schema Validation", async (t) => {
  // console.log("Testing MergedConfig schema validation");

  await t.step("MergedConfig should combine AppConfig and UserConfig properly", () => {
    // console.log("Verifying config combination logic");

    const mockAppConfig: AppConfig = {
      working_dir: ".agent/climpt",
      app_prompt: {
        base_dir: "climpt/prompts/app",
      },
      app_schema: {
        base_dir: "climpt/schema/app",
      },
    };

    const userConfig = UserConfigFactory.createComplete("/user/prompt", "/user/schema");

    const profileResult = ConfigProfileFactory.createMerged(
      mockAppConfig,
      userConfig,
      "test",
      "/base/app.config",
      "/base/user.config",
    );

    assertEquals(profileResult.success, true, "Profile creation should succeed");

    if (profileResult.success) {
      const profile = profileResult.data;

      // Profile should contain both configs
      assertEquals(profile.kind, "merged", "Should be merged profile");
      assertEquals(
        profile.config.working_dir,
        ".agent/climpt",
        "Should preserve AppConfig working_dir",
      );
      assertEquals(profile.source.userConfigExists, true, "Should have user config");
    }

    // console.log("Config combination logic verified");
  });

  await t.step("Profile directory resolution should be consistent", () => {
    // console.log("Testing directory resolution consistency");

    const mockAppConfig: AppConfig = {
      working_dir: ".agent/climpt",
      app_prompt: {
        base_dir: "climpt/prompts/app",
      },
      app_schema: {
        base_dir: "climpt/schema/app",
      },
    };

    const profileResult = ConfigProfileFactory.createAppOnly(
      mockAppConfig,
      "development",
      "/override/app.config",
      true,
    );

    assertEquals(profileResult.success, true, "Profile creation should succeed");

    if (profileResult.success) {
      const profile = profileResult.data;

      // Directory resolution should follow hierarchy
      assertEquals(
        profile.source.appConfigPath,
        "/override/app.config",
        "Config path should use override when provided",
      );
      assertEquals(
        profile.profileName,
        "development",
        "ProfileName should match requested profile",
      );
      assertEquals(
        profile.config.working_dir,
        ".agent/climpt",
        "Should preserve AppConfig working_dir",
      );
    }

    // console.log("Directory resolution consistency verified");
  });

  await t.step("Configuration merging should preserve type safety", () => {
    // console.log("Testing type safety in configuration merging");

    const mockAppConfig: AppConfig = {
      working_dir: ".agent/climpt",
      app_prompt: {
        base_dir: "climpt/prompts/app",
      },
      app_schema: {
        base_dir: "climpt/schema/app",
      },
    };

    // Test with different UserConfig variants
    const emptyUser = UserConfigFactory.createEmpty();
    const promptUser = UserConfigFactory.createPromptOnly("/test/prompt");
    const schemaUser = UserConfigFactory.createSchemaOnly("/test/schema");
    const completeUser = UserConfigFactory.createComplete("/test/prompt", "/test/schema");

    const profileResults = [
      ConfigProfileFactory.createMerged(
        mockAppConfig,
        emptyUser,
        "strict",
        "/base/app.config",
        "/base/user.config",
      ),
      ConfigProfileFactory.createMerged(
        mockAppConfig,
        promptUser,
        "strict",
        "/base/app.config",
        "/base/user.config",
      ),
      ConfigProfileFactory.createMerged(
        mockAppConfig,
        schemaUser,
        "strict",
        "/base/app.config",
        "/base/user.config",
      ),
      ConfigProfileFactory.createMerged(
        mockAppConfig,
        completeUser,
        "strict",
        "/base/app.config",
        "/base/user.config",
      ),
    ];

    // All should be valid MergedProfiles
    for (const profileResult of profileResults) {
      assertEquals(profileResult.success, true, "All profile creations should succeed");
      if (profileResult.success) {
        const profile = profileResult.data;
        assertEquals(profile.kind, "merged", "All merged profiles should have correct kind");
        assertEquals(
          profile.source.userConfigExists,
          true,
          "All merged profiles should have userConfig",
        );
        assertEquals(
          profile.config.working_dir,
          ".agent/climpt",
          "AppConfig should be preserved",
        );
      }
    }

    // console.log("Type safety in configuration merging verified");
  });
});

Deno.test("Structure: Legacy Compatibility Structure", async (t) => {
  // console.log("Testing legacy compatibility structure");

  await t.step("ConfigProfile should maintain backward compatibility interfaces", () => {
    // console.log("Verifying backward compatibility");

    const mockAppConfig: AppConfig = {
      working_dir: ".agent/climpt",
      app_prompt: {
        base_dir: "climpt/prompts/app",
      },
      app_schema: {
        base_dir: "climpt/schema/app",
      },
    };

    const profileResult = ConfigProfileFactory.createAppOnly(
      mockAppConfig,
      "legacy",
      "/base/app.config",
      false,
    );

    assertEquals(profileResult.success, true, "Profile creation should succeed");

    if (profileResult.success) {
      const profile = profileResult.data;

      // Should have properties that legacy code expects
      assertEquals(profile.kind, "app-only", "Should be app-only profile");
      assertEquals(profile.profileName, "legacy", "Should have profileName for legacy access");
      assertEquals(
        profile.source.appConfigPath,
        "/base/app.config",
        "Should have config path for legacy access",
      );

      // AppConfig should have expected structure
      assertExists(profile.config.working_dir, "AppConfig should have working_dir");
      assertExists(profile.config.app_prompt, "AppConfig should have app_prompt");
      assertExists(profile.config.app_schema, "AppConfig should have app_schema");
    }

    // console.log("Backward compatibility verified");
  });

  await t.step("Profile evolution should maintain structure integrity", () => {
    // console.log("Testing profile evolution integrity");

    const mockAppConfig: AppConfig = {
      working_dir: ".agent/climpt",
      app_prompt: {
        base_dir: "climpt/prompts/app",
      },
      app_schema: {
        base_dir: "climpt/schema/app",
      },
    };

    // Should handle profile evolution gracefully
    const profileResult = ConfigProfileFactory.createAppOnly(
      mockAppConfig,
      "v1",
      "/current/app.config",
      true,
    );

    assertEquals(profileResult.success, true, "Profile creation should succeed");

    if (profileResult.success) {
      const profile = profileResult.data;

      // Structure should be stable
      assertEquals(profile.kind, "app-only", "Kind should remain stable");
      assertEquals(typeof profile.config, "object", "Config should remain object");
      assertEquals(typeof profile.profileName, "string", "ProfileName should remain string");
      assertEquals(
        typeof profile.source.appConfigPath,
        "string",
        "AppConfigPath should remain string",
      );
    }

    // console.log("Profile evolution integrity verified");
  });
});

// console.log("MergedConfig Structure Tests completed");
