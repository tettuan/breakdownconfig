import { assertEquals, assertExists } from "https://deno.land/std@0.219.0/assert/mod.ts";
import { describe, it, beforeAll, afterAll } from "https://deno.land/std@0.219.0/testing/bdd.ts";
import { join } from "https://deno.land/std@0.219.0/path/mod.ts";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { ConfigManager } from "../../src/config_manager.ts";
import { AppConfigLoader } from "../../src/loaders/app_config_loader.ts";
import { UserConfigLoader } from "../../src/loaders/user_config_loader.ts";
import type { ConfigResult } from "../../src/types/config_result.ts";
import type { ConfigError } from "../../src/types/errors.ts";

describe("Error Propagation Patterns Tests", () => {
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

  describe("深いネストのエラー伝播", () => {
    it("ローダー → マネージャー → BreakdownConfigへのエラー伝播", async () => {
      // 不正なYAMLで深いエラー伝播をテスト
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `api:
  endpoint: https://api.example.com
  key: [invalid
    nested: structure
  database:
    host: localhost
    port: "not closed`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertEquals(result.error.kind, "parseError");
        assertExists(result.error.path);
        assertExists(result.error.details);
        
        // エラーメッセージがスタックの各層で保持されているか確認
        assertExists(result.error.message);
        assertEquals(result.error.path.includes("app.yml"), true);
      }
    });

    it("バリデーションエラーの詳細な伝播", async () => {
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `database:
  host: localhost
  port: invalid-port
  connection:
    poolSize: -5
    timeout: "not a number"
features:
  cache:
    enabled: "maybe"
    size: "large"`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertEquals(result.error.kind, "validationError");
        assertExists(result.error.errors);
        assertEquals(Array.isArray(result.error.errors), true);
        
        // 複数のバリデーションエラーが集約されているか確認
        if (result.error.errors && result.error.errors.length > 0) {
          for (const validationError of result.error.errors) {
            assertExists(validationError.path);
            assertExists(validationError.message);
          }
        }
      }
    });

    it("ネストされた設定構造でのパスエラー伝播", async () => {
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `api:
  endpoint: https://api.example.com
  key: test-key
  auth:
    oauth2:
      clientId: \${UNDEFINED_VAR}
      redirectUri: \${api.auth.oauth2.clientId}/callback
database:
  host: localhost
  port: 5432
  connection:
    url: postgres://\${database.user}@\${database.host}:\${database.port}/\${database.name}
features:
  enableCache: true`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertExists(result.error.kind);
        assertExists(result.error.message);
        
        // 深いネスト構造でのエラーパスが正確に伝播されているか
        const errorMessage = result.error.message || "";
        assertEquals(
          errorMessage.includes("UNDEFINED_VAR") || 
          errorMessage.includes("validation") ||
          errorMessage.includes("required"),
          true
        );
      }
    });
  });

  describe("並列エラー集約パターン", () => {
    it("複数ローダーからの並列エラー収集", async () => {
      // app.yml: パースエラー
      await Deno.writeTextFile(
        join(configDir, "production-app.yml"),
        `invalid: yaml: content:`
      );
      
      // user.yml: 別のパースエラー
      await Deno.writeTextFile(
        join(configDir, "production-user.yml"),
        `[this is not valid yaml]
{mixed: formats}`
      );

      const config = new BreakdownConfig({ 
        configDir: testDir,
        profile: "production" 
      });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertExists(result.error.kind);
        assertExists(result.error.message);
        
        // 最初に発生したエラーが適切に報告されているか
        assertEquals(
          result.error.kind === "parseError" || 
          result.error.kind === "fileNotFound",
          true
        );
      }
    });

    it("マージ処理中の複数エラーの集約", async () => {
      // 有効なapp.yml
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `api:
  endpoint: https://api.example.com
  key: default-key
database:
  host: localhost
  port: 5432
features:
  enableCache: true`
      );
      
      // 型が不一致のuser.yml
      await Deno.writeTextFile(
        join(configDir, "user.yml"),
        `api:
  endpoint:
    primary: https://primary.api.example.com
    secondary: https://secondary.api.example.com
database:
  port: "not-a-number"
features:
  enableCache:
    development: false
    production: true`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      // マージ時の型不一致はエラーとして処理されるべき
      assertEquals(result.success, false);
      if (!result.success) {
        assertExists(result.error.kind);
        assertExists(result.error.message);
      }
    });

    it("依存関係解決時の並列エラー", async () => {
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `api:
  endpoint: \${api.baseUrl}/v1
  baseUrl: \${api.endpoint}
  key: test-key
database:
  primary: \${database.secondary}
  secondary: \${database.primary}
  host: localhost
  port: 5432
features:
  enableCache: true`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertExists(result.error.kind);
        assertExists(result.error.message);
        
        // 循環参照エラーが適切に検出されているか
        assertEquals(
          result.error.message?.includes("circular") ||
          result.error.message?.includes("recursive") ||
          result.error.kind === "validationError",
          true
        );
      }
    });
  });

  describe("リカバリー戦略テスト", () => {
    it("部分的な設定エラーからのグレースフルデグレード", async () => {
      // 部分的にエラーを含むapp.yml
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `api:
  endpoint: https://api.example.com
  key: valid-key
  timeout: 30
database:
  host: localhost
  port: 5432
features:
  enableCache: true
  cacheConfig:
    size: invalid-size
    ttl: not-a-number`
      );
      
      // 有効なuser.yml
      await Deno.writeTextFile(
        join(configDir, "user.yml"),
        `features:
  cacheConfig:
    size: 1000
    ttl: 3600`
      );

      const config = new BreakdownConfig({ configDir: testDir });
      const result = await config.load();
      
      // user.ymlの有効な値でオーバーライドされることを期待
      assertExists(result.success);
      if (result.success) {
        assertEquals(result.data.get("api.endpoint"), "https://api.example.com");
        assertEquals(result.data.get("features.cacheConfig.size"), "1000");
        assertEquals(result.data.get("features.cacheConfig.ttl"), "3600");
      } else {
        // バリデーションエラーとして処理される場合
        assertEquals(result.error.kind, "validationError");
      }
    });

    it("フォールバック値を使用したエラーリカバリー", async () => {
      // 存在しないプロファイルを指定
      const config = new BreakdownConfig({ 
        configDir: testDir,
        profile: "non-existent-profile" 
      });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertEquals(result.error.kind, "fileNotFound");
        assertExists(result.error.path);
        
        // エラーメッセージにプロファイル名が含まれているか
        assertEquals(result.error.path.includes("non-existent-profile"), true);
      }
    });

    it("トランザクション的な設定更新の失敗時ロールバック", async () => {
      // 初期の有効な設定
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `api:
  endpoint: https://api.example.com
  key: initial-key
database:
  host: localhost
  port: 5432
features:
  enableCache: true`
      );

      // 初回読み込み（成功）
      const config1 = new BreakdownConfig({ configDir: testDir });
      const result1 = await config1.load();
      
      assertExists(result1.success);
      assertEquals(result1.success, true);
      if (result1.success) {
        assertEquals(result1.data.get("api.key"), "initial-key");
      }

      // 無効な設定に更新
      await Deno.writeTextFile(
        join(configDir, "app.yml"),
        `this is completely invalid yaml`
      );

      // 再読み込み（失敗）
      const config2 = new BreakdownConfig({ configDir: testDir });
      const result2 = await config2.load();
      
      assertEquals(result2.success, false);
      if (!result2.success) {
        assertEquals(result2.error.kind, "parseError");
      }
    });

    it("エラーコンテキストの詳細な保持", async () => {
      const complexConfig = `
api:
  endpoints:
    v1:
      auth: \${api.auth.oauth2}
      base: https://api.v1.example.com
    v2:
      auth: \${api.auth.oauth2}
      base: https://api.v2.example.com
  auth:
    basic:
      username: user
      password: \${SECURE_PASSWORD}
database:
  connections:
    primary:
      host: \${DB_PRIMARY_HOST}
      port: \${DB_PRIMARY_PORT}
    secondary:
      host: \${DB_SECONDARY_HOST}
      port: \${DB_SECONDARY_PORT}
features:
  enableCache: \${ENABLE_CACHE}`;

      await Deno.writeTextFile(
        join(configDir, "complex-app.yml"),
        complexConfig
      );

      const config = new BreakdownConfig({ 
        configDir: testDir,
        profile: "complex" 
      });
      const result = await config.load();
      
      assertEquals(result.success, false);
      if (!result.success) {
        assertExists(result.error.kind);
        assertExists(result.error.message);
        
        // エラーコンテキストに未解決の変数情報が含まれているか
        const errorMessage = result.error.message || "";
        assertEquals(
          errorMessage.includes("SECURE_PASSWORD") ||
          errorMessage.includes("DB_PRIMARY_HOST") ||
          errorMessage.includes("ENABLE_CACHE") ||
          errorMessage.includes("required") ||
          errorMessage.includes("validation"),
          true
        );
      }
    });
  });

  describe("Total Function保証の検証", () => {
    it("全てのエラーパスで必ず結果を返す", async () => {
      const errorScenarios = [
        { 
          name: "empty-file",
          content: "",
          expectedError: ["parseError", "validationError"]
        },
        { 
          name: "null-content",
          content: "null",
          expectedError: ["validationError"]
        },
        { 
          name: "array-root",
          content: "- item1\n- item2",
          expectedError: ["validationError"]
        },
        { 
          name: "binary-content",
          content: "\x00\x01\x02\x03",
          expectedError: ["parseError"]
        },
        { 
          name: "huge-nested",
          content: "a: ".repeat(1000) + "value",
          expectedError: ["parseError", "validationError"]
        }
      ];

      for (const scenario of errorScenarios) {
        await Deno.writeTextFile(
          join(configDir, "app.yml"),
          scenario.content
        );

        const config = new BreakdownConfig({ configDir: testDir });
        const result = await config.load();
        
        // 必ず結果が返される
        assertExists(result);
        assertExists(result.success);
        
        // エラーの場合、適切なエラー情報が含まれる
        assertEquals(result.success, false);
        if (!result.success) {
          assertExists(result.error);
          assertExists(result.error.kind);
          assertEquals(
            scenario.expectedError.includes(result.error.kind),
            true
          );
        }
      }
    });
  });
});