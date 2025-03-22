import type { AppConfig } from "./app_config.ts";

export interface MergedConfig extends AppConfig {
  working_dir: string;
  app_prompt: {
    base_dir: string;
  };
  app_schema: {
    base_dir: string;
  };
  // ユーザー設定からの追加項目を許容
  [key: string]: string | number | boolean | null | undefined | { [key: string]: unknown };
}
