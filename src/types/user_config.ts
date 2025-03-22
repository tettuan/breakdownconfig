export interface UserConfig {
  app_prompt?: {
    base_dir: string;
  };
  app_schema?: {
    base_dir: string;
  };
  // ユーザー設定からの追加項目を許容
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | { [key: string]: unknown }
    | undefined;
}
