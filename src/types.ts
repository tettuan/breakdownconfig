/**
 * Type definitions for the BreakdownConfig module
 * This module contains all the interface and type definitions used in the configuration system.
 */

/**
 * Configuration for prompt-related settings
 * @interface
 */
export interface PromptConfig {
  /** Base directory for prompt files */
  base_dir: string;
}

/**
 * Configuration for schema-related settings
 * @interface
 */
export interface SchemaConfig {
  /** Base directory for schema files */
  base_dir: string;
}

/**
 * Application-level configuration settings
 * Contains required configuration for the application to function
 * @interface
 */
export interface AppConfig {
  /** Working directory for the application */
  working_dir: string;
  /** Prompt configuration settings */
  app_prompt: PromptConfig;
  /** Schema configuration settings */
  app_schema: SchemaConfig;
}

/**
 * User-level configuration settings
 * Contains optional overrides for application configuration
 * @interface
 */
export interface UserConfig {
  /** Optional prompt configuration overrides */
  app_prompt?: PromptConfig;
  /** Optional schema configuration overrides */
  app_schema?: SchemaConfig;
}

/**
 * Record type for configuration data
 * Allows for flexible key-value pairs while maintaining type safety for known fields
 * @type {Object}
 */
export type ConfigRecord = {
  /** Working directory for the application */
  working_dir?: string;
  /** Prompt configuration with base directory */
  app_prompt?: { base_dir?: string };
  /** Schema configuration with base directory */
  app_schema?: { base_dir?: string };
  /** Additional configuration fields */
  [key: string]: unknown;
};
