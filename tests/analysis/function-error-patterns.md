# Function Error Patterns Analysis

## Functions Being Tested

### 1. BreakdownConfig Class Methods

#### `constructor(configSetName?: string, baseDir?: string)`
- **Current**: Throws Error for invalid config set names
- **Error Pattern**: Validation in constructor with regex check
- **Test Coverage**: 5 tests in `undefined_handling_test.ts`
- **Result Type Benefit**: Could return a factory function that returns `ConfigResult<BreakdownConfig>`

#### `loadConfig(): Promise<void>`
- **Current**: Throws various errors (ERR1001, ERR1002, ERR4001)
- **Error Cases**:
  - ERR1001: File not found
  - ERR1002: Invalid YAML or validation failure
  - ERR4001: Invalid config set name
- **Test Coverage**: 41 assertRejects across all test files
- **Result Type**: `Promise<ConfigResult<void>>`

#### `getConfig(): Promise<AppConfig>`
- **Current**: Throws if config not loaded
- **Error Cases**:
  - "Configuration not loaded"
- **Test Coverage**: Used in most success tests, 1 specific error test
- **Result Type**: `Promise<ConfigResult<AppConfig>>`

### 2. ConfigValidator Methods

#### `validateAppConfig(config: unknown): void`
- **Current**: Throws ERR1002 for validation failures
- **Error Cases**:
  - Missing required fields
  - Invalid field types
  - Empty string values
- **Test Coverage**: Extensively tested in `validation_test.ts`
- **Result Type**: `ConfigResult<ValidatedAppConfig>`

#### `validateUserConfig(config: unknown): void`
- **Current**: Throws ERR2001 for validation failures
- **Error Cases**:
  - Invalid field types
  - Invalid structure
- **Test Coverage**: Implicitly tested through config loading
- **Result Type**: `ConfigResult<ValidatedUserConfig>`

### 3. File Operations (Implicit)

#### YAML Parsing
- **Current**: Throws on invalid syntax
- **Error Cases**:
  - Malformed YAML syntax
  - Invalid structure (array instead of object)
- **Test Coverage**: 6 tests in `err1002/` directory
- **Result Type Benefit**: Return ParseError with line/column info

#### File Reading
- **Current**: Throws on missing files
- **Error Cases**:
  - File not found
  - Permission denied
- **Test Coverage**: Implicit in all file-based tests
- **Result Type**: `ConfigResult<string>` with FileNotFoundError

## Error Code Mapping

| Error Code | Current Usage | Result Type Mapping |
|------------|---------------|---------------------|
| ERR1001 | App config not found | `FileNotFoundError` |
| ERR1002 | Invalid app config | `ValidationError` or `ParseError` |
| ERR2001 | Invalid user config | `ValidationError` |
| ERR4001 | Invalid config set name | `ValidationError` with specific field |

## Test Pattern Summary

### Exception-Based Patterns Found

1. **Direct assertRejects**
   ```typescript
   await assertRejects(
     async () => { await config.loadConfig(); },
     Error,
     "ERR1001"
   );
   ```
   - Used 41 times
   - Tests error message contains error code

2. **Try-Catch with Rethrow**
   ```typescript
   try {
     // ... operation
   } catch (error) {
     logger.error("Test failed", { error });
     throw error;
   }
   ```
   - Used for logging before test failure
   - Makes debugging easier

3. **Error Message Validation**
   ```typescript
   assertEquals(error.message.includes("ERR1001"), true);
   ```
   - Used to verify error codes in messages

4. **Expect Pattern (BDD)**
   ```typescript
   await expect(config.loadConfig()).rejects.toThrow("ERR1001");
   ```
   - Used once in `config_loader_test.ts`

### Functions That Would Benefit Most from Result Types

1. **loadConfig()** - 41 error tests
2. **validateAppConfig()** - Complex validation logic
3. **YAML parsing** - Needs line/column error info
4. **File operations** - Clear file not found cases

### Functions with Simple Errors

1. **getConfig()** - Single error case (not loaded)
2. **Constructor validation** - Could stay as-is or use factory pattern

## Recommendations for Conversion

### High Priority (Most Impact)
1. `loadConfig()` - Most tested error function
2. YAML parsing operations - Need better error details
3. `validateAppConfig()` - Complex validation rules

### Medium Priority
1. `getConfig()` - Simple but frequently used
2. `validateUserConfig()` - Less critical path

### Low Priority
1. Constructor validation - Works well as-is
2. Path operations - Limited error cases

## Test Improvement Opportunities

### With Result Types
1. **Precise Error Testing**: Test specific error properties, not just messages
2. **Error Chain Testing**: Test how errors propagate through operations
3. **Exhaustiveness Checking**: Ensure all error cases are handled
4. **No String Matching**: Remove brittle error message assertions

### Example Improvement
```typescript
// Current: Brittle string matching
assertEquals(error.message.includes("ERR1001"), true);

// With Result: Type-safe property checking
assertEquals(result.error.kind, "fileNotFound");
assertEquals(result.error.path, expectedPath);
```

This analysis shows that the codebase has well-defined error cases that would map cleanly to a Result type system, with the primary benefit being type safety and more precise error handling in tests.