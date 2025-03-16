// @deno-types="https://deno.land/x/types/index.d.ts"

interface PromptConfig {
  base_dir: string;
}

interface SchemaConfig {
  base_dir: string;
}

interface AppConfig {
  working_dir: string;
  app_prompt: PromptConfig;
  app_schema: SchemaConfig;
}

interface UserConfig {
  app_prompt?: PromptConfig;
  app_schema?: SchemaConfig;
}

type ConfigRecord = {
  working_dir?: string;
  app_prompt?: { base_dir?: string };
  app_schema?: { base_dir?: string };
  [key: string]: unknown;
};

export class BreakdownConfig {
  private workingDir: string = "";
  private appConfig: AppConfig | null = null;
  private userConfig: UserConfig | null = null;

  constructor() {}

  /**
   * Loads both application and user configurations
   */
  async loadConfig(): Promise<void> {
    await this.loadAppConfig();
    await this.loadUserConfig();
  }

  /**
   * Loads the application configuration from /breakdown/config/app.json
   * @throws Error if the config file is missing or invalid
   */
  private async loadAppConfig(): Promise<void> {
    try {
      const decoder = new TextDecoder();
      const data = await Deno.readFile("/breakdown/config/app.json");
      const config = JSON.parse(decoder.decode(data)) as ConfigRecord;

      // Validate required fields
      if (!this.validateAppConfig(config)) {
        throw new Error("Missing required fields in application config");
      }

      // At this point we know the config has all required fields
      this.appConfig = {
        working_dir: config.working_dir!,
        app_prompt: {
          base_dir: config.app_prompt!.base_dir!
        },
        app_schema: {
          base_dir: config.app_schema!.base_dir!
        }
      };
      this.workingDir = this.appConfig.working_dir;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error("Application config file not found");
      }
      throw error;
    }
  }

  /**
   * Loads the user configuration from $working_dir/config/user.json if it exists
   */
  private async loadUserConfig(): Promise<void> {
    try {
      const decoder = new TextDecoder();
      const data = await Deno.readFile(`${this.workingDir}/config/user.json`);
      const config = JSON.parse(decoder.decode(data)) as ConfigRecord;

      // Validate and transform user config
      const userConfig: UserConfig = {};
      
      if (config.app_prompt?.base_dir && typeof config.app_prompt.base_dir === "string") {
        userConfig.app_prompt = { base_dir: config.app_prompt.base_dir };
      }
      
      if (config.app_schema?.base_dir && typeof config.app_schema.base_dir === "string") {
        userConfig.app_schema = { base_dir: config.app_schema.base_dir };
      }

      this.userConfig = userConfig;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // User config is optional, so we just ignore if it's missing
        return;
      }
      throw error;
    }
  }

  /**
   * Validates that all required fields are present in the application config
   */
  private validateAppConfig(config: ConfigRecord): boolean {
    return !!(
      config.working_dir &&
      typeof config.working_dir === "string" &&
      config.app_prompt?.base_dir &&
      typeof config.app_prompt.base_dir === "string" &&
      config.app_schema?.base_dir &&
      typeof config.app_schema.base_dir === "string"
    );
  }

  /**
   * Validates the structure of the user config
   */
  private validateUserConfig(config: ConfigRecord): boolean {
    const hasValidPrompt = !config.app_prompt || 
      (config.app_prompt.base_dir && typeof config.app_prompt.base_dir === "string");
    
    const hasValidSchema = !config.app_schema || 
      (config.app_schema.base_dir && typeof config.app_schema.base_dir === "string");
    
    return hasValidPrompt && hasValidSchema;
  }

  /**
   * Returns the merged configuration
   * @throws Error if configurations haven't been loaded
   */
  getConfig(): AppConfig {
    if (!this.appConfig) {
      throw new Error("Configuration not loaded");
    }

    const result: AppConfig = {
      working_dir: this.appConfig.working_dir,
      app_prompt: { ...this.appConfig.app_prompt },
      app_schema: { ...this.appConfig.app_schema }
    };

    // Merge user config if it exists
    if (this.userConfig) {
      if (this.userConfig.app_prompt) {
        result.app_prompt = { ...result.app_prompt, ...this.userConfig.app_prompt };
      }
      if (this.userConfig.app_schema) {
        result.app_schema = { ...result.app_schema, ...this.userConfig.app_schema };
      }
    }

    return result;
  }
} 