import { assertEquals, assertExists, assertThrows } from "https://deno.land/std@0.219.0/assert/mod.ts";
import { describe, it, beforeAll, afterAll } from "https://deno.land/std@0.219.0/testing/bdd.ts";
import { join } from "https://deno.land/std@0.219.0/path/mod.ts";
import { ConfigManager } from "../../src/config_manager.ts";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { ValidProfilePrefix } from "../../src/types/valid_profile_prefix.ts";
import { MergedConfig } from "../../src/types/merged_config.ts";
import type { ConfigResult } from "../../src/types/config_result.ts";
import type { AppConfig, UserConfig } from "../../src/types/config.ts";

describe("Total Function Features Integration Tests", () => {
  let testDir: string;
  let configDir: string;
  
  beforeAll(async () => {
    testDir = await Deno.makeTempDir();
    configDir = join(testDir, ".breakdown", "config");
    await Deno.mkdir(configDir, { recursive: true });
  });
  
  afterAll(async () => {
    await Deno.remove(testDir, { recursive: true });
  });

  describe("ValidProfilePrefix 統合テスト", () => {
    it("有効なプロファイルプレフィックスの生成と検証", () => {
      const validPrefixes = ["development", "staging", "production", "test", "local"];
      
      for (const prefix of validPrefixes) {
        const result = ValidProfilePrefix.create(prefix);
        assertExists(result.success);
        assertEquals(result.success, true);
        
        if (result.success) {
          assertEquals(result.data.value, prefix);
          assertEquals(result.data.toString(), prefix);
        }
      }
    });

    it("無効なプロファイルプレフィックスの拒否", () => {
      const invalidPrefixes = [
        "",
        " ",
        "dev env",
        "../../etc",
        "production!",
        ".hidden",
        "very-long-profile-name-that-exceeds-reasonable-limits",
        "プロダクション"
      ];
      
      for (const prefix of invalidPrefixes) {
        const result = ValidProfilePrefix.create(prefix);
        assertEquals(result.success, false);
        
        if (!result.success) {
          assertEquals(result.error.kind, "invalidProfilePrefix");
          assertExists(result.error.message);
          assertExists(result.error.value);
        }
      }
    });

    it("プロファイルプレフィックスを使用した設定ファイル読み込み", async () => {
      const profiles = [
        { prefix: "development", endpoint: "https://dev.api.example.com" },
        { prefix: "staging", endpoint: "https://staging.api.example.com" },
        { prefix: "production", endpoint: "https://api.example.com" }
      ];
      
      for (const { prefix, endpoint } of profiles) {
        const prefixResult = ValidProfilePrefix.create(prefix);
        assertExists(prefixResult.success);
        assertEquals(prefixResult.success, true);
        
        if (prefixResult.success) {
          await Deno.writeTextFile(
            join(configDir, `${prefixResult.data.value}-app.yml`),
            `api:
  endpoint: ${endpoint}
  key: ${prefix}-key
database:
  host: ${prefix}-db.example.com
  port: 5432
features:
  enableCache: ${prefix === "production"}`
          );
          
          const config = new BreakdownConfig({ 
            configDir: testDir,
            profile: prefixResult.data.value 
          });
          const result = await config.load();
          
          assertExists(result.success);
          assertEquals(result.success, true);
          if (result.success) {
            assertEquals(result.data.get("api.endpoint"), endpoint);
            assertEquals(result.data.get("database.host"), `${prefix}-db.example.com`);
          }
        }
      }
    });
  });

  describe("MergedConfig 統合テスト", () => {
    it("MergedConfig型の基本的な動作確認", async () => {
      const appConfig: AppConfig = {
        api: {
          endpoint: "https://api.example.com",
          key: "app-key"
        },
        database: {
          host: "localhost",
          port: 5432
        },
        features: {
          enableCache: true
        }
      };
      
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `api:
  endpoint: ${appConfig.api.endpoint}
  key: ${appConfig.api.key}
database:
  host: ${appConfig.database.host}
  port: ${appConfig.database.port}
features:
  enableCache: ${appConfig.features.enableCache}`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      assertExists(result.success);
      assertEquals(result.success, true);
      if (result.success) {
        const mergedConfig = result.data;
        assertExists(mergedConfig);
        assertEquals(typeof mergedConfig.get, "function");
        assertEquals(typeof mergedConfig.has, "function");
        assertEquals(typeof mergedConfig.toObject, "function");
      }
    });

    it("MergedConfigの階層的なキーアクセス", async () => {
      const complexConfig = {
        api: {
          endpoints: {
            primary: "https://primary.api.example.com",
            secondary: "https://secondary.api.example.com"
          },
          auth: {
            oauth2: {
              clientId: "client-123",
              clientSecret: "secret-456"
            }
          }
        },
        features: {
          flags: {
            enableNewUI: true,
            enableBetaFeatures: false
          }
        }
      };
      
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `api:
  endpoints:
    primary: ${complexConfig.api.endpoints.primary}
    secondary: ${complexConfig.api.endpoints.secondary}
  auth:
    oauth2:
      clientId: ${complexConfig.api.auth.oauth2.clientId}
      clientSecret: ${complexConfig.api.auth.oauth2.clientSecret}
  key: default-key
database:
  host: localhost
  port: 5432
features:
  flags:
    enableNewUI: ${complexConfig.features.flags.enableNewUI}
    enableBetaFeatures: ${complexConfig.features.flags.enableBetaFeatures}
  enableCache: true`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      assertExists(result.success);
      assertEquals(result.success, true);
      if (result.success) {
        const mergedConfig = result.data;
        
        // 階層的なキーアクセステスト
        assertEquals(
          mergedConfig.get("api.endpoints.primary"), 
          complexConfig.api.endpoints.primary
        );
        assertEquals(
          mergedConfig.get("api.auth.oauth2.clientId"), 
          complexConfig.api.auth.oauth2.clientId
        );
        assertEquals(
          mergedConfig.get("features.flags.enableNewUI"), 
          String(complexConfig.features.flags.enableNewUI)
        );
        
        // 存在チェック
        assertEquals(mergedConfig.has("api.endpoints.primary"), true);
        assertEquals(mergedConfig.has("api.endpoints.tertiary"), false);
        assertEquals(mergedConfig.has("features.flags"), true);
      }
    });

    it("MergedConfigのプロファイル別マージ動作", async () => {
      // デフォルトプロファイル
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `api:
  endpoint: https://api.example.com
  key: default-key
  timeout: 30
database:
  host: localhost
  port: 5432
  pool:
    min: 5
    max: 20
features:
  enableCache: true
  cacheSize: 100`
      );
      
      // ユーザープロファイル（部分的なオーバーライド）
      await Deno.writeTextFile(
        join(configDir, "user.yml"),
        `api:
  key: user-override-key
  timeout: 60
database:
  pool:
    max: 50
features:
  enableCache: false
  debugMode: true`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      assertExists(result.success);
      assertEquals(result.success, true);
      if (result.success) {
        const mergedConfig = result.data;
        
        // マージ結果の検証
        assertEquals(mergedConfig.get("api.endpoint"), "https://api.example.com"); // デフォルト値
        assertEquals(mergedConfig.get("api.key"), "user-override-key"); // ユーザー値でオーバーライド
        assertEquals(mergedConfig.get("api.timeout"), "60"); // ユーザー値でオーバーライド
        assertEquals(mergedConfig.get("database.host"), "localhost"); // デフォルト値
        assertEquals(mergedConfig.get("database.pool.min"), "5"); // デフォルト値
        assertEquals(mergedConfig.get("database.pool.max"), "50"); // ユーザー値でオーバーライド
        assertEquals(mergedConfig.get("features.enableCache"), "false"); // ユーザー値でオーバーライド
        assertEquals(mergedConfig.get("features.cacheSize"), "100"); // デフォルト値
        assertEquals(mergedConfig.get("features.debugMode"), "true"); // ユーザー追加値
      }
    });
  });

  describe("ValidProfilePrefixとMergedConfigの統合動作", () => {
    it("プロファイルプレフィックスを使用した完全な設定読み込みフロー", async () => {
      const profilePrefix = "staging";
      const prefixResult = ValidProfilePrefix.create(profilePrefix);
      
      assertExists(prefixResult.success);
      assertEquals(prefixResult.success, true);
      
      if (prefixResult.success) {
        // ステージング用プロファイル
        await Deno.writeTextFile(
          join(configDir, `${prefixResult.data.value}-app.yml`),
          `api:
  endpoint: https://staging.api.example.com
  key: staging-key
  rateLimit: 1000
database:
  host: staging-db.example.com
  port: 5432
  ssl: true
features:
  enableCache: true
  enableMetrics: true
  metricsEndpoint: https://metrics.staging.example.com`
        );
        
        // ステージング用ユーザープロファイル
        await Deno.writeTextFile(
          join(configDir, `${prefixResult.data.value}-user.yml`),
          `api:
  rateLimit: 2000
features:
  enableDebugLogs: true
  logLevel: debug`
        );

        const config = new BreakdownConfig({ 
          configDir: testDir,
          profile: prefixResult.data.value 
        });
        const result = await config.load();
        
        assertExists(result.success);
        assertEquals(result.success, true);
        if (result.success) {
          const mergedConfig = result.data;
          
          // プロファイル固有の値
          assertEquals(mergedConfig.get("api.endpoint"), "https://staging.api.example.com");
          assertEquals(mergedConfig.get("database.host"), "staging-db.example.com");
          assertEquals(mergedConfig.get("database.ssl"), "true");
          
          // ユーザーオーバーライド
          assertEquals(mergedConfig.get("api.rateLimit"), "2000");
          assertEquals(mergedConfig.get("features.enableDebugLogs"), "true");
          assertEquals(mergedConfig.get("features.logLevel"), "debug");
          
          // 統合されたオブジェクトの取得
          const fullConfig = mergedConfig.toObject();
          assertExists(fullConfig.api);
          assertExists(fullConfig.database);
          assertExists(fullConfig.features);
        }
      }
    });

    it("複数プロファイルの切り替えと型安全性", async () => {
      const profiles = ["development", "staging", "production"];
      
      // 各プロファイル用の設定を作成
      for (const profile of profiles) {
        const prefixResult = ValidProfilePrefix.create(profile);
        assertExists(prefixResult.success);
        
        if (prefixResult.success) {
          await Deno.writeTextFile(
            join(configDir, `${prefixResult.data.value}-app.yml`),
            `api:
  endpoint: https://${profile}.api.example.com
  key: ${profile}-key
database:
  host: ${profile}-db.example.com
  port: 5432
features:
  enableCache: ${profile === "production"}
  environment: ${profile}`
          );
        }
      }

      // 各プロファイルでの読み込みテスト
      for (const profile of profiles) {
        const prefixResult = ValidProfilePrefix.create(profile);
        assertExists(prefixResult.success);
        
        if (prefixResult.success) {
          const config = new BreakdownConfig({ 
            configDir: testDir,
            profile: prefixResult.data.value 
          });
          const result = await config.load();
          
          assertExists(result.success);
          assertEquals(result.success, true);
          if (result.success) {
            const mergedConfig = result.data;
            assertEquals(
              mergedConfig.get("api.endpoint"), 
              `https://${profile}.api.example.com`
            );
            assertEquals(
              mergedConfig.get("features.environment"), 
              profile
            );
          }
        }
      }
    });
  });
});