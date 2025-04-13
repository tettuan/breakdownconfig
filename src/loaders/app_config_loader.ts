import { join } from "@std/path";
import { parse as parseYaml } from "@std/yaml";
import { ErrorCode, ErrorManager } from "../error_manager.ts";
import type { AppConfig } from "../types/app_config.ts";

/**
 * Loads and validates the application configuration from a fixed location.
 * The application configuration is required and must be located at
 * `breakdown/config/app.yml` relative to the base directory.
 *
 * @example
 * ```typescript
 * const loader = new AppConfigLoader();
 * const config = await loader.load();
 * ```
 */
export class AppConfigLoader {
  /**
   * Creates a new instance of AppConfigLoader.
   *
   * @param baseDir - Optional base directory for configuration files
   */
  constructor(private readonly baseDir: string = "") {}

  /**
   * Loads and validates the application configuration.
   *
   * @returns {Promise<AppConfig>} The loaded and validated application configuration
   * @throws {Error} If the configuration file is missing or invalid
   */
  async load(): Promise<AppConfig> {
    try {
      const configPath = this.baseDir
        ? join(this.baseDir, "breakdown", "config", "app.yml")
        : join("breakdown", "config", "app.yml");

      let text: string;
      try {
        text = await Deno.readTextFile(configPath);
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          ErrorManager.throwError(
            ErrorCode.APP_CONFIG_NOT_FOUND,
            `Application configuration file not found at: ${configPath}`,
          );
        }
        throw error;
      }

      let config: unknown;
      try {
        config = parseYaml(text);
      } catch (_error) {
        ErrorManager.throwError(
          ErrorCode.APP_CONFIG_INVALID,
          "Invalid application configuration",
        );
      }

      if (!this.validateConfig(config)) {
        ErrorManager.throwError(
          ErrorCode.APP_CONFIG_INVALID,
          "Invalid application configuration",
        );
      }

      return config as AppConfig;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      ErrorManager.throwError(
        ErrorCode.APP_CONFIG_INVALID,
        "Invalid application configuration - Failed to load configuration",
      );
    }
  }

  /**
   * Validates that the configuration object has all required fields
   * and that they are of the correct type.
   *
   * @param config - The configuration object to validate
   * @returns {boolean} True if the configuration is valid
   */
  private validateConfig(config: unknown): config is AppConfig {
    if (!config || typeof config !== "object") {
      return false;
    }

    const { working_dir, app_prompt, app_schema } = config as Partial<AppConfig>;

    return typeof working_dir === "string" &&
      this.isValidPromptConfig(app_prompt) &&
      this.isValidSchemaConfig(app_schema);
  }

  /**
   * Type guard for prompt configuration
   *
   * @param config - The configuration object to check
   * @returns {boolean} True if the configuration is valid
   */
  private isValidPromptConfig(config: unknown): config is { base_dir: string } {
    return typeof config === "object" &&
      config !== null &&
      "base_dir" in config &&
      typeof (config as { base_dir: unknown }).base_dir === "string";
  }

  /**
   * Type guard for schema configuration
   *
   * @param config - The configuration object to check
   * @returns {boolean} True if the configuration is valid
   */
  private isValidSchemaConfig(config: unknown): config is { base_dir: string } {
    return typeof config === "object" &&
      config !== null &&
      "base_dir" in config &&
      typeof (config as { base_dir: unknown }).base_dir === "string";
  }
}
