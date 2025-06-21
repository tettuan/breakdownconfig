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
    const config = new BreakdownConfig(environment, ".");

    // Load the configuration
    await config.loadConfig();

    // Get the merged configuration
    const mergedConfig = await config.getConfig();

    // Type-safe access to optional configuration properties
    const logging = mergedConfig.logging as { level?: string } | undefined;
    const cache = mergedConfig.cache as { enable?: boolean; ttl?: number } | undefined;
    const database = mergedConfig.database as { host?: string; pool_size?: number } | undefined;
    const api = mergedConfig.api as { rate_limit?: number } | undefined;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error loading ${environment} config:`, errorMessage);
  }
}

async function main() {
  // Demonstrate different environment configurations
  const environments = ["production", "staging", "development"];

  for (const env of environments) {
    await demonstrateEnvironmentConfig(env);
  }

  // Load all environments and compare specific settings
  const configs = new Map();

  for (const env of environments) {
    try {
      const config = new BreakdownConfig(env, ".");
      await config.loadConfig();
      const mergedConfig = await config.getConfig();
      configs.set(env, mergedConfig);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to load ${env} config:`, errorMessage);
    }
  }

  // Compare cache settings
  for (const [env, config] of configs) {
    const cache = config.cache as { enable?: boolean; ttl?: number } | undefined;
  }

  // Compare database settings
  for (const [env, config] of configs) {
    const database = config.database as { host?: string; pool_size?: number } | undefined;
  }
}

// Run the example
if (import.meta.main) {
  await main();
}
