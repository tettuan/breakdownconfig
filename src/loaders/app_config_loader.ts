import { parse as parseYaml } from "@std/yaml";
import { ErrorCode, ErrorManager } from "../error_manager.ts";
import { ConfigValidator } from "../validators/config_validator.ts";
import type { AppConfig } from "../types/app_config.ts";
import { getDefaultAppConfigPath } from "../utils/path_resolver.ts";

/**
 * Application Configuration Loader
 *
 * This module is responsible for loading and validating the application configuration.
 * It uses the URL API for path resolution to ensure consistent behavior across platforms.
 */

export class AppConfigLoader {
  private readonly configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath ?? getDefaultAppConfigPath();
  }

  async load(): Promise<AppConfig> {
    try {
      const content = await Deno.readTextFile(this.configPath);
      const config = parseYaml(content) as unknown;

      ConfigValidator.validateAppConfig(config);
      return config;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        ErrorManager.throwError(
          ErrorCode.APP_CONFIG_NOT_FOUND,
          `Config file not found at: ${this.configPath}`,
        );
      }
      throw error;
    }
  }
}
