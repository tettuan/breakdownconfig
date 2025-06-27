
# プロジェクト: PostgreSQL接続

現在の`src/`配下の実装を全域関数（Total Function）による設計にリファクタリングする。部分関数による不安定性を排除し、型安全性を強化して、バグに強いコード設計を実現する。


# チームの構成
あなたは指揮官であり上司である。
最初にチームを立ち上げて進める。

`instructions/team-head.ja.md` に詳細の記載がある。
チーム立ち上げの指示なので、必ず最初に読むこと。
各paneの存在を確認し、無ければ起動し、あればClaudeの起動を確認すること。全員を調べ、Claudeが起動していない部下に対し,Claude起動する。

# 実施内容

## 1. リファクタリング対象の特定

### 1.1 MergedConfig型の置き換え

#### Action 1: 厳密な型定義の実装

**対象ファイル**: `src/types/merged_config.ts`

**現在のコード**:
```typescript
interface MergedConfig extends AppConfig {
  [key: string]: string | number | boolean | null | undefined | { [key: string]: unknown };
}
```

**リファクタリング後**:
```typescript
// 新しい型定義を作成
type ConfigLoadResult = 
  | { kind: "success"; config: ValidatedConfig }
  | { kind: "fileNotFound"; path: string }
  | { kind: "parseError"; error: string; path: string }
  | { kind: "validationError"; errors: ValidationError[]; path: string };

interface ValidatedConfig {
  working_dir: ValidPath;
  app_prompt: {
    base_dir: ValidPath;
  };
  app_schema: {
    base_dir: ValidPath;
  };
  custom: CustomConfig;
}

type CustomConfig = Record<string, ConfigValue>;
type ConfigValue = 
  | string
  | number
  | boolean
  | ConfigValue[]
  | { [key: string]: ConfigValue };
```

#### Action 2: ConfigManagerのエラーハンドリング修正

**対象ファイル**: `src/config_manager.ts`

**修正対象メソッド**: `loadUserConfig()`

**現在のコード**:
```typescript
private async loadUserConfig(): Promise<UserConfig> {
  try {
    this.userConfig = await this.userConfigLoader.load();
    if (!this.userConfig) {
      return {} as UserConfig; // 危険な型アサーション
    }
    return this.userConfig;
  } catch (_error) {
    return {} as UserConfig; // エラーの詳細を無視
  }
}
```

**リファクタリング後**:
```typescript
private async loadUserConfig(): Promise<ConfigResult<UserConfig>> {
  const result = await this.userConfigLoader.load();
  return result;
}
```

### 1.2 AppConfigLoaderのバリデーション強化

#### Action 3: 全域関数によるバリデーション実装

**対象ファイル**: `src/loaders/app_config_loader.ts`

**修正対象メソッド**: `validateConfig()`

**現在のコード**:
```typescript
private validateConfig(config: unknown): config is AppConfig {
  if (!config || typeof config !== "object") {
    return false;
  }
  
  const { working_dir, app_prompt, app_schema } = config as Partial<AppConfig>;
  
  return typeof working_dir === "string" &&
    this.isValidPromptConfig(app_prompt) &&
    this.isValidSchemaConfig(app_schema);
}
```

**リファクタリング後**:
```typescript
private validateConfig(config: unknown): ConfigResult<AppConfig> {
  if (!config || typeof config !== "object") {
    return { 
      success: false, 
      error: { kind: "validationError", field: "root", value: config, expectedType: "object" }
    };
  }
  
  const validationResults = [
    this.validateWorkingDir(config),
    this.validatePromptConfig(config),
    this.validateSchemaConfig(config)
  ];
  
  const errors = validationResults.filter(r => !r.success);
  if (errors.length > 0) {
    return { success: false, error: { kind: "validationError", errors: errors.map(e => e.error) }};
  }
  
  return { success: true, data: config as AppConfig };
}
```

---

## 2. 新規ファイルの作成

### 2.1 新しい型定義ファイルの作成

#### Action 4: ConfigResult型の作成

**新規ファイル**: `src/types/config_result.ts`

```typescript
export type ConfigResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ConfigError };

export type ConfigError = 
  | { kind: "fileNotFound"; path: string; message: string }
  | { kind: "parseError"; path: string; line: number; column: number; message: string }
  | { kind: "validationError"; field: string; value: unknown; expectedType: string }
  | { kind: "pathError"; path: string; reason: PathErrorReason };

export type PathErrorReason = 
  | "pathTraversal"
  | "absoluteNotAllowed" 
  | "invalidCharacters"
  | "tooLong";
```

#### Action 5: ValidPath Smart Constructorの実装

**新規ファイル**: `src/utils/valid_path.ts`

```typescript
export class ValidPath {
  private constructor(private readonly value: string) {}
  
  static create(path: string): ConfigResult<ValidPath> {
    // パストラバーサルのチェック
    if (path.includes("../")) {
      return { 
        success: false, 
        error: { kind: "pathError", path, reason: "pathTraversal" }
      };
    }
    
    // 絶対パスのチェック
    if (path.startsWith("/")) {
      return { 
        success: false, 
        error: { kind: "pathError", path, reason: "absoluteNotAllowed" }
      };
    }
    
    // 無効な文字のチェック
    if (!/^[a-zA-Z0-9._/-]+$/.test(path)) {
      return { 
        success: false, 
        error: { kind: "pathError", path, reason: "invalidCharacters" }
      };
    }
    
    return { success: true, data: new ValidPath(path) };
  }
  
  getValue(): string {
    return this.value;
  }
}
```

### 2.2 SafeConfigLoaderの実装

#### Action 6: 全域関数ローダーの作成

**新規ファイル**: `src/loaders/safe_config_loader.ts`

```typescript
import { ConfigResult, ConfigError } from "../types/config_result.ts";
import { ValidatedConfig } from "../types/validated_config.ts";

export class SafeConfigLoader {
  async load(path: string): Promise<ConfigResult<ValidatedConfig>> {
    const fileResult = await this.readFile(path);
    if (!fileResult.success) {
      return fileResult;
    }
    
    const parseResult = this.parseYaml(fileResult.data);
    if (!parseResult.success) {
      return parseResult;
    }
    
    const validationResult = this.validate(parseResult.data);
    return validationResult;
  }
  
  private async readFile(path: string): Promise<ConfigResult<string>> {
    try {
      const content = await Deno.readTextFile(path);
      return { success: true, data: content };
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return { 
          success: false, 
          error: { kind: "fileNotFound", path, message: `File not found: ${path}` }
        };
      }
      throw error;
    }
  }
  
  private parseYaml(content: string): ConfigResult<unknown> {
    try {
      const data = YAML.parse(content);
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          kind: "parseError", 
          path: "", 
          line: error.line || 0, 
          column: error.column || 0, 
          message: error.message 
        }
      };
    }
  }
  
  private validate(data: unknown): ConfigResult<ValidatedConfig> {
    // バリデーションロジックの実装
    // ...
  }
}
```


## 3. 既存ファイルの段階的修正

### 3.1 ConfigManagerの全面リファクタリング

#### Action 7: エラー処理の統一

**対象ファイル**: `src/config_manager.ts`

**修正内容**:
1. 全てのメソッドの戻り値を`ConfigResult<T>`に変更
2. エラーの詳細情報を保持する仕組みを追加
3. 設定のマージ処理を全域関数として実装

```typescript
export class ConfigManager {
  async initialize(): Promise<ConfigResult<ValidatedConfig>> {
    const appConfigResult = await this.loadAppConfig();
    if (!appConfigResult.success) {
      return appConfigResult;
    }
    
    const userConfigResult = await this.loadUserConfig();
    if (!userConfigResult.success) {
      // ユーザー設定はオプショナルなので、エラーでも続行
      console.warn("User config could not be loaded:", userConfigResult.error);
    }
    
    const mergedResult = this.mergeConfigs(
      appConfigResult.data,
      userConfigResult.success ? userConfigResult.data : {}
    );
    
    return mergedResult;
  }
  
  private mergeConfigs(
    appConfig: AppConfig, 
    userConfig: UserConfig
  ): ConfigResult<ValidatedConfig> {
    // マージロジックを全域関数として実装
    // 全てのケースを明示的に処理
  }
}
```

### 3.2 ローダークラスの改修

#### Action 8: AppConfigLoaderの全面改修

**対象ファイル**: `src/loaders/app_config_loader.ts`

**修正内容**:
1. `load()`メソッドの戻り値を`ConfigResult<AppConfig>`に変更
2. 例外処理をResult型で統一
3. バリデーションロジックの強化

#### Action 9: UserConfigLoaderの改修

**対象ファイル**: `src/loaders/user_config_loader.ts`

**修正内容**:
1. オプショナルな設定ファイルの扱いを明確化
2. 「設定なし」と「設定エラー」を明確に区別
3. 戻り値の型を統一

---

## 4. テストの追加・修正

### 4.1 新しい型に対応したテストの作成

#### Action 10: 全域関数のテスト追加

**新規ファイル**: `tests/config/totality_test.ts`

```typescript
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ValidPath } from "../../src/utils/valid_path.ts";
import { SafeConfigLoader } from "../../src/loaders/safe_config_loader.ts";

Deno.test("ValidPath - should reject path traversal", () => {
  const result = ValidPath.create("../malicious/path");
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.kind, "pathError");
    assertEquals(result.error.reason, "pathTraversal");
  }
});

Deno.test("SafeConfigLoader - should handle all error cases", async () => {
  const loader = new SafeConfigLoader();
  
  // ファイルが存在しない場合
  const result = await loader.load("nonexistent.yml");
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.kind, "fileNotFound");
  }
});
```

### 4.2 既存テストの修正

#### Action 11: 既存テストファイルの戻り値対応

**対象ファイル**: `tests/config/loading_test.ts`, `tests/config/validation_test.ts`

**修正内容**:
- `ConfigResult<T>`型への対応
- エラーケースのテスト強化
- 網羅的なテストケースの追加

## 5. 実装スケジュール

### Phase 1: 基盤の構築（1-2日）
#### Day 1
- [ ] Action 4: `src/types/config_result.ts`の作成
- [ ] Action 5: `src/utils/valid_path.ts`の実装
- [ ] Action 10: 基本的なテストの作成

#### Day 2
- [ ] Action 6: `src/loaders/safe_config_loader.ts`の実装
- [ ] 基盤コンポーネントのテスト実行・修正

### Phase 2: 既存コードの段階的修正（2-3日）
#### Day 3
- [ ] Action 1: `MergedConfig`型の置き換え
- [ ] Action 3: `AppConfigLoader`のバリデーション強化

#### Day 4
- [ ] Action 7: `ConfigManager`の全面リファクタリング
- [ ] Action 8: `AppConfigLoader`の改修

#### Day 5
- [ ] Action 9: `UserConfigLoader`の改修
- [ ] Action 2: エラーハンドリングの修正

### Phase 3: テストと検証（1-2日）
#### Day 6
- [ ] Action 11: 既存テストの修正
- [ ] 全体的な動作テスト

#### Day 7（必要に応じて）
- [ ] パフォーマンステスト
- [ ] ドキュメントの更新
- [ ] 最終検証

---

## 6. 検証方法

### 6.1 型安全性の検証
```bash
# TypeScriptコンパイラによる型チェック
deno check src/**/*.ts

# 型エラーが0件であることを確認
```

### 6.2 網羅性の検証
```bash
# 全てのテストケースが通ることを確認
deno test --coverage

# カバレッジが95%以上であることを確認
deno coverage --html
```

### 6.3 実行時エラーの削減確認
```bash
# 既存の例外キャッチが削除されていることを確認
grep -r "catch.*Error" src/ | wc -l  # 0になるべき

# Result型が適切に使用されていることを確認
grep -r "ConfigResult" src/ | wc -l  # 十分な数があるべき
```

---

## 7. 成功指標

### 7.1 定量的指標
1. **型エラー**: 0件（コンパイル時）
2. **実行時例外**: 0件（正常系テスト）
3. **テストカバレッジ**: 95%以上
4. **未処理エラーケース**: 0件

### 7.2 定性的指標
1. **可読性**: 全てのエラーケースが明示的
2. **保守性**: 新しい設定項目の追加が型安全
3. **デバッグ性**: エラーの原因が明確に特定可能
4. **拡張性**: 新しいローダーの追加が容易


## タスクの進め方

- Git:
  - 現在のGitブランチが適切か判断する (see @docs/claude/git-workflow.md)
  - 作成が必要なら Git ブランチを作成し、移動する
- サイクル: 仕様把握 → 調査 → 計画・設計 → 実行 → 記録・検証 → 学習 → 仕様把握へ戻る
- アサイン: サイクル段階に応じて、メンバーの役割を変更し最適アサイン。常時フル稼働を目指す。


### 進捗更新

- 進捗させるべきタスクは `tmp/tasks.md` に書き出し、完了マークをつけたりしながら進めてください。
- すべてが完了したら、`tmp/completed.md` に完了したレポートを記録してください。

# 作業開始指示

まずチームを立ち上げます。
チーム全体のパフォーマンスが重要です。
ワーカープールマネージャーを活躍させ、部下であるゴルーチンをフル稼働させてください。
今なにをすべきか（タスク分割や、状況整理、要件定義）について、ワーカープールマネージャーが把握していることが重要です。
ワーカープールマネージャーから、今やる詳細タスクへ分割し、部下ゴルーチンへ割り当てさせてください。

プロジェクトの成功を祈ります。開始してください。

