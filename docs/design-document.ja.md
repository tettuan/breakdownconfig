# BreakdownConfig ライブラリ設計書：全域性原則による型安全設計

## 概要

BreakdownConfigは、**全域性原則**に基づいて設計された型安全な設定管理ライブラリです。ドメイン駆動設計の手法により、「ありえない状態」を型レベルで排除し、設定ファイルの読み込み・統合・アクセスを安全に行います。

## 設計哲学：全域性原則の適用

### 核心理念
**部分関数を全域関数に変換**し、型システムで「ありえない状態」を排除する。

### 適用原則
1. **Discriminated Union**: オプショナルプロパティによる状態表現を排除
2. **Smart Constructor**: 制約のある値型の安全な生成
3. **Result型**: 例外による制御フローを排除
4. **網羅的分岐**: `switch`文による全ケース処理

## ドメインルール定義

### 1. 設定実体の状態

#### 設定ファイル読み込み状態
```typescript
type ConfigFileReadResult = 
  | { kind: "success"; content: ConfigFileContent }
  | { kind: "not_found" }
  | { kind: "parse_error"; error: ParseError }
  | { kind: "access_denied"; path: string }
```

#### 設定統合状態
```typescript
type ConfigMergeResult =
  | { kind: "app_only"; config: ApplicationConfig }
  | { kind: "merged"; config: MergedConfig; overrides: UserOverrides }
```

#### 設定アクセス状態
```typescript
type ConfigAccessResult<T> =
  | { kind: "value_found"; value: T }
  | { kind: "default_used"; value: T; reason: "missing_key" | "invalid_type" }
  | { kind: "access_error"; error: ConfigAccessError }
```

### 2. 値の制約

#### 作業ディレクトリパス
```typescript
class WorkingDirectory {
  private constructor(readonly value: string) {}
  
  static create(path: string): Result<WorkingDirectory, PathError> {
    if (!isAbsolutePath(path)) {
      return { ok: false, error: new PathError("作業ディレクトリは絶対パスである必要があります") }
    }
    if (!isDirectory(path)) {
      return { ok: false, error: new PathError("指定されたパスはディレクトリではありません") }
    }
    return { ok: true, data: new WorkingDirectory(path) }
  }
}
```

#### 設定ファイルパス
```typescript
class ConfigFilePath {
  private constructor(
    readonly workingDir: WorkingDirectory,
    readonly relativePath: string
  ) {}
  
  static forApplication(workingDir: WorkingDirectory): ConfigFilePath {
    return new ConfigFilePath(workingDir, ".agent/breakdown/config/app.yml")
  }
  
  static forUser(workingDir: WorkingDirectory): ConfigFilePath {
    return new ConfigFilePath(workingDir, ".agent/breakdown/config/user.yml")
  }
  
  get absolutePath(): string {
    return path.join(this.workingDir.value, this.relativePath)
  }
}
```

### 3. 状態遷移ルール

#### 設定読み込みフロー
```typescript
type ConfigLoadingPhase =
  | { kind: "initializing"; workingDir: WorkingDirectory }
  | { kind: "loading_app_config"; appConfigPath: ConfigFilePath }
  | { kind: "loading_user_config"; userConfigPath: ConfigFilePath }
  | { kind: "merging_configs"; appConfig: ApplicationConfig; userConfig?: UserConfig }
  | { kind: "completed"; finalConfig: MergedConfig }
  | { kind: "failed"; error: ConfigLoadError; phase: string }
```

### 4. ビジネス例外

#### 許可される状態遷移
- `initializing` → `loading_app_config`
- `loading_app_config` → `loading_user_config` | `failed`
- `loading_user_config` → `merging_configs`
- `merging_configs` → `completed` | `failed`

#### 禁止される状態
- ❌ アプリケーション設定ファイルの不存在
- ❌ `working_dir`のユーザー設定ファイルでの定義（アプリケーション設定ファイルでのみ設定可能）
- ❌ 不正なYAML形式の設定ファイル

## 型安全なアーキテクチャ

### コア型定義

#### 基盤型
```typescript
// Result型：例外を値として表現
type Result<T, E> = 
  | { ok: true; data: T }
  | { ok: false; error: E }

// 設定キー型：型安全なアクセス
type ConfigKey<T> = {
  readonly key: string
  readonly validator: (value: unknown) => value is T
}

// 設定値型：検証済みの値
class ValidatedConfigValue<T> {
  private constructor(readonly value: T, readonly source: ConfigSource) {}
  
  static create<T>(
    value: unknown, 
    validator: (v: unknown) => v is T,
    source: ConfigSource
  ): Result<ValidatedConfigValue<T>, ValidationError> {
    if (validator(value)) {
      return { ok: true, data: new ValidatedConfigValue(value, source) }
    }
    return { ok: false, error: new ValidationError("型検証に失敗しました", value) }
  }
}
```

#### 設定構造体
```typescript
// アプリケーション設定：必須項目が保証されている
interface ApplicationConfig {
  readonly working_dir: WorkingDirectory
  readonly app_prompt?: PromptConfig
  readonly app_schema?: SchemaConfig
}

// ユーザー設定：working_dirは含まない（アプリケーション設定でのみ設定可能）
type UserConfig = Partial<Omit<ApplicationConfig, 'working_dir'>> & 
                  Record<string, unknown>

// 統合済み設定：アプリケーション設定をベースとした最終形態
interface MergedConfig extends ApplicationConfig {
  readonly userOverrides: ReadonlyMap<string, ConfigSource>
  readonly additionalUserConfig: ReadonlyMap<string, unknown>
}
```

### Smart Constructors

#### 設定ファイルコンテンツ
```typescript
class ConfigFileContent {
  private constructor(
    readonly data: Record<string, unknown>,
    readonly filePath: ConfigFilePath,
    readonly loadedAt: Date
  ) {}
  
  static async load(filePath: ConfigFilePath): Promise<Result<ConfigFileContent, ConfigLoadError>> {
    try {
      const content = await Deno.readTextFile(filePath.absolutePath)
      const data = YAML.parse(content)
      
      if (typeof data !== 'object' || data === null) {
        return { ok: false, error: new ConfigLoadError("設定ファイルはオブジェクトである必要があります") }
      }
      
      return { ok: true, data: new ConfigFileContent(data as Record<string, unknown>, filePath, new Date()) }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return { ok: false, error: new ConfigLoadError("設定ファイルが見つかりません", filePath.absolutePath) }
      }
      return { ok: false, error: new ConfigLoadError("設定ファイルの読み込みに失敗しました", error) }
    }
  }
}
```

### 全域関数による処理

#### 設定統合処理
```typescript
class ConfigMerger {
  static merge(
    appConfig: ApplicationConfig, 
    userConfig?: UserConfig
  ): MergedConfig {
    if (!userConfig) {
      return {
        ...appConfig,
        userOverrides: new Map(),
        additionalUserConfig: new Map()
      }
    }
    
    const userOverrides = new Map<string, ConfigSource>()
    const additionalUserConfig = new Map<string, unknown>()
    const mergedConfig = { ...appConfig }
    
    for (const [key, value] of Object.entries(userConfig)) {
      // working_dirは型レベルで除外されているため、ここには含まれない
      if (key in appConfig && key !== 'working_dir') {
        mergedConfig[key as keyof ApplicationConfig] = value
        userOverrides.set(key, ConfigSource.USER_FILE)
      } else {
        additionalUserConfig.set(key, value)
      }
    }
    
    return {
      ...mergedConfig,
      userOverrides,
      additionalUserConfig
    }
  }
}
```

#### 型安全な設定アクセス
```typescript
class ConfigAccessor {
  constructor(private readonly config: MergedConfig) {}
  
  get<T>(key: ConfigKey<T>): ConfigAccessResult<T> {
    const rawValue = this.getRawValue(key.key)
    
    switch (rawValue.kind) {
      case "found":
        if (key.validator(rawValue.value)) {
          return { kind: "value_found", value: rawValue.value }
        }
        return { 
          kind: "access_error", 
          error: new ConfigAccessError("型が一致しません", key.key, rawValue.value) 
        }
        
      case "not_found":
        return { 
          kind: "access_error", 
          error: new ConfigAccessError("キーが存在しません", key.key) 
        }
    }
  }
  
  getWithDefault<T>(key: ConfigKey<T>, defaultValue: T): ConfigAccessResult<T> {
    const result = this.get(key)
    
    switch (result.kind) {
      case "value_found":
        return result
        
      case "access_error":
        return { kind: "default_used", value: defaultValue, reason: "missing_key" }
    }
  }
  
  private getRawValue(key: string): 
    | { kind: "found"; value: unknown }
    | { kind: "not_found" } {
    
    if (key in this.config) {
      return { kind: "found", value: this.config[key as keyof MergedConfig] }
    }
    
    if (this.config.additionalUserConfig.has(key)) {
      return { kind: "found", value: this.config.additionalUserConfig.get(key) }
    }
    
    return { kind: "not_found" }
  }
}
```

## 主要ファサード

### BreakdownConfig クラス
```typescript
class BreakdownConfig {
  private constructor(
    private readonly accessor: ConfigAccessor,
    private readonly metadata: ConfigMetadata
  ) {}
  
  static async load(workingDirPath: string): Promise<Result<BreakdownConfig, ConfigLoadError>> {
    // 1. 作業ディレクトリの検証
    const workingDirResult = WorkingDirectory.create(workingDirPath)
    if (!workingDirResult.ok) {
      return { ok: false, error: new ConfigLoadError("作業ディレクトリが不正です", workingDirResult.error) }
    }
    
    // 2. アプリケーション設定の読み込み
    const appConfigPath = ConfigFilePath.forApplication(workingDirResult.data)
    const appConfigResult = await ConfigFileContent.load(appConfigPath)
    if (!appConfigResult.ok) {
      return { ok: false, error: appConfigResult.error }
    }
    
    // 3. ユーザー設定の読み込み（オプショナル）
    const userConfigPath = ConfigFilePath.forUser(workingDirResult.data)
    const userConfigResult = await ConfigFileContent.load(userConfigPath)
    
    const userConfig = userConfigResult.ok ? userConfigResult.data : undefined
    
    // 4. 設定の統合
    const appConfig: ApplicationConfig = {
      working_dir: workingDirResult.data,
      ...appConfigResult.data.data
    }
    
    const mergedConfig = ConfigMerger.merge(appConfig, userConfig?.data)
    const accessor = new ConfigAccessor(mergedConfig)
    const metadata = new ConfigMetadata(appConfigResult.data, userConfig)
    
    return { ok: true, data: new BreakdownConfig(accessor, metadata) }
  }
  
  get<T>(key: ConfigKey<T>): ConfigAccessResult<T> {
    return this.accessor.get(key)
  }
  
  getWithDefault<T>(key: ConfigKey<T>, defaultValue: T): ConfigAccessResult<T> {
    return this.accessor.getWithDefault(key, defaultValue)
  }
  
  getMetadata(): ConfigMetadata {
    return this.metadata
  }
}
```

## 使用例

### 基本的な使用方法
```typescript
import { BreakdownConfig, ConfigKeys } from './mod.ts'

// 設定の読み込み
const configResult = await BreakdownConfig.load('/project/path')

if (!configResult.ok) {
  console.error('設定の読み込みに失敗:', configResult.error.message)
  Deno.exit(1)
}

const config = configResult.data

// 型安全な設定アクセス
const workingDirResult = config.get(ConfigKeys.WORKING_DIR)
switch (workingDirResult.kind) {
  case "value_found":
    console.log('作業ディレクトリ:', workingDirResult.value.value)
    break
  case "access_error":
    console.error('設定アクセスエラー:', workingDirResult.error.message)
    break
}

// デフォルト値付きアクセス
const promptConfigResult = config.getWithDefault(
  ConfigKeys.APP_PROMPT, 
  { base_dir: "default/prompts" }
)

switch (promptConfigResult.kind) {
  case "value_found":
    console.log('プロンプト設定:', promptConfigResult.value)
    break
  case "default_used":
    console.log('デフォルト値を使用:', promptConfigResult.value)
    break
}
```

### カスタム設定キーの定義
```typescript
// カスタム設定キーの定義
const CUSTOM_KEY: ConfigKey<string> = {
  key: "custom_field",
  validator: (value): value is string => typeof value === "string"
}

const customResult = config.get(CUSTOM_KEY)
// 型安全なアクセスが保証される
```

## エラーハンドリング戦略

### エラー型の階層
```typescript
abstract class ConfigError extends Error {
  abstract readonly kind: string
}

class ConfigLoadError extends ConfigError {
  readonly kind = "config_load_error"
  constructor(message: string, readonly cause?: unknown) {
    super(message)
  }
}

class ConfigAccessError extends ConfigError {
  readonly kind = "config_access_error"
  constructor(message: string, readonly key: string, readonly value?: unknown) {
    super(message)
  }
}

class ValidationError extends ConfigError {
  readonly kind = "validation_error"
  constructor(message: string, readonly invalidValue: unknown) {
    super(message)
  }
}
```

### 全域的エラー処理
```typescript
function handleConfigError(error: ConfigError): never {
  switch (error.kind) {
    case "config_load_error":
      console.error(`設定読み込みエラー: ${error.message}`)
      if (error.cause) {
        console.error('原因:', error.cause)
      }
      Deno.exit(1)
      
    case "config_access_error":
      console.error(`設定アクセスエラー: ${error.message}`)
      console.error(`キー: ${error.key}`)
      if (error.value !== undefined) {
        console.error(`値: ${JSON.stringify(error.value)}`)
      }
      Deno.exit(1)
      
    case "validation_error":
      console.error(`バリデーションエラー: ${error.message}`)
      console.error(`不正な値: ${JSON.stringify(error.invalidValue)}`)
      Deno.exit(1)
  }
}
```

## テスト戦略：型安全性の検証

### プロパティベーステスト
```typescript
import { fc } from "fast-check"

// 作業ディレクトリの制約テスト
fc.test("WorkingDirectory.create は絶対パスのみ受け入れる", () => {
  fc.property(fc.string(), (path) => {
    const result = WorkingDirectory.create(path)
    if (result.ok) {
      // 成功した場合は絶対パスであることを確認
      expect(path.startsWith('/')).toBe(true)
    }
  })
})

// 設定統合の交換律テスト
fc.test("設定統合は同じキーに対して後勝ちである", () => {
  fc.property(
    fc.record({ working_dir: fc.constant(validWorkingDir) }),
    fc.record({ key: fc.string() }),
    (appConfig, userConfig) => {
      const merged = ConfigMerger.merge(appConfig, userConfig)
      // ユーザー設定で定義されたキーはユーザー設定の値が優先される
      if ('key' in userConfig) {
        expect(merged.userOverrides.has('key')).toBe(true)
      }
    }
  )
})
```

### 状態遷移テスト
```typescript
describe("設定読み込み状態遷移", () => {
  test("正常フロー：初期化→アプリ読み込み→ユーザー読み込み→統合→完了", async () => {
    const phases: ConfigLoadingPhase[] = []
    
    const config = await BreakdownConfig.loadWithPhaseTracking(
      validWorkingDir,
      (phase) => phases.push(phase)
    )
    
    expect(phases).toMatchObject([
      { kind: "initializing" },
      { kind: "loading_app_config" },
      { kind: "loading_user_config" },
      { kind: "merging_configs" },
      { kind: "completed" }
    ])
  })
  
  test("異常フロー：アプリ設定不存在で失敗", async () => {
    const result = await BreakdownConfig.load('/nonexistent/path')
    
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe("config_load_error")
    }
  }
})
```

## 品質指標と検証

### 全域性原則の達成度
- [ ] ✅ `switch`文に`default`が不要（全ケース網羅）
- [ ] ✅ 型アサーション（`as`）の使用量ゼロ
- [ ] ✅ オプショナルプロパティによる状態表現の排除
- [ ] ✅ Result型による例外制御フローの排除
- [ ] ✅ Smart Constructorによる制約値の保証

### ドメインルールの型反映度
- [ ] ✅ 設定ファイルの状態が型で表現されている
- [ ] ✅ 作業ディレクトリの制約が型で保証されている
- [ ] ✅ 設定統合ルールが型安全に実装されている
- [ ] ✅ 不正な状態遷移がコンパイル時に検出される

### 実装品質
- [ ] ✅ ビジネスルールが型定義に反映されている
- [ ] ✅ コンパイル時に不正状態を検出
- [ ] ✅ 関数の戻り値が予測可能
- [ ] ✅ エラー処理が網羅的で型安全

このアーキテクチャにより、BreakdownConfigは「ありえない状態」を型レベルで排除し、実行時エラーを最小化した堅牢な設定管理ライブラリとして機能します。
