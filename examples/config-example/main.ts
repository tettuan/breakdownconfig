/**
 * Configuration Example
 *
 * This module demonstrates how to load and use application configuration
 * using the BreakdownConfig class.
 *
 * The configuration structure follows the hierarchical design:
 * - breakdown/
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
 * Loads and validates configuration
 * @param baseUrl - The base URL to resolve paths against
 * @returns The validated configuration
 */
async function loadAndValidateConfig(baseUrl: URL): Promise<{
  workingDir: URL;
  promptDir: URL;
  schemaDir: URL;
}> {
  const config = new BreakdownConfig();
  await config.loadConfig();
  const settings = await config.getConfig();

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
  try {
    const baseUrl = new URL(import.meta.url);
    logger.info("Loading configuration...", { baseUrl: baseUrl.href });

    const { workingDir, promptDir, schemaDir } = await loadAndValidateConfig(baseUrl);
    logger.debug("Configuration loaded successfully", {
      workingDir: workingDir.pathname,
      promptDir: promptDir.pathname,
      schemaDir: schemaDir.pathname,
    });

    // Display configuration
    console.log("=== Configuration Example ===");
    console.log("Working Directory:", workingDir.pathname);
    console.log("App Prompt Base Directory:", promptDir.pathname);
    console.log("App Schema Base Directory:", schemaDir.pathname);
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
