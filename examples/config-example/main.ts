/**
 * Configuration Example
 *
 * This module demonstrates how to load and use application configuration
 * using the BreakdownConfig class.
 *
 * The configuration structure follows the hierarchical design:
 * - climpt/
 *   - config/
 *     - app.yaml (Application configuration)
 *     - user.yaml (User-specific configuration, optional)
 *
 * This example shows:
 * 1. Basic configuration loading
 * 2. Error handling for missing or invalid configurations
 * 3. Path resolution using URL API
 * 4. Environment variable handling
 * 5. Proper module structure
 */

import { BreakdownConfig } from "../../mod.ts";

/**
 * Validates a path using URL API
 * @param path - The path to validate
 * @param baseUrl - The base URL to resolve against
 * @returns The validated URL or null if invalid
 */
function validatePath(path: string, baseUrl: URL): URL | null {
  try {
    const url = new URL(path, baseUrl);
    // Basic path validation (e.g., no directory traversal)
    if (!url.pathname.includes("..")) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Loads and validates configuration
 * @param baseUrl - The base URL to resolve paths against
 * @returns The validated configuration
 */
async function loadAndValidateConfig(baseUrl: URL): Promise<{
  workingDir: URL;
  promptDir: URL;
  schemaDir: URL;
}> {
  console.log("⚙️ [TRACE] loadAndValidateConfig started with baseUrl:", baseUrl.href);
  
  console.log("🏗️ [TRACE] Creating BreakdownConfig...");
  const configResult = BreakdownConfig.create();
  console.log("📊 [TRACE] BreakdownConfig.create() result:", configResult.success ? "SUCCESS" : "FAILED");
  
  if (!configResult.success) {
    console.log("💥 [TRACE] Config creation failed:", configResult.error.message);
    throw new Error(`Config creation failed: ${configResult.error.message}`);
  }
  const config = configResult.data;
  console.log("✅ [TRACE] BreakdownConfig instance created successfully");

  console.log("📖 [TRACE] Loading configuration...");
  await config.loadConfig();
  console.log("✅ [TRACE] Configuration loaded, getting settings...");
  const settings = await config.getConfig();
  console.log("📋 [TRACE] Settings retrieved:", JSON.stringify(settings, null, 2));

  // Validate paths
  const workingDir = validatePath(settings.working_dir, baseUrl);
  const promptDir = validatePath(settings.app_prompt.base_dir, baseUrl);
  const schemaDir = validatePath(settings.app_schema.base_dir, baseUrl);

  if (!workingDir || !promptDir || !schemaDir) {
    throw new Error("Invalid path configuration");
  }

  return { workingDir, promptDir, schemaDir };
}

async function main() {
  console.log("🚀 [TRACE] config-example main() function started");
  try {
    const baseUrl = new URL(import.meta.url);
    console.log("🔧 [TRACE] baseUrl created:", baseUrl.href);
    console.log("📚 [CONFIG] Loading configuration...", { baseUrl: baseUrl.href });

    console.log("📥 [TRACE] Starting loadAndValidateConfig...");
    const { workingDir, promptDir, schemaDir } = await loadAndValidateConfig(baseUrl);
    console.log("✅ [TRACE] loadAndValidateConfig completed successfully");
    console.log("📁 [TRACE] Paths:", { 
      workingDir: workingDir.pathname,
      promptDir: promptDir.pathname,
      schemaDir: schemaDir.pathname
    });
    
    console.log("🔍 [CONFIG] Configuration loaded successfully", {
      workingDir: workingDir.pathname,
      promptDir: promptDir.pathname,
      schemaDir: schemaDir.pathname,
    });

    // Display configuration
    console.log("🎯 [TRACE] Displaying configuration results...");
    console.log("📋 [CONFIG] === Configuration Example ===");
    console.log("📁 [CONFIG] Working Directory:", { workingDir: workingDir.pathname });
    console.log("📄 [CONFIG] App Prompt Base Directory:", { promptDir: promptDir.pathname });
    console.log("📊 [CONFIG] App Schema Base Directory:", { schemaDir: schemaDir.pathname });
    console.log("✨ [TRACE] config-example completed successfully!");
  } catch (error: unknown) {
    console.log("❌ [TRACE] Error caught in main():", error);
    if (error instanceof Error) {
      console.log("🔍 [TRACE] Error details:", error.message);
      console.log("🔍 [TRACE] Error stack:", error.stack);
      console.log("💥 [ERROR] Configuration error:", { error: error.message });
    } else {
      console.log("⚠️ [TRACE] Non-Error object caught:", error);
      console.log("❓ [ERROR] Unknown error occurred");
    }
    console.log("🚪 [TRACE] Exiting with code 1");
    Deno.exit(1);
  }
}

// Run the example
if (import.meta.main) {
  console.log("🎬 [TRACE] import.meta.main is true, starting main()");
  main();
} else {
  console.log("⏸️ [TRACE] import.meta.main is false, not running main()");
}
