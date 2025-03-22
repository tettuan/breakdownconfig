/**
 * Main implementation of the BreakdownConfig module
 * This module provides the core functionality for managing application and user configurations.
 */

import { join } from '@std/path';
import type { AppConfig, ConfigRecord, UserConfig } from './types.ts';
import { parse as parseYaml } from "@std/yaml";

export class BreakdownConfig {
  private workingDir: string = '';
  private appConfig: AppConfig | null = null;
  private userConfig: UserConfig | null = null;
  private baseDir: string;

  constructor(baseDir: string = '') {
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
        ? join(this.baseDir, 'breakdown', 'config', 'app.yaml')
        : join('breakdown', 'config', 'app.yaml');

      let text: string;
      try {
        text = await Deno.readTextFile(configPath);
      } catch (error) {
        if (
          error instanceof Error && 'code' in error && error.code === 'ENOENT'
        ) {
          throw new Error('Application config file not found');
        }
        throw error;
      }

      let config: ConfigRecord;
      try {
        config = parseYaml(text) as ConfigRecord;
      } catch (e) {
        throw new Error('Invalid YAML in application config file');
      }

      // Validate required fields
      if (!this.validateAppConfig(config)) {
        throw new Error('Missing required fields in application config');
      }

      // At this point we know the config has all required fields
      this.appConfig = {
        working_dir: config.working_dir!,
        app_prompt: {
          base_dir: config.app_prompt!.base_dir!,
        },
        app_schema: {
          base_dir: config.app_schema!.base_dir!,
        },
      };
      this.workingDir = this.appConfig.working_dir;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to load application config');
    }
  }

  /**
   * Loads the user configuration from $working_dir/config/user.yaml if it exists
   */
  private async loadUserConfig(): Promise<void> {
    if (!this.workingDir) {
      throw new Error('Working directory not set');
    }

    try {
      const configPath = this.baseDir
        ? join(this.baseDir, this.workingDir, 'config', 'user.yaml')
        : join(this.workingDir, 'config', 'user.yaml');

      let text: string;
      try {
        text = await Deno.readTextFile(configPath);
      } catch (error) {
        if (
          error instanceof Error && 'code' in error && error.code === 'ENOENT'
        ) {
          // User config is optional, so we just ignore if it's missing
          return;
        }
        throw error;
      }

      let config: ConfigRecord;
      try {
        config = parseYaml(text) as ConfigRecord;
      } catch (e) {
        throw new Error('Invalid YAML in user config file');
      }

      // Validate and transform user config
      const userConfig: UserConfig = {};

      if (this.isValidPromptConfig(config.app_prompt)) {
        userConfig.app_prompt = { base_dir: config.app_prompt.base_dir };
      }

      if (this.isValidSchemaConfig(config.app_schema)) {
        userConfig.app_schema = { base_dir: config.app_schema.base_dir };
      }

      this.userConfig = userConfig;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to load user config');
    }
  }

  /**
   * Type guard for PromptConfig
   */
  private isValidPromptConfig(config: unknown): config is { base_dir: string } {
    return typeof config === 'object' &&
      config !== null &&
      'base_dir' in config &&
      typeof (config as { base_dir: unknown }).base_dir === 'string';
  }

  /**
   * Type guard for SchemaConfig
   */
  private isValidSchemaConfig(config: unknown): config is { base_dir: string } {
    return typeof config === 'object' &&
      config !== null &&
      'base_dir' in config &&
      typeof (config as { base_dir: unknown }).base_dir === 'string';
  }

  /**
   * Validates that all required fields are present in the application config
   */
  private validateAppConfig(config: ConfigRecord): boolean {
    return typeof config.working_dir === 'string' &&
      this.isValidPromptConfig(config.app_prompt) &&
      this.isValidSchemaConfig(config.app_schema);
  }

  /**
   * Validates the structure of the user config
   */
  private validateUserConfig(config: ConfigRecord): boolean {
    if (
      config.app_prompt !== undefined &&
      !this.isValidPromptConfig(config.app_prompt)
    ) {
      return false;
    }
    if (
      config.app_schema !== undefined &&
      !this.isValidSchemaConfig(config.app_schema)
    ) {
      return false;
    }
    return true;
  }

  /**
   * Returns the merged configuration
   * @throws Error if configurations haven't been loaded
   */
  getConfig(): AppConfig {
    if (!this.appConfig) {
      throw new Error('Configuration not loaded');
    }

    const result: AppConfig = {
      working_dir: this.appConfig.working_dir,
      app_prompt: { ...this.appConfig.app_prompt },
      app_schema: { ...this.appConfig.app_schema },
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
}
