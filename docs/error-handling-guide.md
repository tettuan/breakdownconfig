# BreakdownConfig エラーハンドリングガイド

## 概要

BreakdownConfigは、設定ファイルの読み込みとマージにおいて発生する可能性のあるエラーを、Result型を使用して明示的に扱います。これにより、コンパイル時にエラーハンドリングの漏れを防ぎ、より堅牢なアプリケーションを構築できます。

## エラー型の詳細

### FileNotFoundError

**概要**: 指定された設定ファイルが見つからない場合に発生します。

**型定義**:
```typescript
type FileNotFoundError = {
  kind: "fileNotFound";
  path: string;        // 見つからなかったファイルのパス
  message: string;     // エラーメッセージ
};
```

**発生条件**:
- 指定されたパスにファイルが存在しない
- ファイルへの読み取り権限がない
- シンボリックリンクが壊れている

**対処方法**:
```typescript
if (error.kind === "fileNotFound") {
  // オプション1: デフォルト設定を使用
  console.log(`Config file not found at ${error.path}, using defaults`);
  
  // オプション2: ユーザーに通知
  console.error(`Please create a config file at: ${error.path}`);
  
  // オプション3: 代替パスを試す
  const altPath = error.path.replace('.yaml', '.yml');
  const altResult = await loader.loadConfig(altPath);
}
```

### ParseError

**概要**: YAML/JSONファイルの構文解析に失敗した場合に発生します。

**型定義**:
```typescript
type ParseError = {
  kind: "parseError";
  path: string;        // エラーが発生したファイルのパス
  line: number;        // エラー行番号（0の場合は不明）
  column: number;      // エラー列番号（0の場合は不明）
  message: string;     // パーサーからのエラーメッセージ
};
```

**発生条件**:
- YAMLの構文が不正（インデントエラー、括弧の不一致など）
- 不正な文字エンコーディング
- 循環参照
- サポートされていないYAML機能の使用

**対処方法**:
```typescript
if (error.kind === "parseError") {
  console.error(`Syntax error in ${error.path}`);
  if (error.line > 0) {
    console.error(`  at line ${error.line}, column ${error.column}`);
  }
  console.error(`  ${error.message}`);
  
  // ヒントを提供
  console.log("\nCommon causes:");
  console.log("- Incorrect indentation (use spaces, not tabs)");
  console.log("- Missing quotes around special characters");
  console.log("- Unclosed brackets or quotes");
}
```

**よくある構文エラーの例**:
```yaml
# ❌ タブ文字の使用（スペースを使用すべき）
server:
	port: 8080

# ❌ 文字列のクォート忘れ
message: Hello: World  # コロンが構文エラーの原因

# ✅ 正しい構文
server:
  port: 8080
message: "Hello: World"
```

### ValidationError

**概要**: 設定値が期待される型や制約を満たさない場合に発生します。

**型定義**:
```typescript
type ValidationError = {
  kind: "validationError";
  field: string;         // エラーが発生したフィールド名
  value: unknown;        // 実際に提供された値
  expectedType: string;  // 期待される型または制約の説明
  message?: string;      // 追加の詳細情報（オプション）
};
```

**発生条件**:
- 必須フィールドが欠落している
- 値の型が不正（例: 数値が必要な箇所に文字列）
- 値が許可された範囲外
- フォーマットが不正（例: 不正なURL、メールアドレス）

**対処方法**:
```typescript
if (error.kind === "validationError") {
  console.error(`Configuration error in field '${error.field}'`);
  console.error(`  Expected: ${error.expectedType}`);
  console.error(`  Received: ${JSON.stringify(error.value)}`);
  
  // フィールド別の具体的なアドバイス
  switch (error.field) {
    case "port":
      console.log("  Port must be a number between 1 and 65535");
      break;
    case "database.url":
      console.log("  Database URL must start with 'postgres://' or 'mysql://'");
      break;
    case "api.timeout":
      console.log("  Timeout must be a positive number (in milliseconds)");
      break;
  }
}
```

**バリデーションルールの例**:
```typescript
// アプリケーション設定のバリデーションルール
interface AppConfig {
  name: string;          // 必須、1-100文字
  version: string;       // 必須、セマンティックバージョン形式
  port: number;          // 必須、1-65535
  debug: boolean;        // オプション、デフォルト: false
  api: {
    endpoint: string;    // 必須、有効なURL
    timeout: number;     // 必須、正の数値（ミリ秒）
    retries: number;     // オプション、0-10、デフォルト: 3
  };
}
```

### PathError

**概要**: ファイルパスに関する問題が検出された場合に発生します。

**型定義**:
```typescript
type PathError = {
  kind: "pathError";
  path: string;              // 問題のあるパス
  reason: PathErrorReason;   // エラーの具体的な理由
  message?: string;          // 追加の説明
};

type PathErrorReason =
  | "pathTraversal"          // ディレクトリトラバーサル攻撃の可能性
  | "absoluteNotAllowed"     // 絶対パスが許可されていない
  | "invalidCharacters"      // 使用できない文字が含まれている
  | "tooLong"               // パスが長すぎる
  | "empty";                // 空のパス
```

**発生条件と対処方法**:

#### pathTraversal
```typescript
// ❌ 危険: 親ディレクトリへのアクセス
"../../../etc/passwd"
"config/../../../sensitive.yaml"

// ✅ 安全: 相対パスは現在のディレクトリ内のみ
"./config/app.yaml"
"config/app.yaml"
```

#### absoluteNotAllowed
```typescript
// ❌ エラー: 絶対パスは許可されていない
"/etc/app/config.yaml"
"C:\\Users\\config.yaml"

// ✅ 正しい: 相対パスを使用
"./config.yaml"
"config/app.yaml"
```

#### invalidCharacters
```typescript
// ❌ エラー: 特殊文字を含む
"config:app.yaml"
"config|app.yaml"
"config\0.yaml"

// ✅ 正しい: 安全な文字のみ
"config_app.yaml"
"config-app.yaml"
"config.app.yaml"
```

### UnknownError

**概要**: 予期しないエラーが発生した場合のフォールバック。

**型定義**:
```typescript
type UnknownError = {
  kind: "unknownError";
  message: string;           // エラーの説明
  originalError?: unknown;   // 元のエラーオブジェクト（デバッグ用）
};
```

**発生条件**:
- システムエラー（メモリ不足、ディスク容量不足）
- 予期しない例外
- サードパーティライブラリのエラー

**対処方法**:
```typescript
if (error.kind === "unknownError") {
  console.error("An unexpected error occurred:", error.message);
  
  // デバッグモードでは詳細を表示
  if (process.env.DEBUG) {
    console.error("Original error:", error.originalError);
  }
  
  // エラーレポートの送信を促す
  console.log("\nIf this error persists, please report it at:");
  console.log("https://github.com/your-org/breakdownconfig/issues");
}
```

## エラーハンドリングのベストプラクティス

### 1. 網羅的なエラーハンドリング

```typescript
async function loadConfiguration(): Promise<Config | null> {
  const result = await breakdownConfig.loadConfig();
  
  if (result.success) {
    return result.data;
  }
  
  // すべてのエラータイプを処理
  switch (result.error.kind) {
    case "fileNotFound":
      // デフォルト設定を返す
      return getDefaultConfig();
      
    case "parseError":
      // ユーザーに修正を促す
      notifyUserOfSyntaxError(result.error);
      return null;
      
    case "validationError":
      // 詳細なエラー情報を記録
      logValidationError(result.error);
      return null;
      
    case "pathError":
      // セキュリティ警告
      logSecurityWarning(result.error);
      return null;
      
    case "unknownError":
      // 予期しないエラーの報告
      reportUnexpectedError(result.error);
      return null;
      
    default:
      // TypeScriptの網羅性チェック
      const _exhaustive: never = result.error;
      return _exhaustive;
  }
}
```

### 2. エラーの集約とレポート

```typescript
function collectConfigErrors(results: ConfigResult<any, ConfigError>[]): ConfigError[] {
  return results
    .filter(result => !result.success)
    .map(result => result.error);
}

function generateErrorReport(errors: ConfigError[]): string {
  const report = ["Configuration Errors Summary:"];
  
  const errorsByKind = errors.reduce((acc, error) => {
    acc[error.kind] = (acc[error.kind] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  for (const [kind, count] of Object.entries(errorsByKind)) {
    report.push(`  ${kind}: ${count} error(s)`);
  }
  
  report.push("\nDetailed Errors:");
  errors.forEach((error, index) => {
    report.push(`\n${index + 1}. ${formatError(error)}`);
  });
  
  return report.join("\n");
}
```

### 3. ユーザーフレンドリーなエラーメッセージ

```typescript
function formatError(error: ConfigError): string {
  switch (error.kind) {
    case "fileNotFound":
      return `Configuration file not found: ${error.path}
   Please ensure the file exists and is readable.`;
      
    case "parseError":
      return `Syntax error in ${error.path} at line ${error.line}:
   ${error.message}
   Check for proper indentation and valid YAML syntax.`;
      
    case "validationError":
      return `Invalid value for '${error.field}':
   Expected: ${error.expectedType}
   Received: ${JSON.stringify(error.value)}`;
      
    case "pathError":
      return `Invalid path '${error.path}': ${error.reason}
   ${getPathErrorHint(error.reason)}`;
      
    case "unknownError":
      return `Unexpected error: ${error.message}
   Please check the logs for more details.`;
  }
}

function getPathErrorHint(reason: PathErrorReason): string {
  const hints: Record<PathErrorReason, string> = {
    pathTraversal: "Remove '../' from the path for security.",
    absoluteNotAllowed: "Use relative paths instead of absolute paths.",
    invalidCharacters: "Use only alphanumeric characters, '-', '_', '.', and '/'.",
    tooLong: "Use a shorter path (max 255 characters).",
    empty: "Provide a valid file path."
  };
  return hints[reason];
}
```

### 4. エラーからの回復

```typescript
class ConfigService {
  private config: Config | null = null;
  private lastError: ConfigError | null = null;
  
  async initialize(): Promise<boolean> {
    const result = await this.loadWithFallback();
    
    if (result.success) {
      this.config = result.data;
      return true;
    }
    
    this.lastError = result.error;
    return false;
  }
  
  private async loadWithFallback(): Promise<ConfigResult<Config, ConfigError>> {
    // プライマリ設定ファイルを試す
    const primaryResult = await this.loadFromPath("./config/app.yaml");
    if (primaryResult.success) return primaryResult;
    
    // フォールバック: 代替パスを試す
    const fallbackResult = await this.loadFromPath("./config/app.yml");
    if (fallbackResult.success) return fallbackResult;
    
    // フォールバック: デフォルト設定を使用
    if (primaryResult.error.kind === "fileNotFound") {
      console.log("Using default configuration");
      return Result.ok(this.getDefaultConfig());
    }
    
    // その他のエラーは回復不可能
    return primaryResult;
  }
  
  getLastError(): ConfigError | null {
    return this.lastError;
  }
}
```

## エラーのテスト

```typescript
import { assertEquals, assertExists } from "@std/assert";

Deno.test("handles file not found error", async () => {
  const result = await loader.loadConfig("./non-existent.yaml");
  
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.kind, "fileNotFound");
    assertExists(result.error.path);
    assertExists(result.error.message);
  }
});

Deno.test("handles parse error with location info", async () => {
  // 不正なYAMLファイルを作成
  await Deno.writeTextFile("./invalid.yaml", "key: value\n  invalid");
  
  const result = await loader.loadConfig("./invalid.yaml");
  
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.kind, "parseError");
    assert(result.error.line > 0, "Should have line number");
  }
  
  // クリーンアップ
  await Deno.remove("./invalid.yaml");
});
```

## まとめ

BreakdownConfigのエラーハンドリングシステムは、以下の利点を提供します：

1. **型安全性**: コンパイル時にエラーハンドリングの漏れを検出
2. **明確性**: エラーの種類と内容が明確に定義されている
3. **回復可能性**: エラーの種類に応じた適切な回復戦略を実装可能
4. **デバッグ容易性**: 詳細なエラー情報により問題の特定が容易

Result型パターンを採用することで、より堅牢で保守しやすいアプリケーションを構築できます。