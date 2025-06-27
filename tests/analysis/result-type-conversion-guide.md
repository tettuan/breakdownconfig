# Result Type Test Conversion Guide

## Conversion Patterns

### Pattern 1: Simple Success Cases (assertEquals)
```typescript
// Before
const result = await loadConfig("config.yaml");
assertEquals(result.appConfig.key, "value");

// After
const result = await loadConfig("config.yaml");
assertEquals(result.isOk(), true);
assertEquals(result.unwrap().appConfig.key, "value");
```

### Pattern 2: Error Cases (assertRejects)
```typescript
// Before
await assertRejects(
  async () => await loadConfig("invalid.yaml"),
  Error,
  "ERR1002"
);

// After
const result = await loadConfig("invalid.yaml");
assertEquals(result.isErr(), true);
assertEquals(result.unwrapErr().code, "ERR1002");
```

### Pattern 3: Error with Specific Properties
```typescript
// Before
try {
  await loadConfig("missing.yaml");
} catch (e) {
  assertEquals(e.message.includes("not found"), true);
}

// After
const result = await loadConfig("missing.yaml");
assertEquals(result.isErr(), true);
const error = result.unwrapErr();
assertEquals(error.code, "ERR1001");
assertEquals(error.details?.path, "missing.yaml");
```

### Pattern 4: Chained Operations
```typescript
// Before
const config = await loadConfig("config.yaml");
const validated = validateAppConfig(config.appConfig);
const processed = processConfig(validated);

// After
const result = await loadConfig("config.yaml")
  .andThen(cfg => validateAppConfig(cfg.appConfig))
  .andThen(validated => processConfig(validated));

if (result.isOk()) {
  const processed = result.unwrap();
  // use processed
}
```

## Test File Priorities

### High Priority (Core functionality)
1. `/tests/basic/config_loader_test.ts` - 9 tests
2. `/tests/config/loading_test.ts` - 10 tests
3. `/tests/config/validation_test.ts` - 8 tests

### Medium Priority (Error handling)
1. `/tests/err1002/` - All 5 files (30 tests total)
2. `/tests/config/error_test.ts` - 10 tests

### Low Priority (Edge cases)
1. `/tests/undefined_handling_test.ts` - 4 tests
2. `/tests/custom_config_test.ts` - 2 tests

## Additional Error Test Cases Needed

### 1. Result Unwrap Safety Tests
```typescript
Deno.test("unwrap throws on error result", () => {
  const result = err<Config>(new ConfigError("ERR1001"));
  assertThrows(() => result.unwrap());
});
```

### 2. Error Chaining Tests
```typescript
Deno.test("error propagates through andThen chain", async () => {
  const result = await loadConfig("invalid.yaml")
    .andThen(cfg => validateAppConfig(cfg.appConfig))
    .andThen(validated => processConfig(validated));
  
  assertEquals(result.isErr(), true);
  assertEquals(result.unwrapErr().code, "ERR1002");
});
```

### 3. Result Mapping Tests
```typescript
Deno.test("map transforms success value", () => {
  const result = ok({ value: 42 });
  const mapped = result.map(v => v.value * 2);
  assertEquals(mapped.unwrap(), 84);
});
```

### 4. Error Recovery Tests
```typescript
Deno.test("orElse provides fallback for errors", async () => {
  const result = await loadConfig("missing.yaml")
    .orElse(() => loadConfig("default.yaml"));
  
  assertEquals(result.isOk(), true);
});
```

## Conversion Checklist

- [ ] Replace all `assertRejects` with Result error checks
- [ ] Convert `assertEquals` for values to Result unwrap patterns
- [ ] Add Result-specific test cases (unwrap safety, chaining, mapping)
- [ ] Update imports to include Result types
- [ ] Add type annotations for Result returns
- [ ] Document error code expectations in tests