export interface UserConfig {
  app_prompt?: {
    base_dir?: string;
  };
  app_schema?: {
    base_dir?: string;
  };
  [key: string]: any; // ユーザー設定からの追加項目を許容
} 