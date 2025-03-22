import { BreakdownConfig } from "@tettuan/breakdownconfig";
import { join } from "path";
import { readFile, writeFile } from "fs/promises";

export class SchemaManager {
  private config: BreakdownConfig;

  constructor(config: BreakdownConfig) {
    this.config = config;
  }

  /**
   * スキーマファイルを取得する
   * @param name スキーマファイル名
   * @returns スキーマの内容
   */
  async getSchema(name: string): Promise<object> {
    const config = await this.config.getConfig();
    const schemaPath = join(config.app_schema.base_dir, `${name}.json`);
    
    try {
      const content = await readFile(schemaPath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read schema file: ${name}`);
    }
  }

  /**
   * スキーマファイルを保存する
   * @param name スキーマファイル名
   * @param schema スキーマの内容
   */
  async saveSchema(name: string, schema: object): Promise<void> {
    const config = await this.config.getConfig();
    const schemaPath = join(config.app_schema.base_dir, `${name}.json`);
    
    try {
      await writeFile(schemaPath, JSON.stringify(schema, null, 2), "utf-8");
    } catch (error) {
      throw new Error(`Failed to save schema file: ${name}`);
    }
  }

  /**
   * スキーマの検証を行う
   * @param schema 検証対象のスキーマ
   * @returns 検証結果
   */
  validateSchema(schema: object): boolean {
    // スキーマの検証ロジックを実装
    // 例: 必須フィールドの存在チェック、型チェックなど
    return true;
  }
} 