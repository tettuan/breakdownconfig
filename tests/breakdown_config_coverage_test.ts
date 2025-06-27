/**
 * Coverage improvement tests for BreakdownConfig
 * Target: Improve coverage from 45.6% to 80%+
 */

import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { BreakdownConfig } from "../src/breakdown_config.ts";
import {
  cleanupTestConfigs,
  setupCustomConfigSet,
  setupMergeConfigs as originalSetupMergeConfigs,
} from "./test_utils.ts";

// Wrapper to handle the different signature
async function setupMergeConfigs(tempDir: string): Promise<void> {
  const testDir = await originalSetupMergeConfigs();
  // Copy contents from testDir to tempDir
  const cmd = new Deno.Command("cp", {
    args: ["-r", `${testDir}/.`, tempDir],
  });
  await cmd.output();
  await Deno.remove(testDir, { recursive: true });
}
import {
  assertUnifiedResultErr,
  assertUnifiedResultOk,
} from "./test_helpers/result_test_helpers.ts";
import { Result } from "../src/types/unified_result.ts";

describe("BreakdownConfig Coverage Tests", () => {
  describe("getWorkingDir methods", () => {
    it("should get working directory successfully", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await setupMergeConfigs(tempDir);
        const config = new BreakdownConfig("", tempDir);
        await config.loadConfig();

        const workingDir = await config.getWorkingDir();
        assertEquals(workingDir, join(tempDir, "output"));
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should throw error when config not loaded", async () => {
      const config = new BreakdownConfig();

      await assertRejects(
        async () => {
          await config.getWorkingDir();
        },
        Error,
        "Configuration not loaded",
      );
    });

    it("should return Result.err when config not loaded (safe method)", async () => {
      const config = new BreakdownConfig();

      const result = await config.getWorkingDirSafe();
      assertUnifiedResultErr(result);
      assertEquals((result as any).error.kind, "CONFIG_NOT_LOADED");
    });

    it("should return Result.ok with working directory (safe method)", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await setupMergeConfigs(tempDir);
        const config = new BreakdownConfig("", tempDir);
        await config.loadConfig();

        const result = await config.getWorkingDirSafe();
        assertUnifiedResultOk(result);
        assertEquals((result as any).data, join(tempDir, "output"));
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });

  describe("getPromptDir methods", () => {
    it("should get prompt directory successfully", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await setupMergeConfigs(tempDir);
        const config = new BreakdownConfig("", tempDir);
        await config.loadConfig();

        const promptDir = await config.getPromptDir();
        assertEquals(promptDir, join(tempDir, "output", "prompts"));
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should throw error when config not loaded", async () => {
      const config = new BreakdownConfig();

      await assertRejects(
        async () => {
          await config.getPromptDir();
        },
        Error,
        "Configuration not loaded",
      );
    });

    it("should return Result.err when config not loaded (safe method)", async () => {
      const config = new BreakdownConfig();

      const result = await config.getPromptDirSafe();
      assertUnifiedResultErr(result);
      assertEquals((result as any).error.kind, "CONFIG_NOT_LOADED");
    });

    it("should return Result.ok with prompt directory (safe method)", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await setupMergeConfigs(tempDir);
        const config = new BreakdownConfig("", tempDir);
        await config.loadConfig();

        const result = await config.getPromptDirSafe();
        assertUnifiedResultOk(result);
        assertEquals((result as any).data, join(tempDir, "output", "prompts"));
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });

  describe("getSchemaDir methods", () => {
    it("should get schema directory successfully", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await setupMergeConfigs(tempDir);
        const config = new BreakdownConfig("", tempDir);
        await config.loadConfig();

        const schemaDir = await config.getSchemaDir();
        assertEquals(schemaDir, join(tempDir, "output", "schemas"));
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should throw error when config not loaded", async () => {
      const config = new BreakdownConfig();

      await assertRejects(
        async () => {
          await config.getSchemaDir();
        },
        Error,
        "Configuration not loaded",
      );
    });

    it("should return Result.err when config not loaded (safe method)", async () => {
      const config = new BreakdownConfig();

      const result = await config.getSchemaDirSafe();
      assertUnifiedResultErr(result);
      assertEquals((result as any).error.kind, "CONFIG_NOT_LOADED");
    });

    it("should return Result.ok with schema directory (safe method)", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await setupMergeConfigs(tempDir);
        const config = new BreakdownConfig("", tempDir);
        await config.loadConfig();

        const result = await config.getSchemaDirSafe();
        assertUnifiedResultOk(result);
        assertEquals((result as any).data, join(tempDir, "output", "schemas"));
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });

  describe("loadConfigSafe method", () => {
    it("should load config successfully with Result", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await setupMergeConfigs(tempDir);
        const config = new BreakdownConfig("", tempDir);

        const result = await config.loadConfigSafe();
        assertUnifiedResultOk(result);
        assertEquals((result as any).data.working_dir, "output");
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should return Result.err for missing config", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        // Don't create any config files
        const config = new BreakdownConfig("", tempDir);

        const result = await config.loadConfigSafe();
        assertUnifiedResultErr(result);
        assertEquals((result as any).error.kind, "CONFIG_FILE_NOT_FOUND");
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });

  describe("Edge cases and error paths", () => {
    it("should handle double load attempt gracefully", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await setupMergeConfigs(tempDir);
        const config = new BreakdownConfig("", tempDir);

        await config.loadConfig();
        // Second load should succeed without issues
        await config.loadConfig();

        const workingDir = await config.getWorkingDir();
        assertEquals(workingDir, join(tempDir, "output"));
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should handle prefix with special characters", async () => {
      const tempDir = await Deno.makeTempDir();
      const prefix = "test-env";
      try {
        await setupCustomConfigSet(tempDir, prefix);
        const config = new BreakdownConfig(prefix, tempDir);

        const result = await config.loadConfigSafe();
        assertUnifiedResultOk(result);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });

    it("should chain directory retrieval operations", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await setupMergeConfigs(tempDir);
        const config = new BreakdownConfig("", tempDir);
        await config.loadConfig();

        const workingDirResult = await config.getWorkingDirSafe();
        const promptDirResult = await config.getPromptDirSafe();
        const schemaDirResult = await config.getSchemaDirSafe();

        const allDirs = Result.all([workingDirResult, promptDirResult, schemaDirResult]);
        assertUnifiedResultOk(allDirs);
        assertEquals((allDirs as any).data.length, 3);
      } finally {
        await cleanupTestConfigs(tempDir);
      }
    });
  });
});
