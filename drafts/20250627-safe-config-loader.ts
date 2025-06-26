// 改善案: 全域関数としての設定ローダー

import type { ConfigLoadResult, ValidationError, ConfigValue } from "./improved_types.ts";
import { ValidPath } from "./valid_path.ts";

/**
 * 型安全な設定ローダー
 * 全ての入力に対して適切な結果を返す全域関数として実装
 */
export class SafeConfigLoader {
  constructor(
    private readonly configSetName?: string,
    private readonly baseDir: string = ""
  ) {}
  
  /**
   * 設定ファイルを安全に読み込む全域関数
   * 全ての可能な結果をDiscriminated Unionで表現
   */
  async loadAppConfig(): Promise<ConfigLoadResult<AppConfig>> {
    // ファイルパスの構築と検証
    const pathResult = this.buildConfigPath("app");
    if (!pathResult.success) {
      return {
        kind: "pathError",
        path: pathResult.attemptedPath,
        reason: pathResult.reason
      };
    }
    
    // ファイル読み込み
    const fileResult = await this.readConfigFile(pathResult.path);
    if (fileResult.kind !== "success") {
      return fileResult;
    }
    
    // YAML解析
    const parseResult = this.parseYamlContent(fileResult.data, pathResult.path.getValue());
    if (parseResult.kind !== "success") {
      return parseResult;
    }
    
    // 設定の検証
    const validationResult = this.validateAppConfig(parseResult.data);
    if (validationResult.kind !== "success") {
      return validationResult;
    }
    
    return {
      kind: "success",
      data: validationResult.data
    };
  }
  
  /**
   * ユーザー設定を安全に読み込む
   * ファイルが存在しない場合は成功として空の設定を返す
   */
  async loadUserConfig(): Promise<ConfigLoadResult<UserConfig>> {
    const pathResult = this.buildConfigPath("user");
    if (!pathResult.success) {
      return {
        kind: "pathError", 
        path: pathResult.attemptedPath,
        reason: pathResult.reason
      };
    }
    
    const fileResult = await this.readConfigFile(pathResult.path);
    
    // ユーザー設定はオプショナルなので、ファイル未存在は成功扱い
    if (fileResult.kind === "fileNotFound") {
      return {
        kind: "success",
        data: {} // 空のユーザー設定
      };
    }
    
    if (fileResult.kind !== "success") {
      return fileResult;
    }
    
    const parseResult = this.parseYamlContent(fileResult.data, pathResult.path.getValue());
    if (parseResult.kind !== "success") {
      return parseResult;
    }
    
    const validationResult = this.validateUserConfig(parseResult.data);
    return validationResult;
  }
  
  /**
   * 設定ファイルのパスを安全に構築
   */
  private buildConfigPath(configType: "app" | "user"): 
    | { success: true; path: ValidPath }
    | { success: false; reason: PathErrorReason; attemptedPath: string } {
    
    const fileName = this.configSetName 
      ? `${this.configSetName}-${configType}.yml`
      : `${configType}.yml`;
    
    const fullPath = this.baseDir
      ? `${this.baseDir}/.agent/breakdown/config/${fileName}`
      : `.agent/breakdown/config/${fileName}`;
    
    const pathResult = ValidPath.create(fullPath);
    if (pathResult.success) {
      return { success: true, path: pathResult.path };
    } else {
      return { 
        success: false, 
        reason: pathResult.reason, 
        attemptedPath: fullPath 
      };
    }
  }
  
  /**
   * ファイルを安全に読み込み
   */
  private async readConfigFile(path: ValidPath): Promise<ConfigLoadResult<string>> {
    try {
      const content = await Deno.readTextFile(path.getValue());
      return { kind: "success", data: content };
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return {
          kind: "fileNotFound",
          path: path.getValue(),
          message: `Configuration file not found: ${path.getValue()}`
        };
      }
      
      return {
        kind: "parseError",
        path: path.getValue(),
        message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * YAMLコンテンツを安全に解析
   */
  private parseYamlContent(content: string, path: string): ConfigLoadResult<unknown> {
    try {
      const data = parseYaml(content);
      return { kind: "success", data };
    } catch (error) {
      return {
        kind: "parseError",
        path,
        message: `YAML parse error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * アプリケーション設定を検証
   */
  private validateAppConfig(data: unknown): ConfigLoadResult<AppConfig> {
    const errors: ValidationError[] = [];
    
    if (!data || typeof data !== "object") {
      errors.push({
        field: "root",
        value: data,
        expectedType: "object",
        message: "Configuration must be an object"
      });
      return { kind: "validationError", errors };
    }
    
    const config = data as Record<string, unknown>;
    
    // working_dir の検証
    if (typeof config.working_dir !== "string") {
      errors.push({
        field: "working_dir",
        value: config.working_dir,
        expectedType: "string",
        message: "working_dir must be a string"
      });
    } else {
      const pathResult = ValidPath.create(config.working_dir);
      if (!pathResult.success) {
        errors.push({
          field: "working_dir",
          value: config.working_dir,
          expectedType: "valid path",
          message: `Invalid working_dir: ${pathResult.message}`
        });
      }
    }
    
    // app_prompt の検証
    if (!this.isValidPromptConfig(config.app_prompt)) {
      errors.push({
        field: "app_prompt",
        value: config.app_prompt,
        expectedType: "{ base_dir: string }",
        message: "app_prompt must have a valid base_dir"
      });
    }
    
    // app_schema の検証
    if (!this.isValidSchemaConfig(config.app_schema)) {
      errors.push({
        field: "app_schema", 
        value: config.app_schema,
        expectedType: "{ base_dir: string }",
        message: "app_schema must have a valid base_dir"
      });
    }
    
    if (errors.length > 0) {
      return { kind: "validationError", errors };
    }
    
    // 全ての検証を通過した場合のみ、型アサーションを行う
    return { 
      kind: "success", 
      data: config as AppConfig 
    };
  }
  
  /**
   * ユーザー設定を検証
   */
  private validateUserConfig(data: unknown): ConfigLoadResult<UserConfig> {
    if (!data || typeof data !== "object") {
      return { 
        kind: "validationError", 
        errors: [{
          field: "root",
          value: data,
          expectedType: "object",
          message: "User configuration must be an object"
        }]
      };
    }
    
    // ユーザー設定は全てオプショナルなので、構造チェックのみ
    const config = data as Record<string, unknown>;
    const errors: ValidationError[] = [];
    
    // オプショナルフィールドの検証
    if (config.working_dir !== undefined && typeof config.working_dir !== "string") {
      errors.push({
        field: "working_dir",
        value: config.working_dir,
        expectedType: "string | undefined",
        message: "working_dir must be a string or undefined"
      });
    }
    
    if (errors.length > 0) {
      return { kind: "validationError", errors };
    }
    
    return { 
      kind: "success", 
      data: config as UserConfig 
    };
  }
  
  private isValidPromptConfig(config: unknown): boolean {
    return typeof config === "object" &&
           config !== null &&
           "base_dir" in config &&
           typeof (config as { base_dir: unknown }).base_dir === "string";
  }
  
  private isValidSchemaConfig(config: unknown): boolean {
    return typeof config === "object" &&
           config !== null &&
           "base_dir" in config &&
           typeof (config as { base_dir: unknown }).base_dir === "string";
  }
}

// 使用例とパターンマッチング
export class SafeConfigManager {
  async loadConfig(): Promise<ValidatedConfig | ConfigError> {
    const loader = new SafeConfigLoader(this.configSetName, this.baseDir);
    
    const appResult = await loader.loadAppConfig();
    const userResult = await loader.loadUserConfig();
    
    // 型安全なパターンマッチング
    switch (appResult.kind) {
      case "success":
        switch (userResult.kind) {
          case "success":
            // 両方成功 - マージ処理
            return this.mergeConfigs(appResult.data, userResult.data);
          
          case "fileNotFound":
            // ユーザー設定なし - アプリ設定のみ使用
            return this.mergeConfigs(appResult.data, {});
          
          case "parseError":
          case "validationError":
          case "pathError":
            // ユーザー設定エラー - エラー情報を返す
            return { kind: "userConfigError", ...userResult };
        }
        break;
      
      case "fileNotFound":
        return { kind: "appConfigMissing", path: appResult.path };
      
      case "parseError":
      case "validationError": 
      case "pathError":
        return { kind: "appConfigError", ...appResult };
    }
  }
}
