/**
 * @file custom_config_test.ts
 * @description カスタム設定機能のテスト
 *
 * テスト対象:
 * - デフォルト動作（プレフィックスなし）
 * - プレフィックス付き設定の読み込み
 * - 存在しないプレフィックスのエラーハンドリング
 * - 環境別設定（production/staging/development）
 *
 * テスト方針:
 * - 階層的テスト：基本機能→主要機能→エッジケース→エラーケース
 * - 本番環境を想定した実際の設定ファイル構造を使用
 * - BreakdownLoggerを使用した詳細なデバッグ出力
 *
 * 成功条件:
 * - すべてのテストケースがパスすること
 * - エラーケースで適切なエラーメッセージが表示されること
 */

import { assertEquals } from "@std/assert/assert_equals";
import { assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { BreakdownLogger } from "@tettuan/breakdownlogger";
import { join } from "@std/path";
import { stringify } from "@std/yaml";
import { BreakdownConfig } from "../src/breakdown_config.ts";
import { cleanupTestConfigs, validAppConfig, validUserConfig } from "./test_utils.ts";

const logger = new BreakdownLogger();

describe("Custom Config Feature Tests", () => {
  describe("1. Basic Functionality - Default Behavior", () => {
    it("should load config without prefix (default behavior)", async () => {
      const tempDir = await Deno.makeTempDir();
      logger.debug("Test directory created for default behavior", { tempDir });

      try {
        // Create standard config files
        const configDir = join(tempDir, ".agent/breakdown", "config");
        await Deno.mkdir(configDir, { recursive: true });

        const appConfigPath = join(configDir, "app.yml");
        const userConfigPath = join(configDir, "user.yml");

        await Deno.writeTextFile(appConfigPath, stringify(validAppConfig));
        await Deno.writeTextFile(userConfigPath, stringify(validUserConfig));
        logger.debug("Config files created", { appConfigPath, userConfigPath });

        const config = new BreakdownConfig(tempDir);
        await config.loadConfig();
        const loadedConfig = await config.getConfig();

        logger.debug("Config loaded successfully", { loadedConfig });

        // Verify default behavior - user config overrides app config
        assertEquals(loadedConfig.working_dir, ".agent/breakdown");
        assertEquals(loadedConfig.app_prompt.base_dir, "custom/prompts"); // From user config
        assertEquals(loadedConfig.app_schema.base_dir, "breakdown/schema/app"); // From app config

        logger.debug("Default behavior test passed");
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should handle app config only (no user config)", async () => {
      const tempDir = await Deno.makeTempDir();
      logger.debug("Test directory created for app config only", { tempDir });

      try {
        const configDir = join(tempDir, ".agent/breakdown", "config");
        await Deno.mkdir(configDir, { recursive: true });

        const appConfigPath = join(configDir, "app.yml");
        await Deno.writeTextFile(appConfigPath, stringify(validAppConfig));
        logger.debug("App config file created", { appConfigPath });

        const config = new BreakdownConfig(tempDir);
        await config.loadConfig();
        const loadedConfig = await config.getConfig();

        logger.debug("Config loaded with app config only", { loadedConfig });

        // Should use app config values only
        assertEquals(loadedConfig.working_dir, ".agent/breakdown");
        assertEquals(loadedConfig.app_prompt.base_dir, "breakdown/prompts/app");
        assertEquals(loadedConfig.app_schema.base_dir, "breakdown/schema/app");

        logger.debug("App config only test passed");
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });

  describe("2. Main Feature - Prefix-based Config Loading", () => {
    it("should load config with custom prefix", async () => {
      const tempDir = await Deno.makeTempDir();
      const prefix = "production";
      logger.debug("Test directory created for prefix config", { tempDir, prefix });

      try {
        // Create prefixed config files
        const configDir = join(tempDir, ".agent/breakdown", "config");
        await Deno.mkdir(configDir, { recursive: true });

        const appConfigPath = join(configDir, `${prefix}-app.yml`);
        const userConfigPath = join(configDir, `${prefix}-user.yml`);

        const productionAppConfig = {
          ...validAppConfig,
        };

        const productionUserConfig = {
          ...validUserConfig,
        };

        await Deno.writeTextFile(appConfigPath, stringify(productionAppConfig));
        await Deno.writeTextFile(userConfigPath, stringify(productionUserConfig));
        logger.debug("Prefixed config files created", { appConfigPath, userConfigPath });

        const config = new BreakdownConfig(tempDir, prefix);
        await config.loadConfig();
        const loadedConfig = await config.getConfig();

        logger.debug("Prefixed config loaded successfully", { loadedConfig });

        // Verify prefixed config values
        assertEquals(loadedConfig.working_dir, ".agent/breakdown");
        assertEquals(loadedConfig.app_prompt.base_dir, "custom/prompts"); // From user config
        assertEquals(loadedConfig.app_schema.base_dir, "breakdown/schema/app");

        logger.debug("Prefix-based config test passed");
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should load prefix app config with non-prefix user config fallback", async () => {
      const tempDir = await Deno.makeTempDir();
      const prefix = "staging";
      logger.debug("Test directory created for partial prefix config", { tempDir, prefix });

      try {
        // Create prefixed app config and non-prefixed user config
        const configDir = join(tempDir, ".agent/breakdown", "config");
        await Deno.mkdir(configDir, { recursive: true });

        const appConfigPath = join(configDir, `${prefix}-app.yml`);
        const userConfigPath = join(configDir, "user.yml");

        const stagingAppConfig = {
          ...validAppConfig,
          projectName: "StagingProject",
          contextSize: "medium",
        };

        await Deno.writeTextFile(appConfigPath, stringify(stagingAppConfig));
        await Deno.writeTextFile(userConfigPath, stringify(validUserConfig));
        logger.debug("Mixed config files created", { appConfigPath, userConfigPath });

        const config = new BreakdownConfig(tempDir, prefix);
        await config.loadConfig();
        const loadedConfig = await config.getConfig();

        logger.debug("Mixed config loaded successfully", { loadedConfig });

        // Should use prefixed app config and non-prefixed user config fallback
        assertEquals(loadedConfig.working_dir, ".agent/breakdown");
        assertEquals(loadedConfig.app_prompt.base_dir, "breakdown/prompts/app"); // From app config (no user config)
        assertEquals(loadedConfig.app_schema.base_dir, "breakdown/schema/app");

        logger.debug("Partial prefix config test passed");
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });

  describe("3. Edge Cases", () => {
    it("should handle empty prefix as default behavior", async () => {
      const tempDir = await Deno.makeTempDir();
      const prefix = "";
      logger.debug("Test directory created for empty prefix", { tempDir, prefix });

      try {
        const configDir = join(tempDir, ".agent/breakdown", "config");
        await Deno.mkdir(configDir, { recursive: true });

        const appConfigPath = join(configDir, "app.yml");
        const userConfigPath = join(configDir, "user.yml");

        await Deno.writeTextFile(appConfigPath, stringify(validAppConfig));
        await Deno.writeTextFile(userConfigPath, stringify(validUserConfig));

        const config = new BreakdownConfig(tempDir, prefix);
        await config.loadConfig();
        const loadedConfig = await config.getConfig();

        logger.debug("Empty prefix config loaded", { loadedConfig });

        // Should behave as default
        assertEquals(loadedConfig.working_dir, ".agent/breakdown");
        assertEquals(loadedConfig.app_prompt.base_dir, "custom/prompts"); // From user config
        assertEquals(loadedConfig.app_schema.base_dir, "breakdown/schema/app");

        logger.debug("Empty prefix test passed");
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should handle prefix with special characters", async () => {
      const tempDir = await Deno.makeTempDir();
      const prefix = "feature-branch-123";
      logger.debug("Test directory created for special char prefix", { tempDir, prefix });

      try {
        const configDir = join(tempDir, ".agent/breakdown", "config");
        await Deno.mkdir(configDir, { recursive: true });

        const appConfigPath = join(configDir, `${prefix}-app.yml`);

        const featureAppConfig = {
          ...validAppConfig,
          projectName: "FeatureBranchProject",
        };

        await Deno.writeTextFile(appConfigPath, stringify(featureAppConfig));

        const config = new BreakdownConfig(tempDir, prefix);
        await config.loadConfig();
        const loadedConfig = await config.getConfig();

        logger.debug("Special char prefix config loaded", { loadedConfig });

        assertEquals(loadedConfig.working_dir, ".agent/breakdown");
        assertEquals(loadedConfig.app_prompt.base_dir, "breakdown/prompts/app");
        assertEquals(loadedConfig.app_schema.base_dir, "breakdown/schema/app");

        logger.debug("Special char prefix test passed");
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });

  describe("4. Error Cases", () => {
    it("should throw error for non-existent prefix config", async () => {
      const tempDir = await Deno.makeTempDir();
      const prefix = "nonexistent";
      logger.debug("Test directory created for non-existent prefix", { tempDir, prefix });

      try {
        // Don't create any config files with this prefix
        const config = new BreakdownConfig(tempDir, prefix);

        await assertRejects(
          async () => {
            await config.loadConfig();
          },
          Error,
          "ERR1001: Application configuration file not found",
        );

        logger.debug("Non-existent prefix error test passed");
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should throw error for invalid prefixed config format", async () => {
      const tempDir = await Deno.makeTempDir();
      const prefix = "invalid";
      logger.debug("Test directory created for invalid prefix config", { tempDir, prefix });

      try {
        const configDir = join(tempDir, ".agent/breakdown", "config");
        await Deno.mkdir(configDir, { recursive: true });

        const appConfigPath = join(configDir, `${prefix}-app.yml`);

        // Create invalid config
        const invalidConfig = {
          // Missing required fields
          contextSize: "medium",
        };

        await Deno.writeTextFile(appConfigPath, stringify(invalidConfig));

        const config = new BreakdownConfig(tempDir, prefix);

        await assertRejects(
          async () => {
            await config.loadConfig();
          },
          Error,
          "ERR1002: Invalid application configuration",
        );

        logger.debug("Invalid prefix config error test passed");
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });

  describe("5. Environment-specific Tests", () => {
    const environments = ["production", "staging", "development"];

    for (const env of environments) {
      it(`should load ${env} environment config correctly`, async () => {
        const tempDir = await Deno.makeTempDir();
        logger.debug(`Test directory created for ${env} environment`, { tempDir, env });

        try {
          // Create environment-specific configs
          const configDir = join(tempDir, ".agent/breakdown", "config");
          await Deno.mkdir(configDir, { recursive: true });

          const appConfigPath = join(configDir, `${env}-app.yml`);
          const userConfigPath = join(configDir, `${env}-user.yml`);

          const envAppConfig = {
            ...validAppConfig,
            app_prompt: {
              base_dir: `${env}/prompts`,
            },
          };

          const envUserConfig = {
            app_prompt: {
              base_dir: `${env}/user-prompts`,
            },
          };

          await Deno.writeTextFile(appConfigPath, stringify(envAppConfig));
          await Deno.writeTextFile(userConfigPath, stringify(envUserConfig));
          logger.debug(`${env} config files created`, { appConfigPath, userConfigPath });

          const config = new BreakdownConfig(tempDir, env);
          await config.loadConfig();
          const loadedConfig = await config.getConfig();

          logger.debug(`${env} config loaded successfully`, { loadedConfig });

          // Verify environment-specific values
          assertEquals(loadedConfig.working_dir, ".agent/breakdown");
          assertEquals(loadedConfig.app_prompt.base_dir, `${env}/user-prompts`); // From user config overrides app config
          assertEquals(loadedConfig.app_schema.base_dir, "breakdown/schema/app");

          logger.debug(`${env} environment test passed`);
        } finally {
          await cleanupTestConfigs(tempDir);
        }
      });
    }

    it("should fallback to default config when environment prefix not found", async () => {
      const tempDir = await Deno.makeTempDir();
      const env = "qa"; // Non-standard environment
      logger.debug("Test directory created for fallback test", { tempDir, env });

      try {
        // Only create default configs
        const configDir = join(tempDir, ".agent/breakdown", "config");
        await Deno.mkdir(configDir, { recursive: true });

        const appConfigPath = join(configDir, "app.yml");
        const userConfigPath = join(configDir, "user.yml");

        await Deno.writeTextFile(appConfigPath, stringify(validAppConfig));
        await Deno.writeTextFile(userConfigPath, stringify(validUserConfig));

        // Try to load with qa prefix (which doesn't exist)
        const config = new BreakdownConfig(tempDir, env);

        await assertRejects(
          async () => {
            await config.loadConfig();
          },
          Error,
          "ERR1001: Application configuration file not found",
        );

        logger.debug("Environment fallback error test passed");
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });
});
