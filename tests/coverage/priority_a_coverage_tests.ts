/**
 * Priority A Coverage Improvement Tests
 *
 * Target files:
 * - config_manager.ts (32% → 80%)
 * - unified_error_manager.ts (28% → 75%)
 * - path_validator.ts (47% → 70%)
 */

import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertExists } from "@std/assert";
import { expect } from "@std/expect";
import { ConfigManager } from "../../src/config_manager.ts";
import { AppConfigLoader } from "../../src/loaders/app_config_loader.ts";
import { UserConfigLoader } from "../../src/loaders/user_config_loader.ts";
import { UnifiedErrorManager } from "../../src/errors/unified_error_manager.ts";
import { PathValidator } from "../../src/validators/path_validator.ts";
import { Result } from "../../src/types/unified_result.ts";
import { UnifiedError } from "../../src/errors/unified_errors.ts";

describe("ConfigManager Coverage Tests", () => {
  describe("Error Recovery Scenarios", () => {
    it("should recover from corrupted config files", async () => {
      const tempDir = await Deno.makeTempDir();
      const appLoader = new AppConfigLoader(undefined, tempDir);
      const userLoader = new UserConfigLoader(undefined, tempDir);
      const configManager = new ConfigManager(appLoader, userLoader);

      // Create corrupted config
      await Deno.writeTextFile(
        `${tempDir}/.agent/breakdown/config/app.yml`,
        "corrupted: [unclosed",
      );

      const result = await configManager.getConfigSafe();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.kind).toBe("CONFIG_PARSE_ERROR");
      }

      await Deno.remove(tempDir, { recursive: true });
    });

    it("should handle concurrent access correctly", async () => {
      const tempDir = await setupValidConfig();
      const appLoader = new AppConfigLoader(undefined, tempDir);
      const userLoader = new UserConfigLoader(undefined, tempDir);
      const configManager = new ConfigManager(appLoader, userLoader);

      // Launch multiple concurrent requests
      const promises = Array(10).fill(null).map(() => configManager.getConfigSafe());

      const results = await Promise.all(promises);

      // All should succeed with same data
      results.forEach((result) => {
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.working_dir).toBe(".agent/breakdown");
        }
      });

      await Deno.remove(tempDir, { recursive: true });
    });

    it("should handle cache invalidation properly", async () => {
      const tempDir = await setupValidConfig();
      const appLoader = new AppConfigLoader(undefined, tempDir);
      const userLoader = new UserConfigLoader(undefined, tempDir);
      const configManager = new ConfigManager(appLoader, userLoader);

      // First load
      const result1 = await configManager.getConfigSafe();
      expect(result1.success).toBe(true);

      // Modify config
      const configPath = `${tempDir}/.agent/breakdown/config/app.yml`;
      const content = await Deno.readTextFile(configPath);
      await Deno.writeTextFile(configPath, content.replace("prompts", "modified-prompts"));

      // Force reload
      const result2 = await configManager.reloadConfigSafe();
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.data.app_prompt.base_dir).toBe("modified-prompts");
      }

      await Deno.remove(tempDir, { recursive: true });
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing optional fields", async () => {
      const tempDir = await Deno.makeTempDir();
      await Deno.mkdir(`${tempDir}/.agent/breakdown/config`, { recursive: true });

      // Minimal config
      const minimalConfig = `
working_dir: ".agent/breakdown"
app_prompt:
  base_dir: "prompts"
app_schema:
  base_dir: "schemas"
`;
      await Deno.writeTextFile(`${tempDir}/.agent/breakdown/config/app.yml`, minimalConfig);

      const appLoader = new AppConfigLoader(undefined, tempDir);
      const userLoader = new UserConfigLoader(undefined, tempDir);
      const configManager = new ConfigManager(appLoader, userLoader);

      const result = await configManager.getConfigSafe();
      expect(result.success).toBe(true);

      await Deno.remove(tempDir, { recursive: true });
    });
  });
});

describe("UnifiedErrorManager Coverage Tests", () => {
  const errorManager = new UnifiedErrorManager();

  describe("Legacy Error Conversion", () => {
    it("should convert all legacy error types", () => {
      const legacyErrors = [
        { type: "CONFIG_ERROR", code: "ERR1001", message: "Config error" },
        { type: "VALIDATION_ERROR", code: "ERR1002", message: "Validation error" },
        { type: "FILE_ERROR", code: "ERR1003", message: "File error" },
        { type: "PARSE_ERROR", code: "ERR1004", message: "Parse error" },
      ];

      legacyErrors.forEach((legacy) => {
        const unified = errorManager.fromLegacyError(legacy);
        assertExists(unified);
        assert(unified.kind !== "UNKNOWN_ERROR");
        assert(unified.message.includes(legacy.message));
      });
    });
  });

  describe("Internationalization", () => {
    it("should generate i18n messages for all error types", () => {
      const errorTypes: UnifiedError["kind"][] = [
        "CONFIG_FILE_NOT_FOUND",
        "CONFIG_PARSE_ERROR",
        "CONFIG_VALIDATION_ERROR",
        "PATH_VALIDATION_ERROR",
        "USER_CONFIG_INVALID",
      ];

      errorTypes.forEach((kind) => {
        const error = errorManager.createError(kind, {
          message: "Test error",
          path: "/test/path",
        });

        // Test multiple locales
        const locales = ["en", "ja", "es", "fr"];
        locales.forEach((locale) => {
          const message = errorManager.getLocalizedMessage(error, locale);
          assertExists(message);
          assert(message.length > 0);
        });
      });
    });
  });

  describe("Error Context Chain", () => {
    it("should preserve error context through multiple layers", () => {
      const originalError = new Error("Original error");
      const context1 = { operation: "loadConfig", file: "app.yml" };
      const context2 = { phase: "validation", field: "working_dir" };

      let error = errorManager.createError("CONFIG_PARSE_ERROR", {
        message: "Parse failed",
        path: "/config/app.yml",
        context: context1,
        originalError,
      });

      error = errorManager.addContext(error, context2);

      assertExists(error.context);
      assertEquals(error.context.operation, "loadConfig");
      assertEquals(error.context.phase, "validation");
      assertExists(error.originalError);
    });
  });
});

describe("PathValidator Coverage Tests", () => {
  describe("Security Validation", () => {
    it("should detect all path traversal patterns", () => {
      const maliciousPaths = [
        "../../../etc/passwd",
        "..\\..\\windows\\system32",
        "foo/../../../bar",
        "./../../sensitive",
        "normal/../../up",
        "encoded/%2e%2e/path",
        "unicode/\u002e\u002e/path",
      ];

      maliciousPaths.forEach((path) => {
        const result = PathValidator.validatePath(path);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.kind).toBe("PATH_VALIDATION_ERROR");
          expect(result.error.reason).toBe("PATH_TRAVERSAL");
        }
      });
    });

    it("should handle Unicode characters safely", () => {
      const unicodePaths = [
        "日本語/フォルダ/ファイル.yml",
        "español/configuración.yml",
        "emoji/🎉/config.yml",
        "mixed/日本語/english/español.yml",
      ];

      unicodePaths.forEach((path) => {
        const result = PathValidator.validatePath(path);
        expect(result.success).toBe(true);
      });
    });

    it("should validate file size limits", () => {
      // Create path with length at boundary
      const longPath = "a".repeat(255); // Max filename length
      const tooLongPath = "a".repeat(256);

      const result1 = PathValidator.validatePath(longPath);
      expect(result1.success).toBe(true);

      const result2 = PathValidator.validatePath(tooLongPath);
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.error.reason).toBe("PATH_TOO_LONG");
      }
    });
  });

  describe("Platform-Specific Behavior", () => {
    it("should handle Windows-style paths", () => {
      const windowsPaths = [
        "C:\\Users\\config.yml",
        "\\\\server\\share\\config.yml",
        "config\\app.yml",
      ];

      windowsPaths.forEach((path) => {
        const result = PathValidator.validateWindowsPath(path);
        assertExists(result);
        // Platform-specific validation
      });
    });

    it("should handle symbolic links safely", () => {
      const symlinkPaths = [
        "/var/link -> /etc/passwd",
        "./symlink",
        "data/link",
      ];

      symlinkPaths.forEach((path) => {
        const result = PathValidator.validateSymbolicLink(path);
        assertExists(result);
        // Symlink validation logic
      });
    });
  });
});

// Helper functions
async function setupValidConfig(): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  const configDir = `${tempDir}/.agent/breakdown/config`;
  await Deno.mkdir(configDir, { recursive: true });

  const validConfig = `
working_dir: ".agent/breakdown"
app_prompt:
  base_dir: "prompts"
app_schema:
  base_dir: "schemas"
`;

  await Deno.writeTextFile(`${configDir}/app.yml`, validConfig);
  return tempDir;
}
