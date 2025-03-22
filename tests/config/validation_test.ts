/**
 * Configuration Validation Tests
 *
 * Purpose:
 * Test the validation of configuration content and structure
 *
 * Test Cases:
 * 1. Required fields validation
 * 2. JSON structure validation
 * 3. Extra fields handling
 * 4. Empty values handling
 *
 * Success Criteria:
 * - Required fields are properly validated
 * - Invalid JSON is rejected
 * - Extra fields are handled gracefully
 * - Empty values are handled appropriately
 */

import { assertEquals } from "@std/assert/assert_equals";
import { assertRejects } from "@std/assert/assert_rejects";
import { join } from "@std/path";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import {
  cleanupTestConfigs,
  setupAppConfigOnly,
  setupExtraFieldsConfig,
  setupInvalidConfig,
  invalidAppConfigs,
} from "../test_utils.ts";
import { describe, it } from "@std/testing/bdd";
import { ensureDir } from "@std/fs";

describe("Config Validation", () => {
  it("should validate extra fields in config", async () => {
    const tempDir = await setupExtraFieldsConfig();
    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = await config.getConfig();

      assertEquals(result.working_dir, "workspace");
      assertEquals(result.app_prompt.base_dir, "prompts");
      assertEquals(result.app_schema.base_dir, "schemas");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
});

describe("Should validate required fields", () => {
  it("should validate required fields", async () => {
    const tempDir = await setupAppConfigOnly();
    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = await config.getConfig();

      assertEquals(result.working_dir, "workspace");
      assertEquals(result.app_prompt.base_dir, "prompts");
      assertEquals(result.app_schema.base_dir, "schemas");

      assertEquals(Object.keys(result).sort(), ["working_dir", "app_prompt", "app_schema"].sort());
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
});

describe("Should validate JSON structure", () => {
  it("should reject invalid YAML", async () => {
    const tempDir = await setupInvalidConfig({ invalid: "yaml: :" });
    try {
      const config = new BreakdownConfig(tempDir);
      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
        "ERR1002: Invalid application configuration"
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
});

describe("Should accept extra configuration fields", () => {
  it("should accept extra fields", async () => {
    const tempDir = await setupExtraFieldsConfig();
    try {
      const config = new BreakdownConfig(tempDir);
      await config.loadConfig();
      const result = await config.getConfig();

      assertEquals(result.working_dir, "workspace");
      assertEquals(result.app_prompt.base_dir, "prompts");
      assertEquals(result.app_schema.base_dir, "schemas");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
});

describe("Should reject empty working directory", () => {
  it("should reject empty working directory", async () => {
    const tempDir = await setupInvalidConfig(invalidAppConfigs.emptyStrings);
    try {
      const config = new BreakdownConfig(tempDir);
      await assertRejects(
        async () => {
          await config.loadConfig();
        },
        Error,
        "ERR1002: Invalid application configuration"
      );
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
});
