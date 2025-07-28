import { join } from "@std/path";
import { parse as parseYaml } from "@std/yaml";
import {
  ErrorCode as _ErrorCodeLoader,
  ErrorManager as _ErrorManagerLoader,
} from "../error_manager.ts";
import type { LegacyUserConfig, UserConfig } from "../types/user_config.ts";
import { UserConfigFactory } from "../types/user_config.ts";
import { DefaultPaths } from "../types/app_config.ts";
import {
  ConfigResult,
  FileNotFoundError as _FileNotFoundErrorLoader,
  ParseError,
  Result,
  UnknownError,
  ValidationError as _ValidationErrorLoader,
} from "../types/config_result.ts";

/**
 * Loads and validates optional user configuration files for personalization and overrides
 *
 * UserConfigLoader handles the loading of user-specific configuration files that can
 * override application defaults. Unlike AppConfigLoader, user configurations are entirely
 * optional and the system gracefully handles missing files by returning empty configurations.
 *
 * ## File Location Strategy
 * The loader searches for configuration files in this priority order:
 * 1. With profilePrefix: `{baseDir}/.agent/clipmt/config/{profilePrefix}-user.yml`
 * 2. Default: `{baseDir}/.agent/clipmt/config/user.yml`
 *
 * ## Error Handling
 * - Missing files: Returns empty UserConfig (graceful degradation)
 * - Invalid YAML: Throws error with ErrorCode.USER_CONFIG_INVALID
 * - Invalid structure: Throws error with validation details
 *
 * @example Basic usage without environment-specific configs
 * ```typescript
 * const loader = new UserConfigLoader(undefined, "/path/to/project");
 * const userConfig = await loader.load();
 *
 * // userConfig will be {} if no user.yml exists
 * // or contain user overrides if file exists
 * // userConfig.working_dir || "Using app default"
 * ```
 *
 * @example Environment-specific user configurations
 * ```typescript
 * // Development environment user config
 * const devLoader = new UserConfigLoader("development", "/project");
 * const devConfig = await devLoader.load();
 *
 * // Production environment user config
 * const prodLoader = new UserConfigLoader("production", "/project");
 * const prodConfig = await prodLoader.load();
 *
 * // Each can have different user overrides
 * ```
 *
 * @example Error handling for invalid user configs
 * ```typescript
 * try {
 *   const loader = new UserConfigLoader(undefined, "/project");
 *   const config = await loader.load();
 *   // User config loaded: config
 * } catch (error) {
 *   if (error instanceof Error && error.message.includes("ERR1004")) {
 *     // User config exists but is invalid - error already type-checked
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
   * @param profilePrefix - Profile-specific configuration identifier.
   *                        Must match pattern /^[a-zA-Z0-9-]+$/ if provided.
   *                        Examples: "development", "production", "staging", "local"
   * @param baseDir - Base directory to search for configuration files. If empty string,
   *                  searches relative to current working directory. Should be absolute
   *                  path for predictable behavior.
   *
   * @example Standard project setup
   * ```typescript
   * // Search in current directory structure
   * const loader = new UserConfigLoader();
   *
   * // Search in specific project directory
   * const loader = new UserConfigLoader(undefined, "/home/user/myproject");
   * ```
   *
   * @example Multi-environment deployment
   * ```typescript
   * // Different user configs per environment
   * const devLoader = new UserConfigLoader("development", "/app");
   * const prodLoader = new UserConfigLoader("production", "/app");
   *
   * // This allows users to have different overrides per environment
   * ```
   */
  constructor(
    private readonly profilePrefix?: string,
    private readonly baseDir: string = "",
  ) {}

  /**
   * Loads and validates user configuration with graceful error handling
   *
   * This method implements a forgiving loading strategy where missing files are treated
   * as acceptable (returning null) while invalid existing files trigger errors.
   * This design allows user configurations to be completely optional while ensuring
   * that existing configs are valid.
   *
   * ## Loading Process
   * 1. Determine config file path based on profilePrefix
   * 2. Attempt to read file from filesystem
   * 3. If file missing: return null (graceful degradation)
   * 4. If file exists: parse YAML and validate structure
   * 5. Return validated UserConfig object
   *
   * ## File Path Resolution
   * - With profilePrefix: `{baseDir}/.agent/clipmt/config/{profilePrefix}-user.yml`
   * - Without profilePrefix: `{baseDir}/.agent/clipmt/config/user.yml`
   *
   * @returns {Promise<ConfigResult<UserConfig | null>>} Result containing:
   *          - null if file doesn't exist (this is a success case)
   *          - UserConfig object if file exists and is valid
   *          - Error in Result if file exists but is invalid
   *
   * @example Handling optional user config
   * ```typescript
   * const loader = new UserConfigLoader("development", "/project");
   * const result = await loader.load();
   *
   * if (Result.isOk(result)) {
   *   const userConfig = result.data;
   *   if (userConfig === null) {
   *     // No user config, using defaults
   *   } else {
   *     // User has custom settings: userConfig
   *   }
   * } else {
   *   // Config error: result.error
   * }
   * ```
   *
   * @example Validating user overrides
   * ```typescript
   * const result = await loader.load();
   *
   * if (Result.isOk(result) && result.data !== null) {
   *   const userConfig = result.data;
   *   // User can override working directory
   *   if (userConfig.working_dir) {
   *     // User working dir: userConfig.working_dir
   *   }
   *
   *   // User can override prompt settings
   *   if (userConfig.app_prompt?.base_dir) {
   *     // User prompt dir: userConfig.app_prompt.base_dir
   *   }
   * }
   * ```
   */
  async load(): Promise<ConfigResult<UserConfig | null>> {
    const fileName = this.profilePrefix ? `${this.profilePrefix}-user.yml` : "user.yml";

    const configPath = this.baseDir
      ? join(this.baseDir, DefaultPaths.WORKING_DIR, "config", fileName)
      : join(DefaultPaths.WORKING_DIR, "config", fileName);

    let text: string;
    try {
      text = await Deno.readTextFile(configPath);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        // User config is optional, so we return null (not an error)
        return Result.ok(null);
      }
      // Other file system errors
      return Result.err<UnknownError>({
        kind: "unknownError",
        message: `Failed to read user config file: ${configPath}`,
        originalError: error,
      });
    }

    let config: unknown;
    try {
      config = parseYaml(text);
    } catch (_) {
      // YAML parse error - this is a real error since the file exists
      return Result.err<ParseError>({
        kind: "parseError",
        path: configPath,
        line: 0, // YAML parser doesn't provide line numbers
        column: 0,
        message: "Invalid YAML format in user configuration file",
      });
    }

    if (!this.validateConfig(config)) {
      // Validation error - the file exists but has invalid structure
      return Result.err({
        kind: "configValidationError",
        errors: [{
          kind: "validationError",
          field: "root",
          value: config,
          expectedType: "UserConfig",
          message: "Invalid user configuration structure",
        }],
        path: "user_config",
      });
    }

    // Convert legacy format to new discriminated union format
    const legacyConfig = config as LegacyUserConfig;
    const newUserConfig = UserConfigFactory.fromLegacy(legacyConfig);
    return Result.ok(newUserConfig);
  }

  /**
   * Validates that the configuration object has the correct structure.
   *
   * @param config - The configuration object to validate
   * @returns {boolean} True if the configuration is valid
   */
  private validateConfig(config: unknown): config is LegacyUserConfig {
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
