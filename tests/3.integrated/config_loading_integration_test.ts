/**
 * Config Loading Integration Test
 *
 * 統合テスト：設定ロードの完全な統合検証
 * - アプリ設定 + ユーザー設定の統合
 * - プロファイル別ロード
 * - Result型エラーハンドリング
 * - Total Function原則の遵守
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.219.0/assert/mod.ts";
import { afterEach, beforeEach, describe, it } from "https://deno.land/std@0.219.0/testing/bdd.ts";
import { join } from "https://deno.land/std@0.219.0/path/mod.ts";
import { stringify as stringifyYaml } from "https://deno.land/std@0.219.0/yaml/mod.ts";
import { BreakdownConfig } from "../../mod.ts";
import { Result } from "../../src/types/unified_result.ts";
import type { UnifiedError } from "../../src/errors/unified_errors.ts";
import type { AppConfig as _AppConfig } from "../../src/types/app_config.ts";
import type { UserConfig as _UserConfig } from "../../src/types/user_config.ts";
import type { MergedConfig as _MergedConfig } from "../../src/types/merged_config.ts";
import {
  cleanupTestConfigs,
  setupCustomConfigSet,
  setupMergeConfigs,
  validAppConfig,
  validUserConfig,
} from "../test_utils.ts";

describe("Config Loading Integration Tests", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await setupMergeConfigs();
  });

  afterEach(async () => {
    await cleanupTestConfigs(tempDir);
  });

  describe("アプリ設定 + ユーザー設定の統合検証", () => {
    it("デフォルトプロファイルでのアプリ設定とユーザー設定のマージ", async () => {
      const configResult = BreakdownConfig.create(undefined, tempDir);
      assertEquals(configResult.success, true);
      if (!configResult.success) return;
      const config = configResult.data;

      const loadResult = await config.loadConfigSafe();

      assertExists(loadResult);
      assertEquals(loadResult.success, true);

      // 設定が正常にロードされたら、個別に値を取得
      if (loadResult.success) {
        const configDataResult = await config.getConfigSafe();
        assertEquals(configDataResult.success, true);

        if (configDataResult.success) {
          // アプリ設定の確認
          assertEquals(configDataResult.data.working_dir, validAppConfig.working_dir);
          assertEquals(
            configDataResult.data.app_schema.base_dir,
            validAppConfig.app_schema.base_dir,
          );

          // ユーザー設定による上書きの確認
          assertEquals(
            configDataResult.data.app_prompt.base_dir,
            validUserConfig.app_prompt.base_dir,
          );
        }
      }
    });

    it("ユーザー設定が存在しない場合のアプリ設定のみでの動作", async () => {
      // ユーザー設定を削除
      const userConfigPath = join(tempDir, ".agent", "breakdown", "config", "user.yml");
      await Deno.remove(userConfigPath);

      const configResult = BreakdownConfig.create(undefined, tempDir);
      assertEquals(configResult.success, true);
      if (!configResult.success) return;
      const config = configResult.data;

      const loadResult = await config.loadConfigSafe();

      assertExists(loadResult);
      assertEquals(loadResult.success, true);

      if (loadResult.success) {
        const configDataResult = await config.getConfigSafe();
        assertEquals(configDataResult.success, true);

        if (configDataResult.success) {
          // アプリ設定のデフォルト値が使用されることを確認
          assertEquals(configDataResult.data.working_dir, validAppConfig.working_dir);
          assertEquals(
            configDataResult.data.app_prompt.base_dir,
            validAppConfig.app_prompt.base_dir,
          );
          assertEquals(
            configDataResult.data.app_schema.base_dir,
            validAppConfig.app_schema.base_dir,
          );
        }
      }
    });

    it("アプリ設定とユーザー設定の深いマージ検証", async () => {
      // より複雑な設定を作成
      const complexAppConfig = {
        working_dir: ".agent/breakdown",
        app_prompt: {
          base_dir: "prompts/default",
          templates: {
            main: "main.txt",
            sub: "sub.txt",
          },
        },
        app_schema: {
          base_dir: "schemas/default",
          version: "1.0.0",
        },
        features: {
          logging: true,
          cache: false,
        },
      };

      const complexUserConfig = {
        app_prompt: {
          base_dir: "custom/prompts", // base_dirを追加
          templates: {
            main: "custom-main.txt", // 上書き
            extra: "extra.txt", // 追加
          },
        },
        features: {
          cache: true, // 上書き
          debug: true, // 追加
        },
      };

      // 設定ファイルを書き込み
      const configDir = join(tempDir, ".agent", "breakdown", "config");
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        stringifyYaml(complexAppConfig),
      );
      await Deno.writeTextFile(
        join(configDir, "user.yml"),
        stringifyYaml(complexUserConfig),
      );

      const configResult = BreakdownConfig.create(undefined, tempDir);
      assertEquals(configResult.success, true);
      if (!configResult.success) return;
      const config = configResult.data;

      const loadResult = await config.loadConfigSafe();

      assertExists(loadResult);
      assertEquals(loadResult.success, true);

      if (loadResult.success) {
        const configDataResult = await config.getConfigSafe();
        assertEquals(configDataResult.success, true);

        if (configDataResult.success) {
          const mergedConfig = configDataResult.data;

          // 基本設定
          assertEquals(mergedConfig.working_dir, complexAppConfig.working_dir);

          // ユーザー設定による上書きと追加
          // MergedConfigは動的な型なので、Record型で安全にアクセス
          const configRecord = mergedConfig as Record<string, unknown>;

          // app_promptのtemplatesプロパティに安全にアクセス
          const appPrompt = configRecord.app_prompt as Record<string, unknown> | undefined;
          const promptTemplates = appPrompt?.templates as Record<string, unknown> | undefined;
          if (promptTemplates) {
            assertEquals(promptTemplates.main, "custom-main.txt");
            assertEquals(promptTemplates.sub, "sub.txt");
            assertEquals(promptTemplates.extra, "extra.txt");
          }

          // featuresプロパティに安全にアクセス
          const features = configRecord.features as Record<string, unknown> | undefined;
          if (features && typeof features === "object") {
            assertEquals(features.cache, true);
            assertEquals(features.logging, true);
            assertEquals(features.debug, true);
          }
        }
      }
    });
  });

  describe("プロファイル別ロード確認", () => {
    it("名前付きプロファイルでの設定ロード", async () => {
      await cleanupTestConfigs(tempDir);
      tempDir = await setupCustomConfigSet("production");

      const configResult = BreakdownConfig.create("production", tempDir);
      assertEquals(configResult.success, true);
      if (!configResult.success) return;
      const config = configResult.data;

      const loadResult = await config.loadConfigSafe();

      assertExists(loadResult);
      assertEquals(loadResult.success, true);
      if (loadResult.success) {
        // プロファイル固有の設定が読み込まれることを確認
        const configDataResult = await config.getConfigSafe();
        if (configDataResult.success) {
          const mergedConfig = configDataResult.data;
          assertEquals(mergedConfig.app_prompt?.base_dir, "production/user-prompts");
          assertEquals(mergedConfig.app_schema?.base_dir, "production/schemas");
        }
      }
    });

    it("複数プロファイルの切り替え検証", async () => {
      const profiles = ["development", "staging", "production"];

      for (const profile of profiles) {
        await cleanupTestConfigs(tempDir);
        tempDir = await setupCustomConfigSet(profile);

        const configResult = BreakdownConfig.create(profile, tempDir);
        assertEquals(configResult.success, true);
        if (!configResult.success) continue;
        const config = configResult.data;

        const loadResult = await config.loadConfigSafe();

        assertExists(loadResult);
        assertEquals(loadResult.success, true);
        if (loadResult.success) {
          // プロファイル固有のパスが正しく設定されていることを確認
          const configDataResult = await config.getConfigSafe();
          if (configDataResult.success) {
            const mergedConfig = configDataResult.data;
            assertEquals(
              mergedConfig.app_prompt?.base_dir,
              `${profile}/user-prompts`,
            );
            assertEquals(
              mergedConfig.app_schema?.base_dir,
              `${profile}/schemas`,
            );
          }
        }
      }
    });

    it("無効なプロファイル名でのエラーハンドリング", () => {
      // 無効な文字を含むプロファイル名
      const invalidProfiles = [
        "test@invalid",
        "test_invalid",
        "test.invalid",
        "test/invalid",
        "test\\invalid",
      ];

      for (const invalidProfile of invalidProfiles) {
        const configResult = BreakdownConfig.create(invalidProfile, tempDir);

        assertEquals(configResult.success, false);
        if (!configResult.success) {
          assertEquals(configResult.error.kind, "CONFIG_VALIDATION_ERROR");
          const errorMessage = configResult.error instanceof Error
            ? configResult.error.message
            : String(configResult.error.message || configResult.error);
          assertExists(errorMessage);
          assertEquals(
            errorMessage.includes(
              "only alphanumeric characters and hyphens are allowed",
            ),
            true,
          );
        }
      }
    });

    it("存在しないプロファイルファイルでのフォールバック動作", async () => {
      const configResult = BreakdownConfig.create("non-existent-profile", tempDir);
      assertEquals(configResult.success, true);
      if (!configResult.success) return;
      const config = configResult.data;

      const loadResult = await config.loadConfigSafe();

      // プロファイルファイルが存在しない場合はエラーになる
      assertEquals(loadResult.success, false);
      if (!loadResult.success) {
        assertEquals(loadResult.error.kind, "CONFIG_FILE_NOT_FOUND");
        const errorMessage = loadResult.error instanceof Error
          ? loadResult.error.message
          : String(loadResult.error.message || loadResult.error);
        assertExists(errorMessage);
      }
    });
  });

  describe("Result型エラーハンドリング検証", () => {
    it("YAMLパースエラーのResult型ハンドリング", async () => {
      const configDir = join(tempDir, ".agent", "breakdown", "config");
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `invalid yaml:
  - no proper
    structure without: closing
      unclosed: [`,
      );

      const configResult = BreakdownConfig.create(undefined, tempDir);
      assertEquals(configResult.success, true);
      if (!configResult.success) return;
      const config = configResult.data;

      const loadResult = await config.loadConfigSafe();

      assertEquals(loadResult.success, false);
      if (!loadResult.success) {
        assertEquals(loadResult.error.kind, "CONFIG_PARSE_ERROR");
        const errorMessage = loadResult.error instanceof Error
          ? loadResult.error.message
          : String(loadResult.error.message || loadResult.error);
        assertExists(errorMessage);
      }
    });

    it("バリデーションエラーのResult型ハンドリング", async () => {
      const configDir = join(tempDir, ".agent", "breakdown", "config");
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        stringifyYaml({
          // working_dirが欠落
          app_prompt: {
            base_dir: "prompts",
          },
          app_schema: {
            base_dir: "schemas",
          },
        }),
      );

      const configResult = BreakdownConfig.create(undefined, tempDir);
      assertEquals(configResult.success, true);
      if (!configResult.success) return;
      const config = configResult.data;

      const loadResult = await config.loadConfigSafe();

      assertEquals(loadResult.success, false);
      if (!loadResult.success) {
        assertEquals(loadResult.error.kind, "CONFIG_VALIDATION_ERROR");
        const errorMessage = loadResult.error instanceof Error
          ? loadResult.error.message
          : String(loadResult.error.message || loadResult.error);
        assertExists(errorMessage);
        // エラーメッセージにworking_dirが含まれることを確認
        assertEquals(errorMessage.includes("working_dir"), true);
      }
    });

    it("ファイルアクセスエラーのResult型ハンドリング", async () => {
      // 読み取り権限のないディレクトリを指定
      const configResult = BreakdownConfig.create(undefined, "/root/no-permission");
      assertEquals(configResult.success, true);
      if (!configResult.success) return;
      const config = configResult.data;

      const loadResult = await config.loadConfigSafe();

      assertEquals(loadResult.success, false);
      if (!loadResult.success) {
        // ファイルアクセスエラーまたはファイル未検出エラー
        assertEquals(
          loadResult.error.kind === "CONFIG_FILE_NOT_FOUND" ||
            loadResult.error.kind === "FILE_SYSTEM_ERROR",
          true,
        );
      }
    });

    it("連鎖的エラーのResult型ハンドリング", async () => {
      const configDir = join(tempDir, ".agent", "breakdown", "config");

      // アプリ設定に不正な値を設定
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        stringifyYaml({
          working_dir: "", // 空文字列
          app_prompt: {
            base_dir: "../../../etc", // パストラバーサル
          },
          app_schema: {
            base_dir: 123, // 型エラー
          },
        }),
      );

      const configResult = BreakdownConfig.create(undefined, tempDir);
      assertEquals(configResult.success, true);
      if (!configResult.success) return;
      const config = configResult.data;

      const loadResult = await config.loadConfigSafe();

      assertEquals(loadResult.success, false);
      if (!loadResult.success) {
        // 複数のエラーが発生する可能性があるが、最初のエラーが返される
        assertExists(loadResult.error.kind);
        const errorMessage = loadResult.error instanceof Error
          ? loadResult.error.message
          : String(loadResult.error.message || loadResult.error);
        assertExists(errorMessage);
      }
    });

    it("Result型チェーンでの安全な操作", async () => {
      const configResult = BreakdownConfig.create(undefined, tempDir);
      assertEquals(configResult.success, true);
      if (!configResult.success) return;
      const config = configResult.data;

      // loadの結果をチェーンで処理
      const loadResult = await config.loadConfigSafe();

      // Result.mapを使用した安全な変換
      const transformedResult = Result.map(loadResult, () => {
        // loadConfigSafeは成功時にvoidを返すため、設定へのアクセスは別途必要
        return "config loaded successfully";
      });

      if (Result.isOk(transformedResult)) {
        assertEquals(transformedResult.data, "config loaded successfully");
      }

      // 設定がロードされた場合は、個別の値を取得可能
      if (Result.isOk(loadResult)) {
        const workingDirResult = await config.getWorkingDirSafe();
        assertEquals(Result.isOk(workingDirResult), true);
        if (Result.isOk(workingDirResult)) {
          assertEquals(workingDirResult.data.endsWith(validAppConfig.working_dir), true);
        }
      }
    });
  });

  describe("Total Function原則の遵守確認", () => {
    it("すべての入力に対して必ず結果を返す", async () => {
      const testCases = [
        // 正常系
        { profile: undefined, baseDir: tempDir },
        { profile: "test", baseDir: tempDir },

        // 異常系
        { profile: "invalid@profile", baseDir: tempDir },
        { profile: undefined, baseDir: "/non/existent/path" },
        { profile: "", baseDir: tempDir },
        { profile: "../../etc/passwd", baseDir: tempDir },
        { profile: undefined, baseDir: "" },
      ];

      for (const testCase of testCases) {
        const configResult = BreakdownConfig.create(testCase.profile, testCase.baseDir);

        // 必ずResultが返される
        assertExists(configResult);
        assertExists(configResult.success);

        // 成功または失敗のいずれか
        if (configResult.success) {
          assertExists(configResult.data);
          const loadResult = await configResult.data.loadConfigSafe();

          // loadも必ずResultを返す
          assertExists(loadResult);
          assertExists(loadResult.success);

          if (loadResult.success) {
            // ロード成功時は設定データにアクセス可能
            const configDataResult = await configResult.data.getConfigSafe();
            assertExists(configDataResult.success);
          } else {
            assertExists(loadResult.error);
            assertExists(loadResult.error.kind);
          }
        } else {
          assertExists(configResult.error);
          assertExists(configResult.error.kind);
        }
      }
    });

    it("例外をスローせずにエラーをResultで返す", () => {
      // どんな異常な入力でも例外をスローしない
      const abnormalInputs = [
        { profile: null as unknown as string, baseDir: tempDir },
        { profile: undefined, baseDir: null as unknown as string },
        { profile: {} as unknown as string, baseDir: tempDir },
        { profile: [] as unknown as string, baseDir: tempDir },
        { profile: 123 as unknown as string, baseDir: tempDir },
      ];

      for (const input of abnormalInputs) {
        // 例外がスローされないことを確認
        let result: Result<BreakdownConfig, UnifiedError>;
        try {
          result = BreakdownConfig.create(input.profile, input.baseDir);

          // Resultが返されることを確認
          assertExists(result);
          assertExists(result.success);

          // ほとんどの場合エラーになるはず
          if (!result.success) {
            assertExists(result.error);
            assertExists(result.error.kind);
          }
        } catch (e) {
          // 例外がスローされた場合はテスト失敗
          throw new Error(`Exception thrown for input: ${JSON.stringify(input)}. Error: ${e}`);
        }
      }
    });
  });
});
