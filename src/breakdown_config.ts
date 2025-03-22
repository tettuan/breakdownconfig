import { join } from "@std/path";
import { parse as parseYaml } from "@std/yaml";
import { ErrorCode, ErrorManager } from "./error_manager.ts";
import type { AppConfig } from "./types/app_config.ts";
import type { UserConfig } from "./types/user_config.ts";
import type { MergedConfig } from "./types/merged_config.ts";

export class BreakdownConfig {
  private workingDir: string = "";
  private appConfig: AppConfig | null = null;
  private userConfig: UserConfig | null = null;
  private baseDir: string;

  constructor(baseDir: string = "") {
    this.baseDir = baseDir;
  }

  /**
   * Loads both application and user configurations
   */
  async loadConfig(): Promise<void> {
    await this.loadAppConfig();
    await this.loadUserConfig();
  }

  /**
   * Loads the application configuration from breakdown/config/app.yaml
   * @throws Error if the config file is missing or invalid
   */
  private async loadAppConfig(): Promise<void> {
    try {
      const configPath = this.baseDir
        ? join(this.baseDir, "breakdown", "config", "app.yaml")
        : join("breakdown", "config", "app.yaml");

      let text: string;
      try {
        text = await Deno.readTextFile(configPath);
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          ErrorManager.throwError(ErrorCode.APP_CONFIG_NOT_FOUND, `Config file not found at: ${configPath}`);
        }
        throw error;
      }

      let config: unknown;
      try {
        config = parseYaml(text);
      } catch (e) {
        ErrorManager.throwError(ErrorCode.APP_CONFIG_INVALID, "Invalid YAML in application config file");
      }

      if (!this.validateAppConfig(config)) {
        ErrorManager.throwError(ErrorCode.APP_CONFIG_INVALID, "Missing required fields in application config");
      }

      // At this point we know the config has all required fields
      const validConfig = config as AppConfig;
      this.appConfig = {
        working_dir: validConfig.working_dir,
        app_prompt: {
          base_dir: validConfig.app_prompt.base_dir,
        },
        app_schema: {
          base_dir: validConfig.app_schema.base_dir,
        },
      };
      this.workingDir = this.appConfig.working_dir;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to load application config");
    }
  }

  /**
   * Loads the user configuration from $working_dir/config/user.yaml if it exists
   */
  private async loadUserConfig(): Promise<void> {
    if (!this.workingDir) {
      throw new Error("Working directory not set");
    }

    try {
      const configPath = this.baseDir
        ? join(this.baseDir, this.workingDir, "config", "user.yaml")
        : join(this.workingDir, "config", "user.yaml");

      let text: string;
      try {
        text = await Deno.readTextFile(configPath);
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          // User config is optional, so we just ignore if it's missing
          return;
        }
        throw error;
      }

      let config: unknown;
      try {
        config = parseYaml(text);
      } catch (e) {
        ErrorManager.throwError(ErrorCode.USER_CONFIG_INVALID, "Invalid YAML in user config file");
      }

      // Validate and transform user config
      const userConfig: UserConfig = {};

      if (config && typeof config === "object") {
        const configObj = config as Record<string, unknown>;
        if (this.isValidPromptConfig(configObj.app_prompt)) {
          userConfig.app_prompt = { base_dir: configObj.app_prompt.base_dir };
        }

        if (this.isValidSchemaConfig(configObj.app_schema)) {
          userConfig.app_schema = { base_dir: configObj.app_schema.base_dir };
        }
      }

      this.userConfig = userConfig;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to load user config");
    }
  }

  /**
   * Type guard for PromptConfig
   */
  private isValidPromptConfig(config: unknown): config is { base_dir: string } {
    return typeof config === "object" &&
      config !== null &&
      "base_dir" in config &&
      typeof (config as { base_dir: unknown }).base_dir === "string";
  }

  /**
   * Type guard for SchemaConfig
   */
  private isValidSchemaConfig(config: unknown): config is { base_dir: string } {
    return typeof config === "object" &&
      config !== null &&
      "base_dir" in config &&
      typeof (config as { base_dir: unknown }).base_dir === "string";
  }

  /**
   * Validates that all required fields are present in the application config
   */
  private validateAppConfig(config: unknown): config is AppConfig {
    if (!config || typeof config !== "object") {
      return false;
    }

    const { working_dir, app_prompt, app_schema } = config as Partial<AppConfig>;

    return typeof working_dir === "string" &&
      this.isValidPromptConfig(app_prompt) &&
      this.isValidSchemaConfig(app_schema);
  }

  /**
   * Returns the merged configuration
   * @throws Error if configurations haven't been loaded
   */
  async getConfig(): Promise<MergedConfig> {
    if (!this.appConfig) {
      await this.loadConfig();
    }

    const result: MergedConfig = {
      working_dir: this.appConfig!.working_dir,
      app_prompt: { ...this.appConfig!.app_prompt },
      app_schema: { ...this.appConfig!.app_schema },
    };

    // Merge user config if it exists
    if (this.userConfig) {
      if (this.userConfig.app_prompt) {
        result.app_prompt = {
          ...result.app_prompt,
          ...this.userConfig.app_prompt,
        };
      }
      if (this.userConfig.app_schema) {
        result.app_schema = {
          ...result.app_schema,
          ...this.userConfig.app_schema,
        };
      }
    }

    return result;
  }

  static getDefaultConfig(): AppConfig {
    return {
      working_dir: "./.agent/breakdown",
      app_prompt: {
        base_dir: "/breakdown/prompts/app",
      },
      app_schema: {
        base_dir: "/breakdown/schema/app",
      },
    };
  }
} 