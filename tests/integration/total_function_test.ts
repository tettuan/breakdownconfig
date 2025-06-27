import { assertEquals, assertExists } from "https://deno.land/std@0.219.0/assert/mod.ts";
import { describe, it, beforeAll, afterAll } from "https://deno.land/std@0.219.0/testing/bdd.ts";
import { join } from "https://deno.land/std@0.219.0/path/mod.ts";
import { ConfigManager } from "../../src/config_manager.ts";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import type { ConfigResult } from "../../src/types/config_result.ts";
import type { AppConfig, UserConfig } from "../../src/types/config.ts";

describe("Total Function Integration Tests", () => {
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

  describe("プロファイル読み込み → 変換 → 検証の統合フロー", () => {
    it("デフォルトプロファイルの完全な処理フロー", async () => {
      const appConfig: AppConfig = {
        api: {
          endpoint: "https://api.example.com",
          key: "test-key"
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
        assertEquals(result.data.get("api.endpoint"), appConfig.api.endpoint);
        assertEquals(result.data.get("api.key"), appConfig.api.key);
        assertEquals(result.data.get("database.host"), appConfig.database.host);
        assertEquals(result.data.get("database.port"), String(appConfig.database.port));
        assertEquals(result.data.get("features.enableCache"), String(appConfig.features.enableCache));
      }
    });

    it("名前付きプロファイルの処理フロー", async () => {
      const profileName = "production";
      const appConfig: AppConfig = {
        api: {
          endpoint: "https://prod.api.example.com",
          key: "prod-key"
        },
        database: {
          host: "prod-db.example.com",
          port: 5432
        },
        features: {
          enableCache: false
        }
      };
      
      await Deno.writeTextFile(
        join(configDir, `${profileName}-app.yml`),
        `api:
  endpoint: ${appConfig.api.endpoint}
  key: ${appConfig.api.key}
database:
  host: ${appConfig.database.host}
  port: ${appConfig.database.port}
features:
  enableCache: ${appConfig.features.enableCache}`
      );

      const config = new BreakdownConfig({ 
        configDir: testDir,
        profile: profileName 
      });
      const result = await config.load();
      
      assertExists(result.success);
      assertEquals(result.success, true);
      if (result.success) {
        assertEquals(result.data.get("api.endpoint"), appConfig.api.endpoint);
        assertEquals(result.data.get("database.host"), appConfig.database.host);
      }
    });

    it("ユーザープロファイルとのマージ処理", async () => {
      const appConfig: AppConfig = {
        api: {
          endpoint: "https://api.example.com",
          key: "default-key"
        },
        database: {
          host: "localhost",
          port: 5432
        },
        features: {
          enableCache: true
        }
      };
      
      const userConfig: UserConfig = {
        api: {
          key: "user-override-key"
        },
        features: {
          enableCache: false,
          debugMode: true
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
      
      await Deno.writeTextFile(
        join(configDir, "user.yml"),
        `api:
  key: ${userConfig.api.key}
features:
  enableCache: ${userConfig.features.enableCache}
  debugMode: ${userConfig.features.debugMode}`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      assertExists(result.success);
      assertEquals(result.success, true);
      if (result.success) {
        assertEquals(result.data.get("api.endpoint"), appConfig.api.endpoint);
        assertEquals(result.data.get("api.key"), userConfig.api.key);
        assertEquals(result.data.get("features.enableCache"), String(userConfig.features.enableCache));
        assertEquals(result.data.get("features.debugMode"), String(userConfig.features.debugMode));
      }
    });
  });

  describe("エラー伝播とリカバリーケース", () => {
    it("不正なYAMLファイルのエラーハンドリング", async () => {
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `invalid yaml content
  - no proper structure
    key without value:`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertEquals(result.error.kind, "parseError");
        assertExists(result.error.details);
      }
    });

    it("必須フィールド欠落時のバリデーションエラー", async () => {
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `database:
  host: localhost
  port: 5432`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertEquals(result.error.kind, "validationError");
        assertExists(result.error.errors);
      }
    });

    it("プロファイルファイル不在時のフォールバック", async () => {
      const config = new BreakdownConfig({ 
        configDir: testDir,
        profile: "non-existent" 
      });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertEquals(result.error.kind, "fileNotFound");
        assertExists(result.error.path);
      }
    });

    it("部分的なユーザープロファイルでの正常動作", async () => {
      const appConfig: AppConfig = {
        api: {
          endpoint: "https://api.example.com",
          key: "test-key"
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
      
      await Deno.writeTextFile(
        join(configDir, "user.yml"),
        `features:
  debugMode: true`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      assertExists(result.success);
      assertEquals(result.success, true);
      if (result.success) {
        assertEquals(result.data.get("api.endpoint"), appConfig.api.endpoint);
        assertEquals(result.data.get("features.enableCache"), String(appConfig.features.enableCache));
        assertEquals(result.data.get("features.debugMode"), "true");
      }
    });

    it("環境変数によるプロファイル切り替え", async () => {
      const profiles = ["development", "staging", "production"];
      
      for (const profile of profiles) {
        await Deno.writeTextFile(
          join(configDir, `${profile}-app.yml`),
          `api:
  endpoint: https://${profile}.api.example.com
  key: ${profile}-key
database:
  host: ${profile}-db.example.com
  port: 5432
features:
  enableCache: ${profile === "production"}`
        );
      }

      for (const profile of profiles) {
        Deno.env.set("BREAKDOWN_PROFILE", profile);
        
        const config = new BreakdownConfig({ configDir: testDir });
        const result = await config.load();
        
        assertExists(result.success);
        assertEquals(result.success, true);
        if (result.success) {
          assertEquals(
            result.data.get("api.endpoint"), 
            `https://${profile}.api.example.com`
          );
          assertEquals(
            result.data.get("database.host"), 
            `${profile}-db.example.com`
          );
        }
        
        Deno.env.delete("BREAKDOWN_PROFILE");
      }
    });
  });

  describe("Total Function保証の検証", () => {
    it("全ての入力パターンで必ず結果を返す", async () => {
      const testCases = [
        { configDir: testDir },
        { configDir: testDir, profile: "test" },
        { configDir: "/non/existent/path" },
        { configDir: testDir, profile: "" },
        { configDir: testDir, profile: "../../etc/passwd" },
      ];

      for (const options of testCases) {
        const config = new BreakdownConfig(options);
        const result = await config.load();
        
        assertExists(result);
        assertExists(result.success);
        
        if (result.success) {
          assertExists(result.data);
        } else {
          assertExists(result.error);
          assertExists(result.error.kind);
        }
      }
    });

    it("エラーの連鎖的な伝播", async () => {
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `api:
  endpoint: \${UNDEFINED_VAR}
  key: test-key
database:
  host: localhost
  port: invalid-port
features:
  enableCache: not-a-boolean`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertExists(result.error.kind);
      }
    });
  });
});