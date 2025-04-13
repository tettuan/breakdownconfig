/**
 * Type definitions for the BreakdownConfig module
 * This module contains all the interface and type definitions used in the configuration system.
 */

/**
 * Application-level configuration settings
 * Contains required configuration for the application to function
 * @interface
 */
interface AppConfig {
  /** Working directory for the application */
  working_dir: string;
  /** Prompt configuration settings */
  app_prompt: {
    /** Base directory for prompt files */
    base_dir: string;
  };
  /** Schema configuration settings */
  app_schema: {
    /** Base directory for schema files */
    base_dir: string;
  };
}

/**
 * User-level configuration settings
 * Contains optional overrides for application configuration
 * @interface
 */
interface UserConfig {
  /** Optional prompt configuration overrides */
  app_prompt?: {
    /** Base directory for prompt files */
    base_dir?: string;
  };
  /** Optional schema configuration overrides */
  app_schema?: {
    /** Base directory for schema files */
    base_dir?: string;
  };
}

/**
 * Merged configuration settings
 * Contains the final configuration after merging AppConfig and UserConfig
 * @interface
 */
interface MergedConfig {
  /** Working directory for the application */
  working_dir: string;
  /** Prompt configuration settings */
  app_prompt: {
    /** Base directory for prompt files */
    base_dir: string;
  };
  /** Schema configuration settings */
  app_schema: {
    /** Base directory for schema files */
    base_dir: string;
  };
}

export type { AppConfig, MergedConfig, UserConfig };
