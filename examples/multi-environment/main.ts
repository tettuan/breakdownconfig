import { BreakdownConfig } from "../../src/breakdown_config.ts";

/**
 * Multi-environment configuration example
 *
 * This example demonstrates how to use BreakdownConfig with different
 * environment-specific configurations (production, staging, development).
 */

async function demonstrateEnvironmentConfig(environment: string) {
  console.log(`\n=== ${environment.toUpperCase()} Environment ===`);

  try {
    // Create BreakdownConfig instance with environment-specific config set
    const config = new BreakdownConfig(environment, ".");

    // Load the configuration
    await config.loadConfig();

    // Get the merged configuration
    const mergedConfig = await config.getConfig();

    // Display key configuration values
    console.log(`Working Directory: ${await config.getWorkingDir()}`);
    console.log(`Prompt Directory: ${await config.getPromptDir()}`);
    console.log(`Schema Directory: ${await config.getSchemaDir()}`);
    console.log(`Logging Level: ${mergedConfig.logging?.level || "not set"}`);
    console.log(`Cache Enabled: ${mergedConfig.cache?.enable || false}`);
    console.log(`Database Host: ${mergedConfig.database?.host || "not set"}`);
    console.log(`API Rate Limit: ${mergedConfig.api?.rate_limit || "not set"}`);
  } catch (error) {
    console.error(`Error loading ${environment} config:`, error.message);
  }
}

async function main() {
  console.log("Multi-Environment Configuration Example");
  console.log("======================================");

  // Demonstrate different environment configurations
  const environments = ["production", "staging", "development"];

  for (const env of environments) {
    await demonstrateEnvironmentConfig(env);
  }

  console.log("\n=== Environment Comparison ===");

  // Load all environments and compare specific settings
  const configs = new Map();

  for (const env of environments) {
    try {
      const config = new BreakdownConfig(env, ".");
      await config.loadConfig();
      const mergedConfig = await config.getConfig();
      configs.set(env, mergedConfig);
    } catch (error) {
      console.error(`Failed to load ${env} config:`, error.message);
    }
  }

  // Compare logging levels
  console.log("\nLogging Levels:");
  for (const [env, config] of configs) {
    console.log(`  ${env}: ${config.logging?.level || "not set"}`);
  }

  // Compare cache settings
  console.log("\nCache Settings:");
  for (const [env, config] of configs) {
    console.log(
      `  ${env}: ${config.cache?.enable ? "enabled" : "disabled"} (TTL: ${
        config.cache?.ttl || "not set"
      })`,
    );
  }

  // Compare database settings
  console.log("\nDatabase Hosts:");
  for (const [env, config] of configs) {
    console.log(
      `  ${env}: ${config.database?.host || "not set"} (pool: ${
        config.database?.pool_size || "not set"
      })`,
    );
  }
}

// Run the example
if (import.meta.main) {
  await main();
}
