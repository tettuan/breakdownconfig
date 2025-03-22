import { AppConfigLoader } from "./loaders/app_config_loader.ts";
import { UserConfigLoader } from "./loaders/user_config_loader.ts";
import type { AppConfig } from "./types/app_config.ts";
import type { UserConfig } from "./types/user_config.ts";
import type { MergedConfig } from "./types/merged_config.ts";

/**
 * Configuration Manager
 *
 * This module manages the loading and merging of application and user configurations.
 * It uses the URL API for path resolution to ensure consistent behavior across platforms.
 */

export class ConfigManager {
  private appConfig: AppConfig | null = null;
  private userConfig: UserConfig | null = null;
  private isLoaded = false;

  constructor(
    private readonly appConfigLoader: AppConfigLoader,
    private readonly userConfigLoader: UserConfigLoader,
  ) {}

  async getConfig(): Promise<MergedConfig> {
    if (this.isLoaded) {
      return this.mergeConfigs(this.appConfig!, this.userConfig!);
    }

    this.appConfig = await this.appConfigLoader.load();
    this.userConfig = await this.userConfigLoader.load();
    this.isLoaded = true;

    return this.mergeConfigs(this.appConfig, this.userConfig);
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
        ...(userConfig.app_prompt || {}),
      },
      app_schema: {
        ...appConfig.app_schema,
        ...(userConfig.app_schema || {}),
      },
    };

    return merged;
  }
}
