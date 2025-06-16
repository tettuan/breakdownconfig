import { join } from "@std/path";
import { parse as parseYaml } from "@std/yaml";
import { ErrorCode, ErrorManager } from "../error_manager.ts";
import type { UserConfig } from "../types/user_config.ts";
import { DefaultPaths } from "../types/app_config.ts";

/**
 * Loads and validates optional user configuration files for personalization and overrides
 *
 * UserConfigLoader handles the loading of user-specific configuration files that can
 * override application defaults. Unlike AppConfigLoader, user configurations are entirely
 * optional and the system gracefully handles missing files by returning empty configurations.
 *
 * ## File Location Strategy
 * The loader searches for configuration files in this priority order:
 * 1. With configSetName: `{baseDir}/.agent/breakdown/config/{configSetName}-user.yml`
 * 2. Default: `{baseDir}/.agent/breakdown/config/user.yml`
 *
 * ## Error Handling
 * - Missing files: Returns empty UserConfig (graceful degradation)
 * - Invalid YAML: Throws error with ErrorCode.USER_CONFIG_INVALID
 * - Invalid structure: Throws error with validation details
 *
 * @example Basic usage without environment-specific configs
 * ```typescript
 * const loader = new UserConfigLoader("/path/to/project");
 * const userConfig = await loader.load();
 *
 * // userConfig will be {} if no user.yml exists
 * // or contain user overrides if file exists
 * console.log(userConfig.working_dir || "Using app default");
 * ```
 *
 * @example Environment-specific user configurations
 * ```typescript
 * // Development environment user config
 * const devLoader = new UserConfigLoader("/project", "development");
 * const devConfig = await devLoader.load();
 *
 * // Production environment user config
 * const prodLoader = new UserConfigLoader("/project", "production");
 * const prodConfig = await prodLoader.load();
 *
 * // Each can have different user overrides
 * ```
 *
 * @example Error handling for invalid user configs
 * ```typescript
 * try {
 *   const loader = new UserConfigLoader("/project");
 *   const config = await loader.load();
 *   console.log("User config loaded:", config);
 * } catch (error) {
 *   if (error.message.includes("ERR1004")) {
 *     console.error("User config exists but is invalid:", error.message);
 *     // Could fall back to defaults or prompt user to fix
 *   }
 * }
 * ```
 */
export class UserConfigLoader {
  /**
   * Creates a new UserConfigLoader instance for loading optional user configurations
   *
   * The loader is designed to handle user-specific overrides that can customize
   * application behavior on a per-user or per-environment basis.
   *
   * @param baseDir - Base directory to search for configuration files. If empty string,
   *                  searches relative to current working directory. Should be absolute
   *                  path for predictable behavior.
   * @param configSetName - Environment or deployment-specific configuration identifier.
   *                        Must match pattern /^[a-zA-Z0-9-]+$/ if provided.
   *                        Examples: "development", "production", "staging", "local"
   *
   * @example Standard project setup
   * ```typescript
   * // Search in current directory structure
   * const loader = new UserConfigLoader();
   *
   * // Search in specific project directory
   * const loader = new UserConfigLoader("/home/user/myproject");
   * ```
   *
   * @example Multi-environment deployment
   * ```typescript
   * // Different user configs per environment
   * const devLoader = new UserConfigLoader("/app", "development");
   * const prodLoader = new UserConfigLoader("/app", "production");
   *
   * // This allows users to have different overrides per environment
   * ```
   */
  constructor(
    private readonly baseDir: string = "",
    private readonly configSetName?: string,
  ) {}

  /**
   * Loads and validates user configuration with graceful error handling
   *
   * This method implements a forgiving loading strategy where missing files are treated
   * as acceptable (returning empty config) while invalid existing files trigger errors.
   * This design allows user configurations to be completely optional while ensuring
   * that existing configs are valid.
   *
   * ## Loading Process
   * 1. Determine config file path based on configSetName
   * 2. Attempt to read file from filesystem
   * 3. If file missing: return {} (graceful degradation)
   * 4. If file exists: parse YAML and validate structure
   * 5. Return validated UserConfig object
   *
   * ## File Path Resolution
   * - With configSetName: `{baseDir}/.agent/breakdown/config/{configSetName}-user.yml`
   * - Without configSetName: `{baseDir}/.agent/breakdown/config/user.yml`
   *
   * @returns {Promise<UserConfig>} Validated user configuration object.
   *          Returns empty object {} if file doesn't exist.
   *          Returns populated object with user overrides if file exists and is valid.
   *
   * @throws {Error} With ErrorCode.USER_CONFIG_INVALID if file exists but contains
   *                invalid YAML syntax or doesn't match expected UserConfig structure
   *
   * @example Handling optional user config
   * ```typescript
   * const loader = new UserConfigLoader("/project", "development");
   * const userConfig = await loader.load();
   *
   * // Check if user provided overrides
   * if (Object.keys(userConfig).length > 0) {
   *   console.log("User has custom settings:", userConfig);
   * } else {
   *   console.log("Using application defaults");
   * }
   * ```
   *
   * @example Validating user overrides
   * ```typescript
   * const userConfig = await loader.load();
   *
   * // User can override working directory
   * if (userConfig.working_dir) {
   *   console.log("User working dir:", userConfig.working_dir);
   * }
   *
   * // User can override prompt settings
   * if (userConfig.app_prompt?.base_dir) {
   *   console.log("User prompt dir:", userConfig.app_prompt.base_dir);
   * }
   * ```
   */
  async load(): Promise<UserConfig> {
    try {
      const fileName = this.configSetName ? `${this.configSetName}-user.yml` : "user.yml";

      const configPath = this.baseDir
        ? join(this.baseDir, DefaultPaths.WORKING_DIR, "config", fileName)
        : join(DefaultPaths.WORKING_DIR, "config", fileName);

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
