import { AppConfigLoader } from "./loaders/app_config_loader.ts";
import { UserConfigLoader } from "./loaders/user_config_loader.ts";
import type { AppConfig } from "./types/app_config.ts";
import type { UserConfig } from "./types/user_config.ts";
import type { MergedConfig } from "./types/merged_config.ts";

export class ConfigManager {
  private appLoader: AppConfigLoader;
  private userLoader: UserConfigLoader | null = null;
  private config: MergedConfig | null = null;

  constructor(configPath?: string) {
    this.appLoader = new AppConfigLoader(configPath);
  }

  async getConfig(): Promise<MergedConfig> {
    if (this.config) {
      return this.config;
    }

    const appConfig = await this.appLoader.load();
    this.userLoader = new UserConfigLoader(appConfig.working_dir);
    const userConfig = await this.userLoader.load();

    this.config = this.mergeConfigs(appConfig, userConfig);
    return this.config;
  }

  private mergeConfigs(appConfig: AppConfig, userConfig: UserConfig | null): MergedConfig {
    if (!userConfig) {
      return appConfig as MergedConfig;
    }

    const merged: MergedConfig = {
      ...appConfig,
      ...userConfig,
      app_prompt: {
        ...appConfig.app_prompt,
        ...(userConfig.app_prompt || {})
      },
      app_schema: {
        ...appConfig.app_schema,
        ...(userConfig.app_schema || {})
      }
    };

    return merged;
  }
} 