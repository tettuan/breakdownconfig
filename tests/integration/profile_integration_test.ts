import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.219.0/assert/mod.ts";
import { describe, it, beforeAll, afterAll, beforeEach } from "https://deno.land/std@0.219.0/testing/bdd.ts";
import { join } from "https://deno.land/std@0.219.0/path/mod.ts";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { ConfigManager } from "../../src/config_manager.ts";
import type { ConfigResult } from "../../src/types/config_result.ts";
import type { AppConfig, UserConfig } from "../../src/types/config.ts";

describe("Profile Integration Tests", () => {
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
  
  beforeEach(async () => {
    // 各テスト前に設定ディレクトリをクリーンアップ
    for await (const entry of Deno.readDir(configDir)) {
      await Deno.remove(join(configDir, entry.name));
    }
  });

  describe("デフォルトプロファイル処理フロー", () => {
    it("app.ymlのみの基本的なデフォルトプロファイル読み込み", async () => {
      const appConfig: AppConfig = {
        api: {
          endpoint: "https://api.example.com",
          key: "default-api-key"
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
      }
    });

    it("app.yml + user.ymlのデフォルトプロファイルマージ処理", async () => {
      const appConfig: AppConfig = {
        api: {
          endpoint: "https://api.example.com",
          key: "app-default-key"
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
          debugMode: true,
          customFeature: "enabled"
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
  debugMode: ${userConfig.features.debugMode}
  customFeature: ${userConfig.features.customFeature}`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      assertExists(result.success);
      assertEquals(result.success, true);
      if (result.success) {
        // app.ymlからの値
        assertEquals(result.data.get("api.endpoint"), appConfig.api.endpoint);
        assertEquals(result.data.get("database.host"), appConfig.database.host);
        assertEquals(result.data.get("database.port"), String(appConfig.database.port));
        
        // user.ymlでオーバーライドされた値
        assertEquals(result.data.get("api.key"), userConfig.api.key);
        assertEquals(result.data.get("features.enableCache"), String(userConfig.features.enableCache));
        
        // user.ymlで追加された値
        assertEquals(result.data.get("features.debugMode"), String(userConfig.features.debugMode));
        assertEquals(result.data.get("features.customFeature"), userConfig.features.customFeature);
      }
    });

    it("user.ymlのみ存在する場合のデフォルトプロファイル処理", async () => {
      const userConfig: UserConfig = {
        api: {
          key: "user-only-key"
        },
        features: {
          userOnlyFeature: true
        }
      };
      
      await Deno.writeTextFile(
        join(configDir, "user.yml"),
        `api:
  key: ${userConfig.api.key}
features:
  userOnlyFeature: ${userConfig.features.userOnlyFeature}`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertEquals(result.error.kind, "fileNotFound");
        assertExists(result.error.path);
      }
    });
  });

  describe("名前付きプロファイル処理フロー", () => {
    it("development プロファイルの完全な処理フロー", async () => {
      const profile = "development";
      const devAppConfig: AppConfig = {
        api: {
          endpoint: "https://dev.api.example.com",
          key: "dev-api-key"
        },
        database: {
          host: "dev-db.local",
          port: 5433
        },
        features: {
          enableCache: false
        }
      };
      
      const devUserConfig: UserConfig = {
        api: {
          key: "dev-user-key"
        },
        features: {
          debugMode: true,
          logLevel: "debug"
        }
      };
      
      await Deno.writeTextFile(
        join(configDir, `${profile}-app.yml`),
        `api:
  endpoint: ${devAppConfig.api.endpoint}
  key: ${devAppConfig.api.key}
database:
  host: ${devAppConfig.database.host}
  port: ${devAppConfig.database.port}
features:
  enableCache: ${devAppConfig.features.enableCache}`
      );
      
      await Deno.writeTextFile(
        join(configDir, `${profile}-user.yml`),
        `api:
  key: ${devUserConfig.api.key}
features:
  debugMode: ${devUserConfig.features.debugMode}
  logLevel: ${devUserConfig.features.logLevel}`
      );

      const config = new BreakdownConfig({ 
        configDir: testDir,
        profile: profile 
      });
      const result = await config.load();
      
      assertExists(result.success);
      assertEquals(result.success, true);
      if (result.success) {
        assertEquals(result.data.get("api.endpoint"), devAppConfig.api.endpoint);
        assertEquals(result.data.get("api.key"), devUserConfig.api.key);
        assertEquals(result.data.get("database.host"), devAppConfig.database.host);
        assertEquals(result.data.get("features.debugMode"), String(devUserConfig.features.debugMode));
        assertEquals(result.data.get("features.logLevel"), devUserConfig.features.logLevel);
      }
    });

    it("複数の名前付きプロファイルの切り替え", async () => {
      const profiles = [
        { name: "development", endpoint: "https://dev.api.example.com", cacheEnabled: false },
        { name: "staging", endpoint: "https://staging.api.example.com", cacheEnabled: true },
        { name: "production", endpoint: "https://api.example.com", cacheEnabled: true }
      ];
      
      // 各プロファイルの設定ファイルを作成
      for (const profile of profiles) {
        await Deno.writeTextFile(
          join(configDir, `${profile.name}-app.yml`),
          `api:
  endpoint: ${profile.endpoint}
  key: ${profile.name}-key
database:
  host: ${profile.name}-db.example.com
  port: 5432
features:
  enableCache: ${profile.cacheEnabled}
  environment: ${profile.name}`
        );
      }
      
      // 各プロファイルでの読み込みテスト
      for (const profile of profiles) {
        const config = new BreakdownConfig({ 
          configDir: testDir,
          profile: profile.name 
        });
        const result = await config.load();
        
        assertExists(result.success);
        assertEquals(result.success, true);
        if (result.success) {
          assertEquals(result.data.get("api.endpoint"), profile.endpoint);
          assertEquals(result.data.get("api.key"), `${profile.name}-key`);
          assertEquals(result.data.get("database.host"), `${profile.name}-db.example.com`);
          assertEquals(result.data.get("features.enableCache"), String(profile.cacheEnabled));
          assertEquals(result.data.get("features.environment"), profile.name);
        }
      }
    });

    it("名前付きプロファイルのapp.ymlのみ存在する場合", async () => {
      const profile = "staging";
      const stagingAppConfig: AppConfig = {
        api: {
          endpoint: "https://staging.api.example.com",
          key: "staging-key"
        },
        database: {
          host: "staging-db.example.com",
          port: 5432
        },
        features: {
          enableCache: true
        }
      };
      
      await Deno.writeTextFile(
        join(configDir, `${profile}-app.yml`),
        `api:
  endpoint: ${stagingAppConfig.api.endpoint}
  key: ${stagingAppConfig.api.key}
database:
  host: ${stagingAppConfig.database.host}
  port: ${stagingAppConfig.database.port}
features:
  enableCache: ${stagingAppConfig.features.enableCache}`
      );

      const config = new BreakdownConfig({ 
        configDir: testDir,
        profile: profile 
      });
      const result = await config.load();
      
      assertExists(result.success);
      assertEquals(result.success, true);
      if (result.success) {
        assertEquals(result.data.get("api.endpoint"), stagingAppConfig.api.endpoint);
        assertEquals(result.data.get("api.key"), stagingAppConfig.api.key);
        assertEquals(result.data.get("database.host"), stagingAppConfig.database.host);
      }
    });
  });

  describe("エラーケース網羅", () => {
    it("無効なプロファイル名の処理", async () => {
      const invalidProfiles = [
        "../../etc/passwd",
        "dev prod",
        "dev/prod",
        ".hidden",
        "",
        " ",
        "very-long-profile-name-that-should-not-be-accepted-by-the-system"
      ];
      
      for (const invalidProfile of invalidProfiles) {
        const config = new BreakdownConfig({ 
          configDir: testDir,
          profile: invalidProfile 
        });
        const result = await config.load();
        
        assertEquals(result.success, false);
        if (!result.success) {
          assertExists(result.error.kind);
          assertExists(result.error.message);
        }
      }
    });

    it("YAMLパースエラーの処理", async () => {
      const profile = "broken";
      await Deno.writeTextFile(
        join(configDir, `${profile}-app.yml`),
        `invalid yaml:
  - this is not valid
    missing colon value
  tabs	are	not	allowed
api:
  endpoint: unclosed quote"`
      );

      const config = new BreakdownConfig({ 
        configDir: testDir,
        profile: profile 
      });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertEquals(result.error.kind, "parseError");
        assertExists(result.error.path);
        assertExists(result.error.details);
      }
    });

    it("バリデーションエラーの処理", async () => {
      const profile = "invalid-data";
      await Deno.writeTextFile(
        join(configDir, `${profile}-app.yml`),
        `database:
  host: localhost
  port: not-a-number
features:
  enableCache: maybe`
      );

      const config = new BreakdownConfig({ 
        configDir: testDir,
        profile: profile 
      });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertEquals(result.error.kind, "validationError");
        assertExists(result.error.errors);
        assertEquals(Array.isArray(result.error.errors), true);
      }
    });

    it("設定ディレクトリが存在しない場合", async () => {
      const nonExistentDir = join(testDir, "non-existent");
      const config = new BreakdownConfig({ 
        configDir: nonExistentDir 
      });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertExists(result.error.kind);
        assertExists(result.error.message);
      }
    });

    it("権限エラーのシミュレーション", async () => {
      // 読み取り権限のないファイルを作成
      const restrictedFile = join(configDir, "restricted-app.yml");
      await Deno.writeTextFile(restrictedFile, "api:\n  key: secret");
      await Deno.chmod(restrictedFile, 0o000);
      
      const config = new BreakdownConfig({ 
        configDir: testDir,
        profile: "restricted" 
      });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertExists(result.error.kind);
      }
      
      // クリーンアップ
      await Deno.chmod(restrictedFile, 0o644);
    });

    it("循環参照の検出", async () => {
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `api:
  endpoint: \${api.key}
  key: \${api.endpoint}
database:
  host: localhost
  port: 5432
features:
  enableCache: true`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      // 循環参照はバリデーションエラーとして処理されるべき
      assertEquals(result.success, false);
      if (!result.success) {
        assertExists(result.error.kind);
        assertExists(result.error.message);
      }
    });
  });

  describe("環境変数との統合", () => {
    it("BREAKDOWN_PROFILE環境変数によるプロファイル選択", async () => {
      const envProfile = "environment-test";
      
      await Deno.writeTextFile(
        join(configDir, `${envProfile}-app.yml`),
        `api:
  endpoint: https://env.api.example.com
  key: env-key
database:
  host: env-db.example.com
  port: 5432
features:
  enableCache: false`
      );
      
      // 環境変数を設定
      Deno.env.set("BREAKDOWN_PROFILE", envProfile);
      
      try {
        const config = new BreakdownConfig({ configDir: testDir });
        const result = await config.load();
        
        assertExists(result.success);
        assertEquals(result.success, true);
        if (result.success) {
          assertEquals(result.data.get("api.endpoint"), "https://env.api.example.com");
          assertEquals(result.data.get("database.host"), "env-db.example.com");
        }
      } finally {
        // 環境変数をクリーンアップ
        Deno.env.delete("BREAKDOWN_PROFILE");
      }
    });

    it("コンストラクタ引数が環境変数より優先される", async () => {
      const envProfile = "env-profile";
      const argProfile = "arg-profile";
      
      // 両方のプロファイルを作成
      for (const profile of [envProfile, argProfile]) {
        await Deno.writeTextFile(
          join(configDir, `${profile}-app.yml`),
          `api:
  endpoint: https://${profile}.api.example.com
  key: ${profile}-key
database:
  host: ${profile}-db.example.com
  port: 5432
features:
  enableCache: true`
        );
      }
      
      // 環境変数を設定
      Deno.env.set("BREAKDOWN_PROFILE", envProfile);
      
      try {
        // コンストラクタでプロファイルを指定
        const config = new BreakdownConfig({ 
          configDir: testDir,
          profile: argProfile 
        });
        const result = await config.load();
        
        assertExists(result.success);
        assertEquals(result.success, true);
        if (result.success) {
          // argProfileの値が使用されるべき
          assertEquals(result.data.get("api.endpoint"), `https://${argProfile}.api.example.com`);
          assertEquals(result.data.get("database.host"), `${argProfile}-db.example.com`);
        }
      } finally {
        Deno.env.delete("BREAKDOWN_PROFILE");
      }
    });
  });
});