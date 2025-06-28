import { BreakdownConfig } from "../../src/breakdown_config.ts";

/**
 * Multi-environment configuration example
 *
 * This example demonstrates how to use BreakdownConfig with different
 * environment-specific configurations (production, staging, development).
 */

async function demonstrateEnvironmentConfig(environment: string) {
  try {
    // Create BreakdownConfig instance with environment-specific config set
    const configResult = BreakdownConfig.create(environment, ".");
    if (!configResult.success) {
      throw new Error(`Config creation failed: ${configResult.error.message}`);
    }
    const config = configResult.data;

    // Load the configuration
    await config.loadConfig();

    // Get the merged configuration
    const mergedConfig = await config.getConfig();

    // Type-safe access to optional configuration properties
    const _logging = mergedConfig.logging as { level?: string } | undefined;
    const _cache = mergedConfig.cache as { enable?: boolean; ttl?: number } | undefined;
    const _database = mergedConfig.database as { host?: string; pool_size?: number } | undefined;
    const _api = mergedConfig.api as { rate_limit?: number } | undefined;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error loading ${environment} config:`, errorMessage);
  }
}

async function main() {
  // Demonstrate different environment configurations
  const environments = ["production", "staging", "development"];

  for (const _env of environments) {
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
  await main();
}
