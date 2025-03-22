import { parse as parseYaml } from "@std/yaml";
import { ErrorCode, ErrorManager } from "../error_manager.ts";
import { ConfigValidator } from "../validators/config_validator.ts";
import type { UserConfig } from "../types/user_config.ts";

export class UserConfigLoader {
  private readonly workingDir: string;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
  }

  async load(): Promise<UserConfig | null> {
    const configPath = `${this.workingDir}/config/user.yaml`;

    try {
      const content = await Deno.readTextFile(configPath);
      const config = parseYaml(content) as unknown;
      
      ConfigValidator.validateUserConfig(config);
      return config;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        // ユーザー設定は任意なので、存在しない場合は警告を出力して null を返す
        ErrorManager.logWarning(ErrorCode.USER_CONFIG_INVALID, `User config file not found at: ${configPath}`);
        return null;
      }
      throw error;
    }
  }
} 