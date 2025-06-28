import { BreakdownConfig } from "../../src/breakdown_config.ts";

/**
 * Multi-environment configuration example
 *
 * This example demonstrates how to use BreakdownConfig with different
 * environment-specific configurations (production, staging, development).
 */

async function demonstrateEnvironmentConfig(environment: string) {
  console.log(`🌍 [MULTI-ENV] Starting environment config for: ${environment}`);
  try {
    // Create BreakdownConfig instance with environment-specific config set
    console.log(`🏗️ [MULTI-ENV] Creating BreakdownConfig for ${environment}...`);
    const configResult = BreakdownConfig.create(environment, ".");
    if (!configResult.success) {
      throw new Error(`Config creation failed: ${configResult.error.message}`);
    }
    const config = configResult.data;
    console.log(`✅ [MULTI-ENV] BreakdownConfig created successfully for ${environment}`);

    // Load the configuration
    console.log(`📖 [MULTI-ENV] Loading configuration for ${environment}...`);
    await config.loadConfig();
    console.log(`✅ [MULTI-ENV] Configuration loaded for ${environment}`);

    // Get the merged configuration
    console.log(`📋 [MULTI-ENV] Getting merged configuration for ${environment}...`);
    const mergedConfig = await config.getConfig();
    console.log(`📊 [MULTI-ENV] ${environment} config:`, JSON.stringify(mergedConfig, null, 2));

    // Type-safe access to optional configuration properties
    const _logging = mergedConfig.logging as { level?: string } | undefined;
    const _cache = mergedConfig.cache as { enable?: boolean; ttl?: number } | undefined;
    const _database = mergedConfig.database as { host?: string; pool_size?: number } | undefined;
    const _api = mergedConfig.api as { rate_limit?: number } | undefined;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`❌ [MULTI-ENV] Error loading ${environment} config:`, errorMessage);
  }
}

async function main() {
  console.log("🚀 [MULTI-ENV] Multi-environment example started");
  // Demonstrate different environment configurations
  const environments = ["production", "staging", "development"];
  console.log("🌐 [MULTI-ENV] Testing environments:", environments);

  for (const _env of environments) {
    console.log(`\n=== [MULTI-ENV] Processing ${_env} environment ===`);
    await demonstrateEnvironmentConfig(_env);
  }

  // Load all environments and compare specific settings
  const configs = new Map();

  for (const _env of environments) {
    try {
      const configResult = BreakdownConfig.create(_env, ".");
      if (!configResult.success) {
        throw new Error(`Config creation failed: ${configResult.error.message}`);
      }
      const config = configResult.data;
      await config.loadConfig();
      const mergedConfig = await config.getConfig();
      configs.set(_env, mergedConfig);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to load ${_env} config:`, errorMessage);
    }
  }

  // Compare cache settings
  for (const [_env, config] of configs) {
    const _cache = config.cache as { enable?: boolean; ttl?: number } | undefined;
  }

  // Compare database settings
  for (const [_env, config] of configs) {
    const _database = config.database as { host?: string; pool_size?: number } | undefined;
  }
}

// Run the example
if (import.meta.main) {
  console.log("🎬 [MULTI-ENV] import.meta.main is true, starting main()");
  await main();
  console.log("✨ [MULTI-ENV] Multi-environment example completed!");
} else {
  console.log("⏸️ [MULTI-ENV] import.meta.main is false, not running main()");
}
