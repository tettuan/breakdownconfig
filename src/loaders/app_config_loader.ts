import { parse as parseYaml } from "@std/yaml";
import { ErrorCode, ErrorManager } from "../error_manager.ts";
import { ConfigValidator } from "../validators/config_validator.ts";
import type { AppConfig } from "../types/app_config.ts";

export class AppConfigLoader {
  private readonly configPath: string;

  constructor(configPath: string = "breakdown/config/app.yaml") {
    this.configPath = configPath;
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
