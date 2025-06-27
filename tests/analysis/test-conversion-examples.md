# Test Conversion Examples: From Exceptions to Result Types

## Overview

This document provides concrete examples of how current tests would be converted to use Result types, maintaining the same test coverage while improving type safety.

## 1. Basic Config Loading Test

### Current Implementation
```typescript
// From tests/basic/config_loader_test.ts
it("should load and merge configurations correctly", async () => {
  const tempDir = await setupMergeConfigs();
  try {
    const config = new BreakdownConfig(undefined, tempDir);
    await config.loadConfig();
    const result = await config.getConfig();
    
    assertEquals(result.working_dir, DefaultPaths.WORKING_DIR);
    assertEquals(result.app_prompt.base_dir, "custom/prompts");
    assertEquals(result.app_schema.base_dir, DefaultPaths.SCHEMA_BASE_DIR);
  } catch (error) {
    logger.error("Test failed", { error });
    throw error;
  } finally {
    await cleanupTestConfigs(tempDir);
  }
});
```

### Result Type Implementation
```typescript
it("should load and merge configurations correctly", async () => {
  const tempDir = await setupMergeConfigs();
  try {
    const config = new BreakdownConfig(undefined, tempDir);
    const loadResult = await config.loadConfig();
    
    // Assert successful loading
    assertOk(loadResult);
    
    const configResult = await config.getConfig();
    assertOk(configResult);
    
    // Access data through Result type
    const result = configResult.data;
    assertEquals(result.working_dir, DefaultPaths.WORKING_DIR);
    assertEquals(result.app_prompt.base_dir, "custom/prompts");
    assertEquals(result.app_schema.base_dir, DefaultPaths.SCHEMA_BASE_DIR);
  } finally {
    await cleanupTestConfigs(tempDir);
  }
});
```

## 2. Error Handling Test

### Current Implementation
```typescript
// From tests/config/error_test.ts
it("should handle missing working directory", async () => {
  const tempDir = await setupInvalidConfig(invalidAppConfigs.missingWorkingDir);
  try {
    const config = new BreakdownConfig(undefined, tempDir);
    await assertRejects(
      async () => {
        await config.loadConfig();
      },
      Error,
      "ERR1002: Invalid application configuration",
    );
  } finally {
    await cleanupTestConfigs(tempDir);
  }
});
```

### Result Type Implementation
```typescript
it("should handle missing working directory", async () => {
  const tempDir = await setupInvalidConfig(invalidAppConfigs.missingWorkingDir);
  try {
    const config = new BreakdownConfig(undefined, tempDir);
    const result = await config.loadConfig();
    
    // Assert failure with specific error type
    assertErr(result);
    assertEquals(result.error.kind, "validationError");
    assertEquals(result.error.field, "working_dir");
    assertEquals(result.error.expectedType, "string");
  } finally {
    await cleanupTestConfigs(tempDir);
  }
});
```

## 3. File Not Found Test

### Current Implementation
```typescript
// From tests/basic/config_loader_test.ts
Deno.test("Basic Config Loading - Missing App Config", async () => {
  const testDir = await Deno.makeTempDir();
  try {
    const configDir = `${testDir}/${DefaultPaths.WORKING_DIR}/config`;
    await Deno.mkdir(configDir, { recursive: true });
    
    const config = new BreakdownConfig(undefined, testDir);
    await expect(config.loadConfig()).rejects.toThrow("ERR1001");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});
```

### Result Type Implementation
```typescript
Deno.test("Basic Config Loading - Missing App Config", async () => {
  const testDir = await Deno.makeTempDir();
  try {
    const configDir = `${testDir}/${DefaultPaths.WORKING_DIR}/config`;
    await Deno.mkdir(configDir, { recursive: true });
    
    const config = new BreakdownConfig(undefined, testDir);
    const result = await config.loadConfig();
    
    assertErr(result);
    assertEquals(result.error.kind, "fileNotFound");
    assertEquals(result.error.path, `${configDir}/app.yml`);
    assertStringIncludes(result.error.message, "Application configuration file not found");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});
```

## 4. YAML Parse Error Test

### Current Implementation
```typescript
// From tests/err1002/invalid_yaml_test.ts
Deno.test("ERR1002 Invalid YAML Test - malformed YAML syntax", async () => {
  await Deno.mkdir(".agent/breakdown/config", { recursive: true });
  
  const invalidYaml = `
working_dir: "./.agent/breakdown"
app_prompt:
  base_dir: "./.agent/breakdown/prompts/app"
  [ invalid YAML here
app_schema:
  base_dir: "./.agent/breakdown/schema/app"
`;
  
  await Deno.writeTextFile(".agent/breakdown/config/yaml-test-app.yml", invalidYaml);
  const config = new BreakdownConfig("yaml-test");
  
  await assertRejects(
    async () => {
      await config.loadConfig();
    },
    Error,
    ErrorCode.APP_CONFIG_INVALID,
  );
});
```

### Result Type Implementation
```typescript
Deno.test("ERR1002 Invalid YAML Test - malformed YAML syntax", async () => {
  await Deno.mkdir(".agent/breakdown/config", { recursive: true });
  
  const invalidYaml = `
working_dir: "./.agent/breakdown"
app_prompt:
  base_dir: "./.agent/breakdown/prompts/app"
  [ invalid YAML here
app_schema:
  base_dir: "./.agent/breakdown/schema/app"
`;
  
  await Deno.writeTextFile(".agent/breakdown/config/yaml-test-app.yml", invalidYaml);
  const config = new BreakdownConfig("yaml-test");
  
  const result = await config.loadConfig();
  
  assertErr(result);
  assertEquals(result.error.kind, "parseError");
  assertEquals(result.error.path, ".agent/breakdown/config/yaml-test-app.yml");
  assertEquals(result.error.line, 5); // Line with parse error
  assertStringIncludes(result.error.message, "invalid YAML");
});
```

## 5. Validation Chain Test

### Current Implementation
```typescript
// From tests/config/validation_test.ts
it("should validate required fields", async () => {
  const tempDir = await setupAppConfigOnly();
  try {
    const config = new BreakdownConfig(undefined, tempDir);
    await config.loadConfig();
    const result = await config.getConfig();
    
    ConfigValidator.validateAppConfig(result);
    
    assertEquals(result.working_dir, DefaultPaths.WORKING_DIR);
    assertEquals(result.app_prompt.base_dir, DefaultPaths.PROMPT_BASE_DIR);
    assertEquals(result.app_schema.base_dir, DefaultPaths.SCHEMA_BASE_DIR);
  } finally {
    await cleanupTestConfigs(tempDir);
  }
});
```

### Result Type Implementation
```typescript
it("should validate required fields", async () => {
  const tempDir = await setupAppConfigOnly();
  try {
    const config = new BreakdownConfig(undefined, tempDir);
    
    // Chain operations with Result types
    const result = await config.loadConfig()
      .then(loadResult => Result.flatMap(loadResult, () => config.getConfig()))
      .then(configResult => Result.flatMap(configResult, cfg => 
        ConfigValidator.validateAppConfig(cfg)
      ));
    
    assertOk(result);
    const validatedConfig = result.data;
    
    assertEquals(validatedConfig.working_dir, DefaultPaths.WORKING_DIR);
    assertEquals(validatedConfig.app_prompt.base_dir, DefaultPaths.PROMPT_BASE_DIR);
    assertEquals(validatedConfig.app_schema.base_dir, DefaultPaths.SCHEMA_BASE_DIR);
  } finally {
    await cleanupTestConfigs(tempDir);
  }
});
```

## Test Helper Utilities

### Assertion Helpers
```typescript
// test_utils.ts additions
export function assertOk<T, E>(
  result: ConfigResult<T, E>
): asserts result is Success<T> {
  if (!result.success) {
    throw new AssertionError(
      `Expected success result, got error: ${JSON.stringify(result.error)}`
    );
  }
}

export function assertErr<T, E>(
  result: ConfigResult<T, E>
): asserts result is Failure<E> {
  if (result.success) {
    throw new AssertionError(
      `Expected error result, got success: ${JSON.stringify(result.data)}`
    );
  }
}

export function assertErrorKind<T>(
  result: ConfigResult<T, ConfigError>,
  expectedKind: ConfigError["kind"]
): void {
  assertErr(result);
  assertEquals(result.error.kind, expectedKind);
}
```

### Pattern Matching Helper
```typescript
export function matchResult<T, E, R>(
  result: ConfigResult<T, E>,
  patterns: {
    ok: (data: T) => R;
    err: (error: E) => R;
  }
): R {
  if (result.success) {
    return patterns.ok(result.data);
  }
  return patterns.err(result.error);
}

// Usage in tests
const testOutcome = matchResult(await config.loadConfig(), {
  ok: () => "Config loaded successfully",
  err: (error) => `Failed with ${error.kind}: ${error.message}`
});
```

## Benefits of These Conversions

1. **Explicit Error Types**: Instead of catching generic Error and checking message strings, we have typed error objects
2. **No Hidden Throws**: All error cases are visible in the return type
3. **Better Test Coverage**: Can test specific error properties, not just error messages
4. **Composability**: Chain multiple operations without nested try-catch blocks
5. **Type Safety**: TypeScript ensures all error cases are handled

## Migration Strategy

1. Start with new test files using Result patterns
2. Create compatibility layer for existing tests
3. Gradually convert existing tests module by module
4. Update documentation with new patterns
5. Remove exception-based code once all tests are converted