/**
 * Prompt Manager Example
 * 
 * This module demonstrates how to load and use application and user configurations
 * using the BreakdownConfig class.
 * 
 * The configuration structure follows the hierarchical design:
 * - breakdown/
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

import { BreakdownConfig } from "@tettuan/breakdownconfig";
import { BreakdownLogger } from "@tettuan/breakdownlogger";

const logger = new BreakdownLogger();

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
      logger.debug("Directory created/validated", { directory: url.pathname });
    } catch (error) {
      if (error instanceof Deno.errors.AlreadyExists) {
        logger.debug("Directory already exists", { directory: url.pathname });
      } else if (error instanceof Error) {
        logger.warn("Failed to create directory", { directory: url.pathname, error: error.message });
      } else {
        logger.warn("Failed to create directory", { directory: url.pathname, error: String(error) });
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
  const config = new BreakdownConfig();
  await config.loadConfig();
  const settings = config.getConfig();

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
  try {
    const baseUrl = new URL(import.meta.url);
    logger.info("Loading configuration...", { baseUrl: baseUrl.href });

    const { workingDir, promptDir, schemaDir, isUserConfig } = await loadAndValidateConfig(baseUrl);
    logger.debug("Configuration loaded successfully", {
      workingDir: workingDir.pathname,
      promptDir: promptDir.pathname,
      schemaDir: schemaDir.pathname,
      isUserConfig,
    });

    // Display configuration
    console.log("=== Prompt Manager Configuration ===");
    console.log("Working Directory:", workingDir.pathname);
    
    if (isUserConfig) {
      logger.info("User configuration detected");
      console.log("\nFinal Configuration (App + User):");
      console.log("  Prompt Base Directory:", promptDir.pathname);
      console.log("  Schema Base Directory:", schemaDir.pathname);
      console.log("\nNote: User configuration has overridden the app configuration");
    } else {
      logger.info("Using default application configuration");
      console.log("\nFinal Configuration (App only):");
      console.log("  Prompt Base Directory:", promptDir.pathname);
      console.log("  Schema Base Directory:", schemaDir.pathname);
    }

    // Create directory structure
    logger.info("Validating directory structure...");
    await createDirectoryStructure(baseUrl, [
      workingDir.pathname,
      `${workingDir.pathname}/prompts`,
      `${workingDir.pathname}/schema`,
    ]);

  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error("Configuration error", { error: error.message });
      console.error("Error:", error.message);
    } else {
      logger.error("Unknown error occurred");
      console.error("Unknown error occurred");
    }
    Deno.exit(1);
  }
}

// Run the example
if (import.meta.main) {
  main();
} 