/**
 * Error Handling Example
 *
 * Result型APIとUnifiedErrorによるエラーハンドリングを示すサンプル。
 *
 * 既存examplesとの違い:
 * - config-example: throw/catchパターン
 * - このexample: Result型（Safe API）パターン
 *
 * デモ内容:
 * 1. Safe APIによるハッピーパス
 * 2. Result.match / Result.map / Result.unwrapOr
 * 3. 不正プロファイル名の検出
 * 4. loadConfig前アクセスの検出
 * 5. 存在しない設定ファイルの検出
 * 6. ErrorGuardsによる網羅的分岐
 */

import { BreakdownConfig } from "../../mod.ts";
import { ErrorGuards, Result } from "../../src/errors/mod.ts";
import type { MergedConfig } from "../../mod.ts";
import type { UnifiedError } from "../../src/errors/mod.ts";

// ─── Scenario 1: Safe APIによるハッピーパス ───

async function scenario1_happyPath(): Promise<void> {
  console.log("\n=== Scenario 1: Safe APIによるハッピーパス ===");

  const createResult = BreakdownConfig.create();
  if (!createResult.success) {
    console.log("[FAIL] create:", createResult.error.message);
    return;
  }
  const config = createResult.data;

  const loadResult = await config.loadConfigSafe();
  if (!loadResult.success) {
    console.log("[FAIL] loadConfigSafe:", loadResult.error.message);
    return;
  }

  const configResult = await config.getConfigSafe();
  if (!configResult.success) {
    console.log("[FAIL] getConfigSafe:", configResult.error.message);
    return;
  }

  const workingDirResult = await config.getWorkingDirSafe();
  const promptDirResult = await config.getPromptDirSafe();
  const schemaDirResult = await config.getSchemaDirSafe();

  console.log("[OK] working_dir:", Result.unwrapOr(workingDirResult, "(default)"));
  console.log("[OK] prompt_dir:", Result.unwrapOr(promptDirResult, "(default)"));
  console.log("[OK] schema_dir:", Result.unwrapOr(schemaDirResult, "(default)"));
}

// ─── Scenario 2: Result.match / Result.map ───

async function scenario2_resultUtilities(): Promise<void> {
  console.log("\n=== Scenario 2: Result.match / Result.map ===");

  const createResult = BreakdownConfig.create();
  if (!createResult.success) return;
  const config = createResult.data;
  await config.loadConfigSafe();

  // Result.match: 成功/失敗で分岐
  const configResult = await config.getConfigSafe();
  const summary = Result.match(
    configResult,
    (cfg: MergedConfig) => `loaded: working_dir=${cfg.working_dir}`,
    (err: UnifiedError) => `error: ${err.kind}`,
  );
  console.log("[match]", summary);

  // Result.map: 成功値を変換
  const dirResult = Result.map(
    configResult,
    (cfg: MergedConfig) => ({
      prompt: cfg.app_prompt.base_dir,
      schema: cfg.app_schema.base_dir,
    }),
  );
  if (dirResult.success) {
    console.log("[map] directories:", dirResult.data);
  }

  // Result.unwrapOr: デフォルト値付き取得
  const workingDir = Result.unwrapOr(
    await config.getWorkingDirSafe(),
    "/fallback/path",
  );
  console.log("[unwrapOr] workingDir:", workingDir);
}

// ─── Scenario 3: 不正プロファイル名の検出 ───

function scenario3_invalidProfileName(): void {
  console.log("\n=== Scenario 3: 不正プロファイル名 ===");

  const invalidNames = ["with spaces", "日本語", "path/../traversal"];

  for (const name of invalidNames) {
    const result = BreakdownConfig.create(name);
    if (!result.success) {
      const err = result.error;
      if (ErrorGuards.isConfigValidationError(err)) {
        console.log(`[CAUGHT] "${name}" → kind=${err.kind}`);
      } else if (ErrorGuards.isInvalidProfileNameError(err)) {
        console.log(`[CAUGHT] "${name}" → kind=${err.kind}, pattern=${err.pattern}`);
      } else {
        console.log(`[CAUGHT] "${name}" → kind=${err.kind}`);
      }
    }
  }
}

// ─── Scenario 4: loadConfig前のアクセス検出 ───

async function scenario4_configNotLoaded(): Promise<void> {
  console.log("\n=== Scenario 4: loadConfig前アクセス (CONFIG_NOT_LOADED) ===");

  const createResult = BreakdownConfig.create();
  if (!createResult.success) return;
  const config = createResult.data;

  // loadConfigSafe()を呼ばずにgetConfigSafe()
  const result = await config.getConfigSafe();
  if (!result.success) {
    const err = result.error;
    if (ErrorGuards.isConfigNotLoadedError(err)) {
      console.log(`[CAUGHT] kind=${err.kind}`);
      console.log(`  operation: ${err.requestedOperation}`);
      console.log(`  suggestion: ${err.suggestion}`);
    }
  }
}

// ─── Scenario 5: 存在しない設定ファイル ───

async function scenario5_missingConfig(): Promise<void> {
  console.log("\n=== Scenario 5: 設定ファイル不在 (CONFIG_FILE_NOT_FOUND) ===");

  const createResult = BreakdownConfig.create(undefined, "/nonexistent/path");
  if (!createResult.success) {
    console.log("[CAUGHT] create failed:", createResult.error.kind);
    return;
  }
  const config = createResult.data;

  const loadResult = await config.loadConfigSafe();
  if (!loadResult.success) {
    const err = loadResult.error;
    if (ErrorGuards.isConfigFileNotFound(err)) {
      console.log(`[CAUGHT] kind=${err.kind}`);
      console.log(`  path: ${err.path}`);
      console.log(`  configType: ${err.configType}`);
    } else {
      console.log(`[CAUGHT] kind=${err.kind}, message=${err.message}`);
    }
  }
}

// ─── Scenario 6: ErrorGuardsによる網羅的分岐 ───

function errorToUserMessage(err: UnifiedError): string {
  if (ErrorGuards.isConfigFileNotFound(err)) return "設定ファイルを作成してください";
  if (ErrorGuards.isConfigParseError(err)) return "YAMLの構文を確認してください";
  if (ErrorGuards.isConfigValidationError(err)) return "必須フィールドを確認してください";
  if (ErrorGuards.isPathValidationError(err)) return "パスに不正な文字が含まれています";
  if (ErrorGuards.isConfigNotLoadedError(err)) return "loadConfig()を先に呼んでください";
  if (ErrorGuards.isInvalidProfileNameError(err)) return "プロファイル名は英数字とハイフンのみ";
  if (ErrorGuards.isFileSystemError(err)) return "ファイルシステムエラー";
  if (ErrorGuards.isRequiredFieldMissingError(err)) return "必須フィールドが不足しています";
  if (ErrorGuards.isTypeMismatchError(err)) return "型が一致しません";
  if (ErrorGuards.isUnknownError(err)) return "不明なエラー";
  return "未定義のエラー種別";
}

async function scenario6_demo(): Promise<void> {
  console.log("\n=== Scenario 6: ErrorGuardsによる網羅的分岐 ===");

  // 不正プロファイル名のエラーで実演
  const result1 = BreakdownConfig.create("invalid name");
  if (!result1.success) {
    console.log(`[dispatch] → ${errorToUserMessage(result1.error)}`);
  }

  // loadConfig前アクセスのエラーで実演
  const result2 = BreakdownConfig.create();
  if (result2.success) {
    const configResult = await result2.data.getConfigSafe();
    if (!configResult.success) {
      console.log(`[dispatch] → ${errorToUserMessage(configResult.error)}`);
    }
  }
}

// ─── main ───

async function main(): Promise<void> {
  console.log("=== Error Handling Example ===");
  console.log("Result型APIとErrorGuardsによるエラーハンドリング\n");

  await scenario1_happyPath();
  await scenario2_resultUtilities();
  scenario3_invalidProfileName();
  await scenario4_configNotLoaded();
  await scenario5_missingConfig();
  await scenario6_demo();

  console.log("\n=== All scenarios completed ===");
}

if (import.meta.main) {
  main();
}
