import type { AppConfig } from "./app_config.ts";

/**
 * Merged configuration that combines application and user settings
 * Extends AppConfig to include all base configuration while allowing
 * for user overrides and additional custom fields
 * @interface
 */
export interface MergedConfig extends AppConfig {
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
  /** Additional custom configuration fields
   * Allows for flexible extension of the configuration
   */
  [key: string]: string | number | boolean | null | undefined | { [key: string]: unknown };
}
