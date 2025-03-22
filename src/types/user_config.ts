/**
 * User-level configuration settings
 * Contains optional overrides for application configuration
 * Allows for additional custom fields beyond the standard configuration
 * @interface
 */
export interface UserConfig {
  /** Optional prompt configuration overrides */
  app_prompt?: {
    /** Base directory for prompt files */
    base_dir: string;
  };
  /** Optional schema configuration overrides */
  app_schema?: {
    /** Base directory for schema files */
    base_dir: string;
  };
  /** Additional custom configuration fields
   * Allows for flexible extension of the configuration
   */
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | { [key: string]: unknown }
    | undefined;
}
