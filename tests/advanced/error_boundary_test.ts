import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Result } from "../../src/types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "../../src/errors/unified_errors.ts";

Deno.test("Result error boundary with nested async operations", async () => {
  // Simulate complex nested async operations
  const loadプロファイルDependencies = async (
    profileName: string
  ): Promise<Result<string[], UnifiedError>> => {
    // Level 1: Validate profile name
    if (!/^[a-zA-Z0-9-]+$/.test(profileName)) {
      return Result.err(ErrorFactories.invalidProfileName(profileName));
    }
    
    // Level 2: Load base config
    const baseResult = await Result.fromPromise(
      (async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        if (profileName === "error-profile") {
          throw new Error("Base config load failed");
        }
        return `base-${profileName}`;
      })(),
      (err) => ErrorFactories.configFileNotFound(`${profileName}/base.yml`, "app")
    );
    
    if (Result.isErr(baseResult)) {
      return baseResult;
    }
    
    // Level 3: Load extensions
    const extensionResults = await Promise.all([
      Result.fromPromise(
        (async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          if (profileName === "partial-error") {
            throw new Error("Extension 1 failed");
          }
          return `ext1-${profileName}`;
        })(),
        (err) => ErrorFactories.fileSystemError("read", `${profileName}/ext1.yml`, err instanceof Error ? err.message : String(err))
      ),
      Result.fromPromise(
        (async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          return `ext2-${profileName}`;
        })(),
        (err) => ErrorFactories.fileSystemError("read", `${profileName}/ext2.yml`, err instanceof Error ? err.message : String(err))
      ),
    ]);
    
    // Combine all results
    const allExtensions = Result.all(extensionResults);
    if (Result.isErr(allExtensions)) {
      return allExtensions;
    }
    
    return Result.ok([baseResult.data, ...allExtensions.data]);
  };
  
  // Test successful case
  const successResult = await loadプロファイルDependencies("production");
  assertEquals(Result.isOk(successResult), true);
  if (Result.isOk(successResult)) {
    assertEquals(successResult.data.length, 3);
    assertEquals(successResult.data[0], "base-production");
  }
  
  // Test validation error
  const validationError = await loadプロファイルDependencies("invalid@name");
  assertEquals(Result.isErr(validationError), true);
  if (Result.isErr(validationError)) {
    assertEquals(validationError.error.kind, "INVALID_PROFILE_NAME");
  }
  
  // Test base config error
  const baseError = await loadプロファイルDependencies("error-profile");
  assertEquals(Result.isErr(baseError), true);
  if (Result.isErr(baseError)) {
    assertEquals(baseError.error.kind, "CONFIG_FILE_NOT_FOUND");
  }
  
  // Test extension error (first error wins)
  const extensionError = await loadプロファイルDependencies("partial-error");
  assertEquals(Result.isErr(extensionError), true);
  if (Result.isErr(extensionError)) {
    assertEquals(extensionError.error.kind, "FILE_SYSTEM_ERROR");
  }
});

Deno.test("Result error recovery patterns", async () => {
  interface ConfigWithFallback {
    value: string;
    source: "primary" | "fallback" | "default";
  }
  
  const loadWithFallback = async (
    primaryPath: string,
    fallbackPath: string
  ): Promise<Result<ConfigWithFallback, UnifiedError>> => {
    // Try primary source
    const primaryResult = await Result.fromPromise(
      (async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        if (primaryPath === "fail-primary") {
          throw new Error("Primary source unavailable");
        }
        return { value: `primary-${primaryPath}`, source: "primary" as const };
      })(),
      () => ErrorFactories.configFileNotFound(primaryPath, "app")
    );
    
    if (Result.isOk(primaryResult)) {
      return primaryResult;
    }
    
    // Try fallback source
    const fallbackResult = await Result.fromPromise(
      (async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        if (fallbackPath === "fail-fallback") {
          throw new Error("Fallback source unavailable");
        }
        return { value: `fallback-${fallbackPath}`, source: "fallback" as const };
      })(),
      () => ErrorFactories.configFileNotFound(fallbackPath, "user")
    );
    
    if (Result.isOk(fallbackResult)) {
      return fallbackResult;
    }
    
    // Use default
    return Result.ok({
      value: "default-config",
      source: "default"
    });
  };
  
  // Test primary success
  const primarySuccess = await loadWithFallback("valid-primary", "valid-fallback");
  assertEquals(Result.isOk(primarySuccess), true);
  if (Result.isOk(primarySuccess)) {
    assertEquals(primarySuccess.data.source, "primary");
  }
  
  // Test fallback success
  const fallbackSuccess = await loadWithFallback("fail-primary", "valid-fallback");
  assertEquals(Result.isOk(fallbackSuccess), true);
  if (Result.isOk(fallbackSuccess)) {
    assertEquals(fallbackSuccess.data.source, "fallback");
  }
  
  // Test default fallback
  const defaultFallback = await loadWithFallback("fail-primary", "fail-fallback");
  assertEquals(Result.isOk(defaultFallback), true);
  if (Result.isOk(defaultFallback)) {
    assertEquals(defaultFallback.data.source, "default");
  }
});

Deno.test("Result error transformation chains", () => {
  // Complex error transformation
  const transformErrors = (
    result: Result<string, UnifiedError>
  ): Result<string, UnifiedError> => {
    return Result.mapErr(result, (error) => {
      // Transform specific error types
      switch (error.kind) {
        case "CONFIG_FILE_NOT_FOUND":
          return ErrorFactories.configValidationError("transformed", [{
            field: "file_path",
            value: error.path,
            expectedType: "existing file",
            actualType: "string",
            constraint: "ファイルが見つかりません。設定プロファイルを確認してください。",
          }]);
        
        case "INVALID_PROFILE_NAME":
          return ErrorFactories.configValidationError("profile_validation", [{
            field: "profile_name",
            value: error.providedName,
            expectedType: "valid profile name",
            actualType: "string",
            constraint: `プロファイル名「${error.providedName}」は無効です。使用可能: ${error.validExamples.join(", ")}`,
          }]);
        
        default:
          // Wrap unknown errors
          return ErrorFactories.unknown(error, "error_transformation");
      }
    });
  };
  
  // Test file not found transformation
  const fileNotFoundResult = Result.err(
    ErrorFactories.configFileNotFound("/missing/file.yml", "app")
  );
  const transformedFileError = transformErrors(fileNotFoundResult);
  
  assertEquals(Result.isErr(transformedFileError), true);
  if (Result.isErr(transformedFileError)) {
    assertEquals(transformedFileError.error.kind, "CONFIG_VALIDATION_ERROR");
    assertEquals((transformedFileError.error as any).violations[0].constraint?.includes("ファイルが見つかりません"), true);
  }
  
  // Test profile name transformation
  const profileErrorResult = Result.err(
    ErrorFactories.invalidProfileName("bad@profile")
  );
  const transformedProfileError = transformErrors(profileErrorResult);
  
  assertEquals(Result.isErr(transformedProfileError), true);
  if (Result.isErr(transformedProfileError)) {
    assertEquals(transformedProfileError.error.kind, "CONFIG_VALIDATION_ERROR");
    assertEquals((transformedProfileError.error as any).violations[0].constraint?.includes("プロファイル名"), true);
  }
});

Deno.test("Result concurrent error handling", async () => {
  // Simulate concurrent operations with different error rates
  const createOperation = (
    name: string,
    errorRate: number,
    delay: number
  ) => async (): Promise<Result<string, UnifiedError>> => {
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (Math.random() < errorRate) {
      return Result.err(
        ErrorFactories.fileSystemError("read", `/path/${name}`, "Simulated failure")
      );
    }
    
    return Result.ok(`result-${name}`);
  };
  
  // Create multiple operations
  const operations = [
    createOperation("op1", 0.0, 10),  // Always succeeds
    createOperation("op2", 0.0, 15),  // Always succeeds
    createOperation("op3", 0.0, 5),   // Always succeeds
  ];
  
  // Run all operations concurrently
  const results = await Promise.all(operations.map(op => op()));
  const combined = Result.all(results);
  
  // Should succeed since error rate is 0
  assertEquals(Result.isOk(combined), true);
  if (Result.isOk(combined)) {
    assertEquals(combined.data.length, 3);
    assertEquals(combined.data[0], "result-op1");
  }
  
  // Test with one guaranteed failure
  const failingOperations = [
    createOperation("good1", 0.0, 5),
    createOperation("fail", 1.0, 10),  // Always fails
    createOperation("good2", 0.0, 15),
  ];
  
  const failingResults = await Promise.all(failingOperations.map(op => op()));
  const failingCombined = Result.all(failingResults);
  
  // Should fail fast
  assertEquals(Result.isErr(failingCombined), true);
  if (Result.isErr(failingCombined)) {
    assertEquals(failingCombined.error.kind, "FILE_SYSTEM_ERROR");
  }
});

Deno.test("Result memory safety with large error chains", () => {
  // Test that error chains don't cause memory leaks
  let currentResult: Result<number, UnifiedError> = Result.ok(0);
  
  // Create a long chain of operations
  for (let i = 0; i < 1000; i++) {
    currentResult = Result.flatMap(currentResult, (value) => {
      if (value >= 500) {
        return Result.err(
          ErrorFactories.configValidationError(`step-${i}`, [{
            field: "value",
            value: value,
            expectedType: "number < 500",
            actualType: "number",
            constraint: `Value ${value} exceeds limit at step ${i}`,
          }])
        );
      }
      return Result.ok(value + 1);
    });
    
    // Early termination on error
    if (Result.isErr(currentResult)) {
      break;
    }
  }
  
  // Should have failed at step 500
  assertEquals(Result.isErr(currentResult), true);
  if (Result.isErr(currentResult)) {
    assertEquals(currentResult.error.kind, "CONFIG_VALIDATION_ERROR");
    assertEquals((currentResult.error as any).violations[0].value, 500);
  }
});

Deno.test("Result with プロファイル-specific error contexts", () => {
  interface プロファイルContext {
    name: string;
    environment: "development" | "staging" | "production";
    features: string[];
  }
  
  const validateプロファイルContext = (
    context: プロファイルContext
  ): Result<プロファイルContext, UnifiedError> => {
    const errors: UnifiedError[] = [];
    
    // Validate name
    if (!/^[a-zA-Z0-9-]+$/.test(context.name)) {
      errors.push(ErrorFactories.invalidProfileName(context.name));
    }
    
    // Validate environment-specific rules
    switch (context.environment) {
      case "production":
        if (context.features.includes("debug")) {
          errors.push(ErrorFactories.configValidationError("production_profile", [{
            field: "features",
            value: context.features,
            expectedType: "production-safe features",
            actualType: "string[]",
            constraint: "本番環境プロファイルではデバッグ機能は無効化する必要があります",
          }]));
        }
        break;
        
      case "development":
        if (!context.features.includes("debug")) {
          errors.push(ErrorFactories.configValidationError("development_profile", [{
            field: "features",
            value: context.features,
            expectedType: "development features",
            actualType: "string[]",
            constraint: "開発環境プロファイルではデバッグ機能を有効化することを推奨します",
          }]));
        }
        break;
    }
    
    // Return first error or success
    if (errors.length > 0) {
      return Result.err(errors[0]);
    }
    
    return Result.ok(context);
  };
  
  // Test production with debug (should fail)
  const prodWithDebug = validateプロファイルContext({
    name: "production",
    environment: "production",
    features: ["monitoring", "debug"] // Invalid for production
  });
  
  assertEquals(Result.isErr(prodWithDebug), true);
  if (Result.isErr(prodWithDebug)) {
    assertEquals((prodWithDebug.error as any).violations[0].constraint?.includes("本番環境"), true);
  }
  
  // Test development without debug (should fail with warning)
  const devWithoutDebug = validateプロファイルContext({
    name: "development",
    environment: "development",
    features: ["hot-reload"] // Missing debug
  });
  
  assertEquals(Result.isErr(devWithoutDebug), true);
  if (Result.isErr(devWithoutDebug)) {
    assertEquals((devWithoutDebug.error as any).violations[0].constraint?.includes("開発環境"), true);
  }
  
  // Test valid configuration
  const validConfig = validateプロファイルContext({
    name: "staging-v2",
    environment: "staging",
    features: ["monitoring", "logging"]
  });
  
  assertEquals(Result.isOk(validConfig), true);
});

Deno.test("Result error boundary stress test", async () => {
  // Stress test with many concurrent operations
  const stressOperations = Array.from({ length: 100 }, (_, i) => 
    Result.fromPromise(
      (async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        
        // 10% chance of failure
        if (Math.random() < 0.1) {
          throw new Error(`Operation ${i} failed`);
        }
        
        return `success-${i}`;
      })(),
      (err) => ErrorFactories.unknownError(err, `operation-${i}`)
    )
  );
  
  const results = await Promise.all(stressOperations);
  
  // Count successes and failures
  const successes = results.filter(Result.isOk).length;
  const failures = results.filter(Result.isErr).length;
  
  assertEquals(successes + failures, 100);
  
  // Most should succeed (expected ~90)
  assertEquals(successes >= 80, true, `Expected ~90 successes, got ${successes}`);
  assertEquals(failures >= 5, true, `Expected ~10 failures, got ${failures}`);
});