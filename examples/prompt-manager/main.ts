/**
 * Prompt Manager Example
 * 
 * This module demonstrates how to load and use application and user configurations
 * using the ConfigManager class.
 * 
 * The configuration structure follows the hierarchical design:
 * - breakdown/
 *   - config/
 *     - app.yaml (Application configuration)
 *     - user.yaml (User-specific configuration)
 */

import { ConfigManager } from "../../src/config_manager.ts";
import { resolvePath } from "../../src/utils/path_resolver.ts";

async function main() {
  try {
    // Get the current module's URL
    const currentUrl = new URL(import.meta.url);
    // Get the config directory URL
    const configUrl = new URL("./breakdown/config/app.yaml", currentUrl);

    // Initialize the config manager with the config file URL
    const configManager = new ConfigManager(configUrl.pathname);

    // Load the configuration
    const config = await configManager.getConfig();

    console.log("=== Prompt Manager Configuration ===");
    console.log("Working Directory:", config.working_dir);
    
    // Check if user config exists by checking the merged config
    if (config.app_prompt.base_dir === "./prompts/user" || config.app_schema.base_dir === "./schema/user") {
      console.log("\nFinal Configuration (App + User):");
      console.log("  Prompt Base Directory:", config.app_prompt.base_dir);
      console.log("  Schema Base Directory:", config.app_schema.base_dir);
      console.log("\nNote: User configuration has overridden the app configuration");
    } else {
      console.log("\nFinal Configuration (App only):");
      console.log("  Prompt Base Directory:", config.app_prompt.base_dir);
      console.log("  Schema Base Directory:", config.app_schema.base_dir);
    }

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    } else {
      console.error("Unknown error occurred");
    }
  }
}

// Run the example
if (import.meta.main) {
  main();
} 