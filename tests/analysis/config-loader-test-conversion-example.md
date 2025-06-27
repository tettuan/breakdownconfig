# Config Loader Test Conversion Example

## Original Test (Current Implementation)

```typescript
describe("Config Loading", () => {
  it("should load and merge configurations correctly", async () => {
    const tempDir = await setupMergeConfigs();
    
    try {
      const config = new BreakdownConfig(undefined, tempDir);
      await config.loadConfig();
      const result = await config.getConfig();
      
      // Assertions
      assertEquals(result.working_dir, DefaultPaths.WORKING_DIR);
      assertEquals(result.app_prompt.base_dir, "./prompts/user");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
  
  it("should handle missing config files", async () => {
    await assertRejects(
      async () => {
        const config = new BreakdownConfig(undefined, "/non-existent");
        await config.loadConfig();
      },
      Error,
      "ERR1001"
    );
  });
});
```

## Converted Test (Result Type Implementation)

```typescript
import { assertEquals } from "@std/assert/assert_equals";
import { BreakdownConfig } from "../../mod.ts";
import { cleanupTestConfigs, setupAppConfigOnly, setupMergeConfigs } from "../test_utils.ts";
import { describe, it } from "@std/testing/bdd";
import { Result, ok, err } from "../../src/types/result.ts";
import { ConfigError } from "../../src/types/errors.ts";

describe("Config Loading with Result Type", () => {
  it("should load and merge configurations correctly", async () => {
    const tempDir = await setupMergeConfigs();
    
    try {
      const config = new BreakdownConfig(undefined, tempDir);
      const loadResult = await config.loadConfig();
      
      // Assert successful loading
      assertEquals(loadResult.isOk(), true);
      
      const getResult = await config.getConfig();
      assertEquals(getResult.isOk(), true);
      
      // Safe unwrap after checking
      const mergedConfig = getResult.unwrap();
      assertEquals(mergedConfig.working_dir, DefaultPaths.WORKING_DIR);
      assertEquals(mergedConfig.app_prompt.base_dir, "./prompts/user");
      
      // Alternative: chain operations
      const chainedResult = await config.loadConfig()
        .andThen(() => config.getConfig())
        .map(cfg => cfg.app_prompt.base_dir);
      
      assertEquals(chainedResult.unwrap(), "./prompts/user");
    } finally {
      await cleanupTestConfigs(tempDir);
    }
  });
  
  it("should handle missing config files with proper error", async () => {
    const config = new BreakdownConfig(undefined, "/non-existent");
    const result = await config.loadConfig();
    
    // Assert error result
    assertEquals(result.isErr(), true);
    
    // Check error details
    const error = result.unwrapErr();
    assertEquals(error.code, "ERR1001");
    assertEquals(error.message.includes("not found"), true);
    assertEquals(error.details?.path, "/non-existent");
  });
  
  it("should chain operations and propagate errors", async () => {
    const config = new BreakdownConfig(undefined, "/non-existent");
    
    const result = await config.loadConfig()
      .andThen(() => config.getConfig())
      .map(cfg => cfg.working_dir);
    
    // Error should propagate through the chain
    assertEquals(result.isErr(), true);
    assertEquals(result.unwrapErr().code, "ERR1001");
  });
  
  it("should recover from errors with fallback", async () => {
    const primaryConfig = new BreakdownConfig(undefined, "/non-existent");
    const fallbackConfig = new BreakdownConfig(undefined, await setupAppConfigOnly());
    
    const result = await primaryConfig.loadConfig()
      .orElse(async (err) => {
        console.log(`Primary failed: ${err.message}, trying fallback`);
        return fallbackConfig.loadConfig();
      });
    
    // Should succeed with fallback
    assertEquals(result.isOk(), true);
  });
  
  it("should provide detailed error context", async () => {
    const config = new BreakdownConfig(undefined, "/non-existent");
    const result = await config.loadConfig();
    
    if (result.isErr()) {
      const error = result.unwrapErr();
      
      // Check all error properties
      assertEquals(typeof error.code, "string");
      assertEquals(typeof error.message, "string");
      assertEquals(error.details !== undefined, true);
      assertEquals(error.stack !== undefined, true);
      
      // Error should be serializable
      const serialized = JSON.stringify(error);
      const deserialized = JSON.parse(serialized);
      assertEquals(deserialized.code, error.code);
    }
  });
});
```

## Key Conversion Points

### 1. Success Path Changes
- Replace direct value returns with Result checks
- Use `isOk()` before unwrapping values
- Chain operations with `andThen()` and `map()`

### 2. Error Path Changes
- Replace `assertRejects` with Result error checks
- Access error properties directly (code, message, details)
- No need for try-catch in tests

### 3. New Test Patterns
- Error propagation through chains
- Error recovery with `orElse()`
- Error context and details validation
- Result type-specific operations

### 4. Benefits
- Type-safe error handling
- Better error introspection
- Cleaner test code without try-catch
- Explicit error propagation paths