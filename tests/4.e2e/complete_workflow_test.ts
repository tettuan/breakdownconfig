/**
 * Complete Workflow E2E Test
 *
 * Purpose:
 * Tests the complete lifecycle of BreakdownConfig from initialization
 * to configuration loading and usage in real-world scenarios.
 *
 * Test Coverage:
 * 1. Full initialization → config load → usage cycle
 * 2. Multiple profile management (dev, staging, production)
 * 3. Configuration migration scenarios
 * 4. Error recovery in production environments
 * 5. Real-world usage patterns
 */

import { assertEquals, assertExists, assertRejects as _assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { BreakdownConfig } from "../../mod.ts";
import { Result as _Result } from "../../src/types/unified_result.ts";
import type { MergedConfig } from "../../src/types/merged_config.ts";
import {
  assertConfigValidationError as _assertConfigValidationError,
  assertResultErrorKind,
  assertUnifiedResultOk as _assertUnifiedResultOk,
} from "../test_helpers/result_test_helpers.ts";

describe("Complete Workflow E2E Tests", () => {
  describe("Full Application Lifecycle", () => {
    it("should handle complete initialization → load → use workflow", async () => {
      // Step 1: Initialize with default configuration
      const configResult = BreakdownConfig.create();
      assertExists(configResult.success);
      assertEquals(configResult.success, true);

      if (!configResult.success) {
        if (configResult.error instanceof Error) {
          throw new Error(`Config creation failed: ${configResult.error.message}`);
        } else {
          throw new Error(`Config creation failed: ${configResult.error.message}`);
        }
      }

      const config = configResult.data;

      // Step 2: Load configuration
      const loadResult = await config.loadConfigSafe();

      // Step 3: Use configuration
      if (loadResult.success) {
        const mergedConfig = await config.getConfig();

        // Verify complete configuration structure
        assertExists(mergedConfig.working_dir);
        assertExists(mergedConfig.app_prompt);
        assertExists(mergedConfig.app_schema);
        assertEquals(typeof mergedConfig.working_dir, "string");
        assertEquals(typeof mergedConfig.app_prompt.base_dir, "string");
        assertEquals(typeof mergedConfig.app_schema.base_dir, "string");

        // Step 4: Use resolved paths
        const workingDir = await config.getWorkingDir();
        const promptDir = await config.getPromptDir();
        const schemaDir = await config.getSchemaDir();

        assertExists(workingDir);
        assertExists(promptDir);
        assertExists(schemaDir);
      }
    });

    it("should support project initialization with custom base directory", async () => {
      const projectRoot = await Deno.makeTempDir();

      try {
        // Step 1: Create project structure
        const configDir = join(projectRoot, ".agent/breakdown/config");
        await ensureDir(configDir);

        // Step 2: Initialize BreakdownConfig
        const configResult = BreakdownConfig.create(undefined, projectRoot);
        assertEquals(configResult.success, true);

        if (!configResult.success) {
          throw new Error(`Config creation failed: ${configResult.error.message}`);
        }

        const config = configResult.data;

        // Step 3: Generate default configuration
        const appConfig = {
          working_dir: ".agent/breakdown",
          app_prompt: {
            base_dir: "prompts/app",
          },
          app_schema: {
            base_dir: "schemas/app",
          },
        };

        // Write app config
        await Deno.writeTextFile(
          join(configDir, "app.yml"),
          `working_dir: ${appConfig.working_dir}
app_prompt:
  base_dir: ${appConfig.app_prompt.base_dir}
app_schema:
  base_dir: ${appConfig.app_schema.base_dir}`,
        );

        // Step 4: Load and verify
        await config.loadConfig();
        const mergedConfig = await config.getConfig();

        assertEquals(mergedConfig.working_dir, appConfig.working_dir);
        assertEquals(mergedConfig.app_prompt.base_dir, appConfig.app_prompt.base_dir);
        assertEquals(mergedConfig.app_schema.base_dir, appConfig.app_schema.base_dir);
      } finally {
        await Deno.remove(projectRoot, { recursive: true });
      }
    });
  });

  describe("Multiple Profile Management", () => {
    it("should manage development, staging, and production profiles", async () => {
      const projectRoot = await Deno.makeTempDir();

      try {
        const configDir = join(projectRoot, ".agent/breakdown/config");
        await ensureDir(configDir);

        // Create profile configurations
        const profiles = {
          development: {
            working_dir: ".agent/breakdown/dev",
            app_prompt: { base_dir: "dev/prompts" },
            app_schema: { base_dir: "dev/schemas" },
          },
          staging: {
            working_dir: ".agent/breakdown/staging",
            app_prompt: { base_dir: "staging/prompts" },
            app_schema: { base_dir: "staging/schemas" },
          },
          production: {
            working_dir: ".agent/breakdown/prod",
            app_prompt: { base_dir: "prod/prompts" },
            app_schema: { base_dir: "prod/schemas" },
          },
        };

        // Write profile configurations
        for (const [profile, config] of Object.entries(profiles)) {
          await Deno.writeTextFile(
            join(configDir, `${profile}-app.yml`),
            `working_dir: ${config.working_dir}
app_prompt:
  base_dir: ${config.app_prompt.base_dir}
app_schema:
  base_dir: ${config.app_schema.base_dir}`,
          );
        }

        // Test each profile
        for (const [profile, expectedConfig] of Object.entries(profiles)) {
          const configResult = BreakdownConfig.create(profile, projectRoot);
          assertEquals(configResult.success, true);

          if (!configResult.success) continue;

          const config = configResult.data;
          await config.loadConfig();
          const mergedConfig = await config.getConfig();

          assertEquals(
            mergedConfig.working_dir,
            expectedConfig.working_dir,
            `${profile} working_dir should match`,
          );
          assertEquals(
            mergedConfig.app_prompt.base_dir,
            expectedConfig.app_prompt.base_dir,
            `${profile} prompt dir should match`,
          );
          assertEquals(
            mergedConfig.app_schema.base_dir,
            expectedConfig.app_schema.base_dir,
            `${profile} schema dir should match`,
          );
        }
      } finally {
        await Deno.remove(projectRoot, { recursive: true });
      }
    });

    it("should handle profile switching during runtime", async () => {
      const projectRoot = await Deno.makeTempDir();

      try {
        const configDir = join(projectRoot, ".agent/breakdown/config");
        await ensureDir(configDir);

        // Create configurations
        const configs = ["development", "production"];
        for (const profile of configs) {
          await Deno.writeTextFile(
            join(configDir, `${profile}-app.yml`),
            `working_dir: .agent/breakdown/${profile}
app_prompt:
  base_dir: ${profile}/prompts
app_schema:
  base_dir: ${profile}/schemas`,
          );
        }

        // Start with development
        const devConfigResult = BreakdownConfig.create("development", projectRoot);
        assertEquals(devConfigResult.success, true);
        if (!devConfigResult.success) throw new Error("Dev config failed");

        const devConfig = devConfigResult.data;
        await devConfig.loadConfig();
        const devMerged = await devConfig.getConfig();
        assertEquals(devMerged.working_dir, ".agent/breakdown/development");

        // Switch to production
        const prodConfigResult = BreakdownConfig.create("production", projectRoot);
        assertEquals(prodConfigResult.success, true);
        if (!prodConfigResult.success) throw new Error("Prod config failed");

        const prodConfig = prodConfigResult.data;
        await prodConfig.loadConfig();
        const prodMerged = await prodConfig.getConfig();
        assertEquals(prodMerged.working_dir, ".agent/breakdown/production");

        // Verify isolation - dev config should remain unchanged
        const devCheck = await devConfig.getConfig();
        assertEquals(devCheck.working_dir, ".agent/breakdown/development");
      } finally {
        await Deno.remove(projectRoot, { recursive: true });
      }
    });
  });

  describe("Real-World Usage Scenarios", () => {
    it("should handle configuration migration from legacy format", async () => {
      const projectRoot = await Deno.makeTempDir();

      try {
        const configDir = join(projectRoot, ".agent/breakdown/config");
        await ensureDir(configDir);

        // Simulate legacy configuration
        const legacyConfig = `# Legacy configuration format
appName: my-app
version: 1.0.0
profiles:
  default:
    baseDir: ./base
    promptDir: ./prompts
    schemaDir: ./schemas`;

        await Deno.writeTextFile(
          join(configDir, "legacy.yml"),
          legacyConfig,
        );

        // Create new format configuration
        await Deno.writeTextFile(
          join(configDir, "app.yml"),
          `working_dir: .agent/breakdown
app_prompt:
  base_dir: breakdown/prompts/app
app_schema:
  base_dir: breakdown/schemas/app`,
        );

        // Load with new system
        const configResult = BreakdownConfig.create(undefined, projectRoot);
        assertEquals(configResult.success, true);

        if (!configResult.success) throw new Error("Config creation failed");

        const config = configResult.data;
        await config.loadConfig();
        const mergedConfig = await config.getConfig();

        // Verify new format is loaded correctly
        assertEquals(mergedConfig.working_dir, ".agent/breakdown");
        assertExists(mergedConfig.app_prompt.base_dir);
        assertExists(mergedConfig.app_schema.base_dir);
      } finally {
        await Deno.remove(projectRoot, { recursive: true });
      }
    });

    it("should support CI/CD pipeline configuration", async () => {
      const projectRoot = await Deno.makeTempDir();

      try {
        // Simulate CI environment
        const environments = ["ci", "cd-staging", "cd-production"];

        for (const env of environments) {
          const configDir = join(projectRoot, env, ".agent/breakdown/config");
          await ensureDir(configDir);

          // Environment-specific configuration
          const config = {
            working_dir: `.agent/breakdown/${env}`,
            app_prompt: {
              base_dir: `${env}/prompts`,
            },
            app_schema: {
              base_dir: `${env}/schemas`,
            },
          };

          await Deno.writeTextFile(
            join(configDir, "app.yml"),
            `working_dir: ${config.working_dir}
app_prompt:
  base_dir: ${config.app_prompt.base_dir}
app_schema:
  base_dir: ${config.app_schema.base_dir}`,
          );

          // Test loading in each environment
          const envRoot = join(projectRoot, env);
          const configResult = BreakdownConfig.create(undefined, envRoot);

          assertEquals(configResult.success, true);
          if (!configResult.success) continue;

          const breakdownConfig = configResult.data;
          await breakdownConfig.loadConfig();
          const mergedConfig = await breakdownConfig.getConfig();

          assertEquals(
            mergedConfig.working_dir,
            config.working_dir,
            `${env} should have correct working dir`,
          );
        }
      } finally {
        await Deno.remove(projectRoot, { recursive: true });
      }
    });

    it("should handle configuration validation and error recovery", async () => {
      const projectRoot = await Deno.makeTempDir();

      try {
        const configDir = join(projectRoot, ".agent/breakdown/config");
        await ensureDir(configDir);

        // Create invalid configuration
        await Deno.writeTextFile(
          join(configDir, "app.yml"),
          `working_dir: ""
app_prompt:
  base_dir: 123
app_schema:
  base_dir: null`,
        );

        const configResult = BreakdownConfig.create(undefined, projectRoot);
        assertEquals(configResult.success, true);

        if (!configResult.success) throw new Error("Config creation failed");

        const config = configResult.data;
        const loadResult = await config.loadConfigSafe();

        // Should fail validation
        assertEquals(loadResult.success, false);
        if (!loadResult.success) {
          // Multiple validation errors expected for empty string and invalid types
          assertResultErrorKind(loadResult, "CONFIG_VALIDATION_ERROR");
        }

        // Recovery: Create valid configuration
        await Deno.writeTextFile(
          join(configDir, "app.yml"),
          `working_dir: .agent/breakdown
app_prompt:
  base_dir: breakdown/prompts/app
app_schema:
  base_dir: breakdown/schemas/app`,
        );

        // Reload configuration
        const recoveredConfig = BreakdownConfig.create(undefined, projectRoot);
        assertEquals(recoveredConfig.success, true);

        if (!recoveredConfig.success) throw new Error("Recovery failed");

        const newConfig = recoveredConfig.data;
        await newConfig.loadConfig();
        const mergedConfig = await newConfig.getConfig();

        assertEquals(mergedConfig.working_dir, ".agent/breakdown");
      } finally {
        await Deno.remove(projectRoot, { recursive: true });
      }
    });

    it("should support plugin architecture with custom configurations", async () => {
      const projectRoot = await Deno.makeTempDir();

      try {
        const configDir = join(projectRoot, ".agent/breakdown/config");
        await ensureDir(configDir);

        // Base configuration
        await Deno.writeTextFile(
          join(configDir, "app.yml"),
          `working_dir: .agent/breakdown
app_prompt:
  base_dir: breakdown/prompts/app
app_schema:
  base_dir: breakdown/schemas/app`,
        );

        // Plugin configurations
        const plugins = ["auth", "logging", "caching"];
        for (const plugin of plugins) {
          await Deno.writeTextFile(
            join(configDir, `plugin-${plugin}-app.yml`),
            `working_dir: .agent/breakdown/plugins/${plugin}
app_prompt:
  base_dir: plugins/${plugin}/prompts
app_schema:
  base_dir: plugins/${plugin}/schemas`,
          );
        }

        // Load base configuration
        const baseResult = BreakdownConfig.create(undefined, projectRoot);
        assertEquals(baseResult.success, true);

        if (!baseResult.success) throw new Error("Base config failed");

        const baseConfig = baseResult.data;
        await baseConfig.loadConfig();
        const baseMerged = await baseConfig.getConfig();

        assertEquals(baseMerged.working_dir, ".agent/breakdown");

        // Load plugin configurations
        for (const plugin of plugins) {
          const pluginResult = BreakdownConfig.create(`plugin-${plugin}`, projectRoot);
          assertEquals(pluginResult.success, true);

          if (!pluginResult.success) continue;

          const pluginConfig = pluginResult.data;
          await pluginConfig.loadConfig();
          const pluginMerged = await pluginConfig.getConfig();

          assertEquals(
            pluginMerged.working_dir,
            `.agent/breakdown/plugins/${plugin}`,
            `Plugin ${plugin} should have correct working dir`,
          );
        }
      } finally {
        await Deno.remove(projectRoot, { recursive: true });
      }
    });
  });

  describe("Advanced Workflow Patterns", () => {
    it("should handle distributed configuration across multiple services", async () => {
      const projectRoot = await Deno.makeTempDir();

      try {
        // Simulate microservices architecture
        const services = ["api", "worker", "scheduler"];
        const configs: Record<string, MergedConfig> = {};

        for (const service of services) {
          const serviceDir = join(projectRoot, service);
          const configDir = join(serviceDir, ".agent/breakdown/config");
          await ensureDir(configDir);

          // Service-specific configuration
          await Deno.writeTextFile(
            join(configDir, "app.yml"),
            `working_dir: .agent/breakdown/${service}
app_prompt:
  base_dir: ${service}/prompts
app_schema:
  base_dir: ${service}/schemas`,
          );

          // Load configuration
          const configResult = BreakdownConfig.create(undefined, serviceDir);
          assertEquals(configResult.success, true);

          if (!configResult.success) continue;

          const config = configResult.data;
          await config.loadConfig();
          configs[service] = await config.getConfig();
        }

        // Verify service isolation
        assertEquals(configs.api.working_dir, ".agent/breakdown/api");
        assertEquals(configs.worker.working_dir, ".agent/breakdown/worker");
        assertEquals(configs.scheduler.working_dir, ".agent/breakdown/scheduler");

        // Verify unique prompt/schema paths
        for (const service of services) {
          assertEquals(
            configs[service].app_prompt.base_dir,
            `${service}/prompts`,
          );
          assertEquals(
            configs[service].app_schema.base_dir,
            `${service}/schemas`,
          );
        }
      } finally {
        await Deno.remove(projectRoot, { recursive: true });
      }
    });

    it("should support configuration hot-reloading simulation", async () => {
      const projectRoot = await Deno.makeTempDir();

      try {
        const configDir = join(projectRoot, ".agent/breakdown/config");
        await ensureDir(configDir);

        // Initial configuration
        const initialConfig = {
          working_dir: ".agent/breakdown/v1",
          app_prompt: { base_dir: "v1/prompts" },
          app_schema: { base_dir: "v1/schemas" },
        };

        await Deno.writeTextFile(
          join(configDir, "app.yml"),
          `working_dir: ${initialConfig.working_dir}
app_prompt:
  base_dir: ${initialConfig.app_prompt.base_dir}
app_schema:
  base_dir: ${initialConfig.app_schema.base_dir}`,
        );

        // Load initial configuration
        const configResult1 = BreakdownConfig.create(undefined, projectRoot);
        assertEquals(configResult1.success, true);

        if (!configResult1.success) throw new Error("Initial config failed");

        const config1 = configResult1.data;
        await config1.loadConfig();
        const merged1 = await config1.getConfig();

        assertEquals(merged1.working_dir, initialConfig.working_dir);

        // Update configuration (simulate hot-reload)
        const updatedConfig = {
          working_dir: ".agent/breakdown/v2",
          app_prompt: { base_dir: "v2/prompts" },
          app_schema: { base_dir: "v2/schemas" },
        };

        await Deno.writeTextFile(
          join(configDir, "app.yml"),
          `working_dir: ${updatedConfig.working_dir}
app_prompt:
  base_dir: ${updatedConfig.app_prompt.base_dir}
app_schema:
  base_dir: ${updatedConfig.app_schema.base_dir}`,
        );

        // Create new instance to simulate reload
        const configResult2 = BreakdownConfig.create(undefined, projectRoot);
        assertEquals(configResult2.success, true);

        if (!configResult2.success) throw new Error("Updated config failed");

        const config2 = configResult2.data;
        await config2.loadConfig();
        const merged2 = await config2.getConfig();

        assertEquals(merged2.working_dir, updatedConfig.working_dir);

        // Verify original instance unchanged (no hot-reload)
        const check1 = await config1.getConfig();
        assertEquals(check1.working_dir, initialConfig.working_dir);
      } finally {
        await Deno.remove(projectRoot, { recursive: true });
      }
    });
  });
});
