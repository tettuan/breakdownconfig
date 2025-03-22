/**
 * Application-level configuration settings
 * Contains required configuration for the application to function
 * @interface
 */
export interface AppConfig {
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
