/**
 * Prompt Manager Example
 *
 * This module demonstrates how to load and use application and user configurations
 * using the BreakdownConfig class.
 *
 * The configuration structure follows the hierarchical design:
 * - climpt/
 *   - config/
 *     - app.yaml (Application configuration)
 *     - user.yaml (User-specific configuration)
 *
 * This example shows:
 * 1. Configuration loading with user overrides
 * 2. Path resolution and validation
 * 3. Structured logging
 * 4. Error handling and recovery
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
 * Creates a directory structure
 * @param baseUrl - The base URL to resolve paths against
 * @param dirs - Array of directory paths to create
 */
async function createDirectoryStructure(baseUrl: URL, dirs: string[]): Promise<void> {
  for (const dir of dirs) {
    const url = validatePath(dir, baseUrl);
    if (!url) {
      throw new Error(`Invalid directory path: ${dir}`);
    }

    try {
      await Deno.mkdir(url.pathname, { recursive: true });
      console.log("📁 [DIR] Directory created/validated:", { directory: url.pathname });
    } catch (error) {
      if (error instanceof Deno.errors.AlreadyExists) {
        console.log("📁 [DIR] Directory already exists:", { directory: url.pathname });
      } else if (error instanceof Error) {
        console.log("⚠️ [DIR] Failed to create directory:", {
          directory: url.pathname,
          error: error.message,
        });
      } else {
        console.log("⚠️ [DIR] Failed to create directory:", {
          directory: url.pathname,
          error: String(error),
        });
      }
    }
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
  isUserConfig: boolean;
}> {
  const configResult = BreakdownConfig.create();
  if (!configResult.success) {
    throw new Error(`Config creation failed: ${configResult.error.message}`);
  }
  const config = configResult.data;

  await config.loadConfig();
  const settings = await config.getConfig();

  // Validate paths
  const workingDir = validatePath(settings.working_dir, baseUrl);
  const promptDir = validatePath(settings.app_prompt.base_dir, baseUrl);
  const schemaDir = validatePath(settings.app_schema.base_dir, baseUrl);

  if (!workingDir || !promptDir || !schemaDir) {
    throw new Error("Invalid path configuration");
  }

  // Check if user config is being used
  const isUserConfig = settings.app_prompt.base_dir === "./prompts/user" ||
    settings.app_schema.base_dir === "./schema/user";

  return { workingDir, promptDir, schemaDir, isUserConfig };
}

async function main() {
  console.log("🚀 [TRACE] prompt-manager main() function started");
  try {
    const baseUrl = new URL(import.meta.url);
    console.log("🔧 [TRACE] baseUrl created:", baseUrl.href);
    console.log("📚 [CONFIG] Loading configuration...", { baseUrl: baseUrl.href });

    const { workingDir, promptDir, schemaDir, isUserConfig } = await loadAndValidateConfig(baseUrl);
    console.log("🔍 [CONFIG] Configuration loaded successfully:", {
      workingDir: workingDir.pathname,
      promptDir: promptDir.pathname,
      schemaDir: schemaDir.pathname,
      isUserConfig,
    });

    // Display configuration
    console.log("📋 [CONFIG] === Prompt Manager Configuration ===");
    console.log("📁 [CONFIG] Working Directory:", { workingDir: workingDir.pathname });

    if (isUserConfig) {
      console.log("👤 [CONFIG] User configuration detected");
      console.log("🔄 [CONFIG] Final Configuration (App + User)");
      console.log("📄 [CONFIG] Prompt Base Directory:", { promptDir: promptDir.pathname });
      console.log("📈 [CONFIG] Schema Base Directory:", { schemaDir: schemaDir.pathname });
      console.log("ℹ️ [CONFIG] Note: User configuration has overridden the app configuration");
    } else {
      console.log("🏠 [CONFIG] Using default application configuration");
      console.log("📁 [CONFIG] Final Configuration (App only)");
      console.log("📄 [CONFIG] Prompt Base Directory:", { promptDir: promptDir.pathname });
      console.log("📈 [CONFIG] Schema Base Directory:", { schemaDir: schemaDir.pathname });
    }

    // Create directory structure
    console.log("🔍 [CONFIG] Validating directory structure...");
    await createDirectoryStructure(baseUrl, [
      workingDir.pathname,
      `${workingDir.pathname}/prompts`,
      `${workingDir.pathname}/schema`,
    ]);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log("💥 [ERROR] Configuration error:", { error: error.message });
    } else {
      console.log("❓ [ERROR] Unknown error occurred");
    }
    Deno.exit(1);
  }
}

// Run the example
if (import.meta.main) {
  console.log("🎬 [TRACE] prompt-manager import.meta.main is true, starting main()");
  main();
} else {
  console.log("⏸️ [TRACE] prompt-manager import.meta.main is false, not running main()");
}
