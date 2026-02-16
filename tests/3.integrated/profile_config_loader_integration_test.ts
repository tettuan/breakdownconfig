import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import { BreakdownLogger } from "@tettuan/breakdownlogger";
import { ProfileConfigLoader } from "../../src/loaders/profile_config_loader.ts";
import { DefaultPaths } from "../../src/types/app_config.ts";
import {
  assertConfigFileNotFoundError,
  assertResultErr,
  assertResultOk,
} from "../test_helpers/result_test_helpers.ts";
import {
  cleanupTestConfigs,
  setupAppConfigOnly,
  setupCustomConfigSet,
  setupMergeConfigs,
  validAppConfig,
  validUserConfig,
} from "../test_utils.ts";

const logger = new BreakdownLogger();

describe("ProfileConfigLoader Integration Tests", () => {
  describe("load() with app config only", () => {
    it("should return AppOnlyProfile when only app config exists", async (): Promise<void> => {
      const tempDir = await setupAppConfigOnly();
      try {
        logger.debug("loader", { step: "before load", tempDir });
        const loader = new ProfileConfigLoader(undefined, tempDir);
        const result = await loader.load();
        logger.debug("loader", { step: "after load", success: result.success });

        const profile = assertResultOk(result);

        assertEquals(profile.kind, "app-only");
        const USER_CONFIG_NOT_EXISTS = false;
        assertEquals(profile.source.userConfigExists, USER_CONFIG_NOT_EXISTS);
        assertEquals(profile.config.working_dir, validAppConfig.working_dir);
        assertEquals(profile.config.app_prompt.base_dir, validAppConfig.app_prompt.base_dir);
        assertEquals(profile.config.app_schema.base_dir, validAppConfig.app_schema.base_dir);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should include correct profileName for default profile", async (): Promise<void> => {
      const tempDir = await setupAppConfigOnly();
      try {
        logger.debug("loader", { step: "before load default profile" });
        const loader = new ProfileConfigLoader(undefined, tempDir);
        const result = await loader.load();
        logger.debug("loader", { step: "after load", success: result.success });

        const profile = assertResultOk(result);

        assertEquals(profile.profileName, undefined);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should include correct source paths", async (): Promise<void> => {
      const tempDir = await setupAppConfigOnly();
      try {
        logger.debug("loader", { step: "before load for source paths" });
        const loader = new ProfileConfigLoader(undefined, tempDir);
        const result = await loader.load();
        logger.debug("loader", { step: "after load", success: result.success });

        const profile = assertResultOk(result);

        const expectedAppConfigPath = join(
          tempDir,
          DefaultPaths.WORKING_DIR,
          "config",
          "app.yml",
        );
        assertEquals(profile.source.appConfigPath, expectedAppConfigPath);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });

  describe("load() with app and user configs", () => {
    it("should return MergedProfile when both configs exist", async (): Promise<void> => {
      const tempDir = await setupMergeConfigs();
      try {
        logger.debug("loader", { step: "before load merge configs" });
        const loader = new ProfileConfigLoader(undefined, tempDir);
        const result = await loader.load();
        logger.debug("loader", { step: "after load", success: result.success });

        const profile = assertResultOk(result);

        assertEquals(profile.kind, "merged");
        if (profile.kind === "merged") {
          const USER_CONFIG_EXISTS = true;
          assertEquals(profile.source.userConfigExists, USER_CONFIG_EXISTS);
        }
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should apply user overrides to app config", async (): Promise<void> => {
      const tempDir = await setupMergeConfigs();
      try {
        logger.debug("loader", { step: "before load for user overrides" });
        const loader = new ProfileConfigLoader(undefined, tempDir);
        const result = await loader.load();
        logger.debug("loader", { step: "after load", success: result.success });

        const profile = assertResultOk(result);

        assertEquals(profile.kind, "merged");
        assertEquals(profile.config.working_dir, validAppConfig.working_dir);
        assertEquals(
          profile.config.app_prompt.base_dir,
          validUserConfig.app_prompt.base_dir,
        );
        assertEquals(
          profile.config.app_schema.base_dir,
          validAppConfig.app_schema.base_dir,
          "Non-overridden app_schema.base_dir should retain app config value",
        );
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should include source paths for both configs", async (): Promise<void> => {
      const tempDir = await setupMergeConfigs();
      try {
        logger.debug("loader", { step: "before load for merged source paths" });
        const loader = new ProfileConfigLoader(undefined, tempDir);
        const result = await loader.load();
        logger.debug("loader", { step: "after load", success: result.success });

        const profile = assertResultOk(result);

        assertEquals(profile.kind, "merged");
        if (profile.kind === "merged") {
          const expectedAppPath = join(
            tempDir,
            DefaultPaths.WORKING_DIR,
            "config",
            "app.yml",
          );
          const expectedUserPath = join(
            tempDir,
            DefaultPaths.WORKING_DIR,
            "config",
            "user.yml",
          );
          assertEquals(profile.source.appConfigPath, expectedAppPath);
          assertEquals(profile.source.userConfigPath, expectedUserPath);
        }
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });

  describe("load() with named profile", () => {
    it("should load profile-prefixed configuration files", async (): Promise<void> => {
      const prefix = "test-profile";
      const tempDir = await setupCustomConfigSet(prefix);
      try {
        logger.debug("loader", { step: "before load named profile", prefix });
        const loader = new ProfileConfigLoader(prefix, tempDir);
        const result = await loader.load();
        logger.debug("loader", { step: "after load", success: result.success });

        const profile = assertResultOk(result);

        assertEquals(profile.profileName, prefix);
        assertEquals(profile.kind, "merged");
        if (profile.kind === "merged") {
          assertEquals(
            profile.config.app_prompt.base_dir,
            `${prefix}/user-prompts`,
          );
          assertEquals(
            profile.config.app_schema.base_dir,
            `${prefix}/schemas`,
          );
        }
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });

  describe("load() error handling", () => {
    it(
      "should return CONFIG_FILE_NOT_FOUND when app config missing",
      async (): Promise<void> => {
        const tempDir = await Deno.makeTempDir();
        try {
          logger.debug("loader", { step: "before load missing config" });
          const loader = new ProfileConfigLoader(undefined, tempDir);
          const result = await loader.load();
          logger.debug("loader", { step: "after load", success: result.success });

          assertResultErr(result);
          assertConfigFileNotFoundError(result);
        } finally {
          await Deno.remove(tempDir, { recursive: true });
        }
      },
    );

    it("should return error for invalid app config YAML", async (): Promise<void> => {
      const tempDir = await Deno.makeTempDir();
      try {
        const configDir = join(tempDir, DefaultPaths.WORKING_DIR, "config");
        await Deno.mkdir(configDir, { recursive: true });
        await Deno.writeTextFile(join(configDir, "app.yml"), "{ invalid: yaml: content:");

        logger.debug("loader", { step: "before load invalid yaml" });
        const loader = new ProfileConfigLoader(undefined, tempDir);
        const result = await loader.load();
        logger.debug("loader", { step: "after load", success: result.success });

        const error = assertResultErr(result);
        assertEquals(error.kind, "CONFIG_PARSE_ERROR");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });
});
