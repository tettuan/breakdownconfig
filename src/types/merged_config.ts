import type { AppConfig } from "./app_config.ts";

/**
 * Merged configuration that combines application and user settings.
 *
 * This interface extends AppConfig to include all base configuration properties
 * while allowing for user overrides and additional custom fields. It represents
 * the final, resolved configuration after merging application defaults with
 * user-specific settings.
 *
 * @interface MergedConfig
 * @extends {AppConfig}
 *
 * @example
 * ```typescript
 * const config: MergedConfig = {
 *   // Inherited from AppConfig
 *   app_name: "MyApp",
 *   app_version: "1.0.0",
 *
 *   // MergedConfig specific fields
 *   working_dir: "/home/user/projects/myapp",
 *   app_prompt: {
 *     base_dir: "/home/user/projects/myapp/prompts"
 *   },
 *   app_schema: {
 *     base_dir: "/home/user/projects/myapp/schemas"
 *   },
 *
 *   // Custom fields
 *   debugMode: true,
 *   maxRetries: 3,
 *   apiConfig: {
 *     endpoint: "https://api.example.com",
 *     timeout: 5000
 *   }
 * };
 * ```
 */
export interface MergedConfig extends AppConfig {
  /**
   * The working directory for the application.
   *
   * This directory serves as the base path for all relative file operations
   * and resource resolution. It should be an absolute path to ensure
   * consistent behavior across different execution contexts.
   *
   * @type {string}
   * @required
   *
   * @example
   * ```typescript
   * working_dir: "/home/user/projects/myapp"
   * // or on Windows
   * working_dir: "C:\\Users\\user\\projects\\myapp"
   * ```
   */
  working_dir: string;

  /**
   * Configuration settings for prompt-related functionality.
   *
   * This object contains settings that control how the application
   * handles prompt files, templates, and related resources.
   *
   * @type {Object}
   * @required
   */
  app_prompt: {
    /**
     * Base directory for prompt files.
     *
     * All prompt-related files will be resolved relative to this directory.
     * This allows for organized storage of prompt templates, fragments,
     * and other prompt-related resources.
     *
     * @type {string}
     * @required
     *
     * @example
     * ```typescript
     * app_prompt: {
     *   base_dir: "/home/user/projects/myapp/prompts"
     * }
     * ```
     */
    base_dir: string;
  };

  /**
   * Configuration settings for schema-related functionality.
   *
   * This object contains settings that control how the application
   * handles schema files, validation rules, and related resources.
   *
   * @type {Object}
   * @required
   */
  app_schema: {
    /**
     * Base directory for schema files.
     *
     * All schema-related files will be resolved relative to this directory.
     * This includes JSON schemas, validation rules, type definitions,
     * and other schema-related resources.
     *
     * @type {string}
     * @required
     *
     * @example
     * ```typescript
     * app_schema: {
     *   base_dir: "/home/user/projects/myapp/schemas"
     * }
     * ```
     */
    base_dir: string;
  };

  /**
   * Index signature for additional custom configuration fields.
   *
   * This allows the MergedConfig to be extended with arbitrary additional
   * properties at runtime, providing flexibility for application-specific
   * configurations without modifying the type definition.
   *
   * Supported value types:
   * - string: For text-based configuration values
   * - number: For numeric configuration values
   * - boolean: For boolean flags and switches
   * - null/undefined: For optional or unset values
   * - nested objects: For complex configuration structures
   *
   * @type {string | number | boolean | null | undefined | { [key: string]: unknown }}
   *
   * @example
   * ```typescript
   * // Adding custom fields to MergedConfig
   * const config: MergedConfig = {
   *   // ... required fields ...
   *
   *   // Custom string field
   *   environment: "production",
   *
   *   // Custom number field
   *   maxConnections: 100,
   *
   *   // Custom boolean field
   *   enableDebugMode: false,
   *
   *   // Custom nested object
   *   database: {
   *     host: "localhost",
   *     port: 5432,
   *     credentials: {
   *       username: "admin",
   *       passwordFile: "/etc/secrets/db-pass"
   *     }
   *   },
   *
   *   // Custom array (through object wrapper)
   *   allowedOrigins: {
   *     list: ["https://example.com", "https://app.example.com"]
   *   }
   * };
   * ```
   */
  [key: string]: string | number | boolean | null | undefined | { [key: string]: unknown };
}
