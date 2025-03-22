/**
 * Configuration Example
 * 
 * This module demonstrates how to load and use application configuration
 * using the ConfigManager class.
 * 
 * The configuration structure follows the hierarchical design:
 * - breakdown/
 *   - config/
 *     - app.yaml (Application configuration)
 *     - user.yaml (User-specific configuration, optional)
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

    console.log("=== Configuration Example ===");
    console.log("Working Directory:", config.working_dir);
    console.log("App Prompt Base Directory:", config.app_prompt.base_dir);
    console.log("App Schema Base Directory:", config.app_schema.base_dir);

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