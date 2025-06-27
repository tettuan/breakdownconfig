import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Result } from "../../src/types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "../../src/errors/unified_errors.ts";

Deno.test("Result parallel execution patterns", async () => {
  // Simulate async operations
  const loadプロファイル = async (name: string): Promise<Result<string, UnifiedError>> => {
    await new Promise(resolve => setTimeout(resolve, 10));
    
    if (name === "invalid") {
      return Result.err(ErrorFactories.invalidProfileName(name));
    }
    return Result.ok(`${name}-profile-loaded`);
  };
  
  // Parallel execution with Promise.all
  const results = await Promise.all([
    loadプロファイル("development"),
    loadプロファイル("staging"),
    loadプロファイル("production"),
  ]);
  
  // Convert to single Result
  const combined = Result.all(results);
  
  assertEquals(Result.isOk(combined), true);
  if (Result.isOk(combined)) {
    assertEquals(combined.data.length, 3);
    assertEquals(combined.data[0], "development-profile-loaded");
    assertEquals(combined.data[1], "staging-profile-loaded");
    assertEquals(combined.data[2], "production-profile-loaded");
  }
});

Deno.test("Result error aggregation from parallel operations", async () => {
  const validatePath = async (path: string): Promise<Result<string, UnifiedError>> => {
    await new Promise(resolve => setTimeout(resolve, 5));
    
    if (path.includes("..")) {
      return Result.err(
        ErrorFactories.pathValidationError(path, "PATH_TRAVERSAL", "config_path")
      );
    }
    if (path.startsWith("/")) {
      return Result.err(
        ErrorFactories.pathValidationError(path, "ABSOLUTE_PATH_NOT_ALLOWED", "config_path")
      );
    }
    return Result.ok(path);
  };
  
  const results = await Promise.all([
    validatePath("./config/app.yml"),
    validatePath("../../../etc/passwd"),
    validatePath("/etc/shadow"),
    validatePath("./valid/path"),
  ]);
  
  const combined = Result.all(results);
  
  // Should return first error
  assertEquals(Result.isErr(combined), true);
  if (Result.isErr(combined)) {
    assertEquals(combined.error.kind, "PATH_VALIDATION_ERROR");
    assertEquals(combined.error.reason, "PATH_TRAVERSAL");
  }
});

Deno.test("Result complex プロファイル loading with dependencies", async () => {
  interface プロファイル {
    name: string;
    baseDir: string;
    config: Record<string, unknown>;
  }
  
  // Step 1: Validate プロファイル name
  const validateプロファイル名 = (name: string): Result<string, UnifiedError> => {
    if (!name) {
      return Result.err(
        ErrorFactories.requiredFieldMissing("profile_name")
      );
    }
    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      return Result.err(ErrorFactories.invalidProfileName(name));
    }
    return Result.ok(name);
  };
  
  // Step 2: Load プロファイル config
  const loadプロファイルConfig = async (name: string): Promise<Result<Record<string, unknown>, UnifiedError>> => {
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Simulate config loading
    return Result.ok({
      theme: "dark",
      language: "ja",
      features: ["auto-save", "syntax-highlight"],
    });
  };
  
  // Step 3: Validate paths
  const validatePaths = (baseDir: string): Result<string, UnifiedError> => {
    if (baseDir.includes("..")) {
      return Result.err(
        ErrorFactories.pathValidationError(baseDir, "PATH_TRAVERSAL", "base_dir")
      );
    }
    return Result.ok(baseDir);
  };
  
  // Compose operations
  const loadプロファイル = async (
    name: string,
    baseDir: string,
  ): Promise<Result<プロファイル, UnifiedError>> => {
    // Validate name
    const nameResult = validateプロファイル名(name);
    if (!Result.isOk(nameResult)) {
      return nameResult;
    }
    
    // Validate paths
    const pathResult = validatePaths(baseDir);
    if (!Result.isOk(pathResult)) {
      return pathResult;
    }
    
    // Load config
    const configResult = await loadプロファイルConfig(name);
    if (!Result.isOk(configResult)) {
      return configResult;
    }
    
    return Result.ok({
      name: nameResult.data,
      baseDir: pathResult.data,
      config: configResult.data,
    });
  };
  
  // Test valid case
  const validResult = await loadプロファイル("production", "./profiles/prod");
  assertEquals(Result.isOk(validResult), true);
  if (Result.isOk(validResult)) {
    assertEquals(validResult.data.name, "production");
    assertEquals(validResult.data.baseDir, "./profiles/prod");
    assertEquals(validResult.data.config.language, "ja");
  }
  
  // Test invalid name
  const invalidNameResult = await loadプロファイル("prod@123", "./profiles/prod");
  assertEquals(Result.isErr(invalidNameResult), true);
  if (Result.isErr(invalidNameResult)) {
    assertEquals(invalidNameResult.error.kind, "INVALID_PROFILE_NAME");
  }
  
  // Test invalid path
  const invalidPathResult = await loadプロファイル("production", "../../../etc");
  assertEquals(Result.isErr(invalidPathResult), true);
  if (Result.isErr(invalidPathResult)) {
    assertEquals(invalidPathResult.error.kind, "PATH_VALIDATION_ERROR");
    assertEquals(invalidPathResult.error.reason, "PATH_TRAVERSAL");
  }
});

Deno.test("Result error transformation and recovery", () => {
  const tryParse = (json: string): Result<unknown, UnifiedError> => {
    try {
      return Result.ok(JSON.parse(json));
    } catch (e) {
      return Result.err(
        ErrorFactories.configParseError(
          "inline",
          e instanceof Error ? e.message : String(e)
        )
      );
    }
  };
  
  // Test with recovery strategy
  const parseWithDefault = <T>(json: string, defaultValue: T): T => {
    const result = tryParse(json);
    
    if (Result.isErr(result)) {
      // Log error but recover with default
      console.debug(`Parse error: ${result.error.message}, using default`);
      return defaultValue;
    }
    
    return result.data as T;
  };
  
  // Valid JSON
  const valid = parseWithDefault('{"key": "value"}', {});
  assertEquals(valid, { key: "value" });
  
  // Invalid JSON - recovers with default
  const invalid = parseWithDefault('invalid json', { default: true });
  assertEquals(invalid, { default: true });
});

Deno.test("Result type narrowing with プロファイル validation", () => {
  type ValidatedプロファイルName = string & { __brand: "ValidatedProfileName" };
  
  const validateAndBrandプロファイル = (
    name: string
  ): Result<ValidatedプロファイルName, UnifiedError> => {
    if (!name || name.trim() === "") {
      return Result.err(
        ErrorFactories.configValidationError("profile", [{
          field: "name",
          value: name,
          expectedType: "non-empty string",
          actualType: "string",
          constraint: "プロファイル名は必須です",
        }])
      );
    }
    
    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      return Result.err(ErrorFactories.invalidProfileName(name));
    }
    
    // Type assertion after validation
    return Result.ok(name as ValidatedプロファイルName);
  };
  
  const useプロファイル = (name: ValidatedプロファイルName): string => {
    // Can safely use the validated name
    return `Using profile: ${name}`;
  };
  
  const result = validateAndBrandプロファイル("prod-v2");
  if (Result.isOk(result)) {
    const message = useプロファイル(result.data);
    assertEquals(message, "Using profile: prod-v2");
  }
});

Deno.test("Result monadic composition with flatMap chains", async () => {
  interface Config {
    プロファイル: string;
    paths: {
      working_dir: string;
      prompt_dir: string;
      schema_dir: string;
    };
  }
  
  const steps = {
    validateプロファイル: (input: unknown): Result<string, UnifiedError> => {
      if (typeof input !== "string") {
        return Result.err(
          ErrorFactories.typeMismatch("profile", "string", typeof input, input)
        );
      }
      if (!/^[a-zA-Z0-9-]+$/.test(input)) {
        return Result.err(ErrorFactories.invalidProfileName(input));
      }
      return Result.ok(input);
    },
    
    loadPaths: async (プロファイル: string): Promise<Result<Config["paths"], UnifiedError>> => {
      await new Promise(resolve => setTimeout(resolve, 5));
      
      return Result.ok({
        working_dir: `./${プロファイル}/work`,
        prompt_dir: `./${プロファイル}/prompts`,
        schema_dir: `./${プロファイル}/schemas`,
      });
    },
    
    validatePaths: (paths: Config["paths"]): Result<Config["paths"], UnifiedError> => {
      for (const [key, path] of Object.entries(paths)) {
        if (path.includes("..")) {
          return Result.err(
            ErrorFactories.pathValidationError(path, "PATH_TRAVERSAL", key)
          );
        }
      }
      return Result.ok(paths);
    },
    
    createConfig: (プロファイル: string, paths: Config["paths"]): Result<Config, UnifiedError> => {
      return Result.ok({ プロファイル, paths });
    }
  };
  
  // Compose the operations
  const loadConfig = async (input: unknown): Promise<Result<Config, UnifiedError>> => {
    const プロファイル = steps.validateプロファイル(input);
    if (!Result.isOk(プロファイル)) return プロファイル;
    
    const paths = await steps.loadPaths(プロファイル.data);
    if (!Result.isOk(paths)) return paths;
    
    const validatedPaths = steps.validatePaths(paths.data);
    if (!Result.isOk(validatedPaths)) return validatedPaths;
    
    return steps.createConfig(プロファイル.data, validatedPaths.data);
  };
  
  // Test successful flow
  const config = await loadConfig("production");
  assertEquals(Result.isOk(config), true);
  if (Result.isOk(config)) {
    assertEquals(config.data.プロファイル, "production");
    assertEquals(config.data.paths.working_dir, "./production/work");
  }
  
  // Test validation failure
  const invalid = await loadConfig("prod@123");
  assertEquals(Result.isErr(invalid), true);
  if (Result.isErr(invalid)) {
    assertEquals(invalid.error.kind, "INVALID_PROFILE_NAME");
  }
});

Deno.test("Result error collection and reporting", () => {
  interface ValidationReport {
    errors: UnifiedError[];
    warnings: string[];
    passed: boolean;
  }
  
  const validateConfiguration = (config: Record<string, unknown>): ValidationReport => {
    const errors: UnifiedError[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    const requiredFields = ["working_dir", "app_prompt", "app_schema"];
    for (const field of requiredFields) {
      if (!(field in config)) {
        errors.push(ErrorFactories.requiredFieldMissing(field, "config"));
      }
    }
    
    // Validate プロファイル if present
    if ("profile" in config) {
      const profileResult = Result.err<string, UnifiedError>(
        ErrorFactories.invalidProfileName(String(config.profile))
      );
      if (Result.isErr(profileResult)) {
        errors.push(profileResult.error);
      }
    }
    
    // Check for deprecated fields
    if ("old_field" in config) {
      warnings.push("Field 'old_field' is deprecated, use 'new_field' instead");
    }
    
    return {
      errors,
      warnings,
      passed: errors.length === 0,
    };
  };
  
  // Test with invalid config
  const report = validateConfiguration({
    profile: "invalid@profile",
    old_field: "value",
  });
  
  assertEquals(report.passed, false);
  assertEquals(report.errors.length, 4); // 3 missing + 1 invalid profile
  assertEquals(report.warnings.length, 1);
  assertEquals(report.errors[0].kind, "REQUIRED_FIELD_MISSING");
});

Deno.test("Result async error boundaries", async () => {
  const riskyOperation = async (): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 10));
    throw new Error("Simulated async error");
  };
  
  const safeOperation = async (): Promise<Result<string, UnifiedError>> => {
    return Result.fromPromise(
      riskyOperation(),
      (err) => ErrorFactories.unknown(err, "async_operation")
    );
  };
  
  const result = await safeOperation();
  assertEquals(Result.isErr(result), true);
  if (Result.isErr(result)) {
    assertEquals(result.error.kind, "UNKNOWN_ERROR");
    assertEquals((result.error as any).context, "async_operation");
  }
});

Deno.test("Result performance with large arrays", () => {
  // Create large array of Results
  const results: Result<number, UnifiedError>[] = [];
  for (let i = 0; i < 1000; i++) {
    results.push(Result.ok(i));
  }
  
  const start = performance.now();
  const combined = Result.all(results);
  const duration = performance.now() - start;
  
  assertEquals(Result.isOk(combined), true);
  if (Result.isOk(combined)) {
    assertEquals(combined.data.length, 1000);
    assertEquals(combined.data[0], 0);
    assertEquals(combined.data[999], 999);
  }
  
  // Performance should be reasonable
  assertEquals(duration < 100, true, `Operation took ${duration}ms, expected < 100ms`);
});