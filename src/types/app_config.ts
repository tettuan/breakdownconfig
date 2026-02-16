/**
 * Default paths for application configuration
 */
export enum DefaultPaths {
  /** Default working directory */
  WORKING_DIR = ".agent/climpt",
  /** Default prompt base directory */
  PROMPT_BASE_DIR = "climpt/prompts/app",
  /** Default schema base directory */
  SCHEMA_BASE_DIR = "climpt/schema/app",
}

/**
 * Application-level configuration settings
 * Contains required configuration for the application to function
 * @interface
 */
export interface AppConfig {
  /** Working directory for the application */
  "working_dir": string;
  /** Prompt configuration settings */
  "app_prompt": {
    /** Base directory for prompt files */
    "base_dir": string;
  };
  /** Schema configuration settings */
  "app_schema": {
    /** Base directory for schema files */
    "base_dir": string;
  };
}
