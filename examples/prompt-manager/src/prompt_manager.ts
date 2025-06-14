import { BreakdownConfig } from "@tettuan/breakdownconfig";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

export class PromptManager {
  private config: BreakdownConfig;

  constructor(config: BreakdownConfig) {
    this.config = config;
  }

  /**
   * プロンプトファイルを取得する
   * @param name プロンプトファイル名
   * @returns プロンプトの内容
   */
  async getPrompt(name: string): Promise<string> {
    const config = await this.config.getConfig();
    const promptPath = join(config.app_prompt.base_dir, `${name}.txt`);

    try {
      return await readFile(promptPath, "utf-8");
    } catch (_error) {
      throw new Error(`Failed to read prompt file: ${name}`);
    }
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
    } catch (_error) {
      throw new Error(`Failed to read schema file: ${name}`);
    }
  }
}
