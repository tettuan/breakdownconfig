import { join } from "@std/path";
import { parse as parseYaml } from "@std/yaml";
import { ErrorCode, ErrorManager } from "../error_manager.ts";
import type { UserConfig } from "../types/user_config.ts";

/**
 * Loads and validates the user configuration from a working directory.
 * The user configuration is optional and must be located at
 * `$base_dir/.agent/breakdown/config/user.yml`.
 *
 * @example
 * ```typescript
 * const loader = new UserConfigLoader();
 * const config = await loader.load();
 * ```
 */
export class UserConfigLoader {
  /**
   * Creates a new instance of UserConfigLoader.
   *
   * @param baseDir - Optional base directory for configuration files
   */
  constructor(private readonly baseDir: string = "") {}

  /**
   * Loads and validates the user configuration.
   * If the configuration file is not found, returns an empty configuration.
   *
   * @returns {Promise<UserConfig>} The loaded and validated user configuration
   * @throws {Error} If the configuration file exists but is invalid
   */
  async load(): Promise<UserConfig> {
    try {
      const configPath = this.baseDir
        ? join(this.baseDir, ".agent", "breakdown", "config", "user.yml")
        : join(".agent", "breakdown", "config", "user.yml");

      let text: string;
      try {
        text = await Deno.readTextFile(configPath);
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          // User config is optional, so we just return an empty config
          return {};
        }
        throw error;
      }

      let config: unknown;
      try {
        config = parseYaml(text);
      } catch (_e) {
        ErrorManager.throwError(
          ErrorCode.USER_CONFIG_INVALID,
          "Invalid user configuration - Invalid YAML format",
        );
      }

      if (!this.validateConfig(config)) {
        ErrorManager.throwError(
          ErrorCode.USER_CONFIG_INVALID,
          "Invalid user configuration - Invalid structure",
        );
      }

      return config as UserConfig;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      ErrorManager.throwError(
        ErrorCode.USER_CONFIG_INVALID,
        "Invalid user configuration - Failed to load configuration",
      );
    }
  }

  /**
   * Validates that the configuration object has the correct structure.
   *
   * @param config - The configuration object to validate
   * @returns {boolean} True if the configuration is valid
   */
  private validateConfig(config: unknown): config is UserConfig {
    if (!config || typeof config !== "object") {
      return false;
    }

    const configObj = config as Record<string, unknown>;
    return this.isValidPromptConfig(configObj.app_prompt) &&
      this.isValidSchemaConfig(configObj.app_schema);
  }

  /**
   * Type guard for prompt configuration
   *
   * @param config - The configuration object to check
   * @returns {boolean} True if the configuration is valid
   */
  private isValidPromptConfig(config: unknown): config is { base_dir: string } | undefined {
    if (config === undefined) return true;
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
  private isValidSchemaConfig(config: unknown): config is { base_dir: string } | undefined {
    if (config === undefined) return true;
    return typeof config === "object" &&
      config !== null &&
      "base_dir" in config &&
      typeof (config as { base_dir: unknown }).base_dir === "string";
  }
}
