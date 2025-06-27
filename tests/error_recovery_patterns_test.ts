/**
 * Error Recovery Patterns Test
 *
 * Purpose:
 * Test comprehensive error recovery strategies for Result<T, E> type
 * - Fallback mechanisms and default value strategies
 * - Graceful degradation patterns
 * - Retry patterns with exponential backoff
 * - Circuit breaker patterns for error handling
 * - Multi-source fallback chains
 *
 * Recovery Strategies:
 * 1. Simple fallback with Result.unwrapOr
 * 2. Chained fallback sources (primary → secondary → default)
 * 3. Conditional recovery based on error type
 * 4. Partial recovery with best-effort results
 * 5. Async recovery with timeout handling
 * 6. Recovery with error logging and monitoring
 */

import { assertEquals, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Result } from "../src/types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "../src/errors/unified_errors.ts";
import {
  assertResultErr,
  assertResultErrorKind,
  assertResultOk,
} from "./test_helpers/result_test_helpers.ts";

// Test data structures
interface ConfigSource {
  name: string;
  priority: number;
  available: boolean;
}

interface RecoveryConfig {
  workingDir: string;
  prompt: string;
  schema: string;
  source: string;
}

interface FallbackChain<T> {
  primary: () => Result<T, UnifiedError>;
  secondary: () => Result<T, UnifiedError>;
  tertiary: () => Result<T, UnifiedError>;
  default: () => T;
}

describe("Error Recovery Patterns", () => {
  describe("Simple Fallback Strategies", () => {
    it("should use fallback values with Result.unwrapOr", () => {
      const loadConfig = (source: string): Result<RecoveryConfig, UnifiedError> => {
        if (source === "broken") {
          return Result.err(ErrorFactories.configFileNotFound("broken.yaml", "app"));
        }
        return Result.ok({
          workingDir: "./src",
          prompt: "app_prompt.md",
          schema: "app_schema.json",
          source,
        });
      };

      const defaultConfig: RecoveryConfig = {
        workingDir: "./default",
        prompt: "default_prompt.md",
        schema: "default_schema.json",
        source: "default",
      };

      // Test successful loading (no fallback needed)
      const successResult = loadConfig("valid");
      const config = Result.unwrapOr(successResult, defaultConfig);
      assertEquals(config.source, "valid");

      // Test fallback usage
      const errorResult = loadConfig("broken");
      const fallbackConfig = Result.unwrapOr(errorResult, defaultConfig);
      assertEquals(fallbackConfig.source, "default");
    });

    it("should handle multiple fallback layers", () => {
      const sources = ["primary", "secondary", "tertiary"];
      const availableSources = new Set(["tertiary"]); // Only tertiary is available

      const loadFromSource = (source: string): Result<string, UnifiedError> => {
        if (!availableSources.has(source)) {
          return Result.err(ErrorFactories.configFileNotFound(`${source}.yaml`, "app"));
        }
        return Result.ok(`config from ${source}`);
      };

      const loadWithFallback = (): Result<string, UnifiedError> => {
        for (const source of sources) {
          const result = loadFromSource(source);
          if (Result.isOk(result)) {
            return result;
          }
        }
        return Result.err(ErrorFactories.configNotLoaded("All sources failed"));
      };

      const result = loadWithFallback();
      assertEquals(assertResultOk(result), "config from tertiary");

      // Test all sources unavailable
      availableSources.clear();
      const allFailResult = loadWithFallback();
      assertResultErrorKind(allFailResult, "CONFIG_NOT_LOADED");
    });
  });

  describe("Chained Recovery Patterns", () => {
    it("should implement hierarchical fallback chain", () => {
      const createRecoveryChain = (
        primaryAvailable: boolean,
        secondaryAvailable: boolean,
        tertiaryAvailable: boolean,
      ): FallbackChain<RecoveryConfig> => ({
        primary: () =>
          primaryAvailable
            ? Result.ok({
              workingDir: "./src",
              prompt: "app.md",
              schema: "app.json",
              source: "primary",
            })
            : Result.err(ErrorFactories.configFileNotFound("primary.yaml", "app")),

        secondary: () =>
          secondaryAvailable
            ? Result.ok({
              workingDir: "./backup",
              prompt: "backup.md",
              schema: "backup.json",
              source: "secondary",
            })
            : Result.err(ErrorFactories.configFileNotFound("secondary.yaml", "app")),

        tertiary: () =>
          tertiaryAvailable
            ? Result.ok({
              workingDir: "./fallback",
              prompt: "fallback.md",
              schema: "fallback.json",
              source: "tertiary",
            })
            : Result.err(ErrorFactories.configFileNotFound("tertiary.yaml", "app")),

        default: () => ({
          workingDir: "./default",
          prompt: "default.md",
          schema: "default.json",
          source: "default",
        }),
      });

      const executeRecoveryChain = (chain: FallbackChain<RecoveryConfig>): RecoveryConfig => {
        const primaryResult = chain.primary();
        if (Result.isOk(primaryResult)) return primaryResult.data;

        const secondaryResult = chain.secondary();
        if (Result.isOk(secondaryResult)) return secondaryResult.data;

        const tertiaryResult = chain.tertiary();
        if (Result.isOk(tertiaryResult)) return tertiaryResult.data;

        return chain.default();
      };

      // Test primary success
      const primaryChain = createRecoveryChain(true, false, false);
      const primaryResult = executeRecoveryChain(primaryChain);
      assertEquals(primaryResult.source, "primary");

      // Test secondary fallback
      const secondaryChain = createRecoveryChain(false, true, false);
      const secondaryResult = executeRecoveryChain(secondaryChain);
      assertEquals(secondaryResult.source, "secondary");

      // Test tertiary fallback
      const tertiaryChain = createRecoveryChain(false, false, true);
      const tertiaryResult = executeRecoveryChain(tertiaryChain);
      assertEquals(tertiaryResult.source, "tertiary");

      // Test default fallback
      const defaultChain = createRecoveryChain(false, false, false);
      const defaultResult = executeRecoveryChain(defaultChain);
      assertEquals(defaultResult.source, "default");
    });

    it("should handle conditional recovery based on error type", () => {
      const loadConfigWithRecovery = (scenario: string): Result<RecoveryConfig, UnifiedError> => {
        const attemptLoad = (): Result<RecoveryConfig, UnifiedError> => {
          switch (scenario) {
            case "not_found":
              return Result.err(ErrorFactories.configFileNotFound("config.yaml", "app"));
            case "parse_error":
              return Result.err(ErrorFactories.configParseError("config.yaml", "Invalid YAML"));
            case "validation_error":
              return Result.err(ErrorFactories.configValidationError("config.yaml", [
                { field: "working_dir", message: "Required", value: null },
              ]));
            case "permission_error":
              return Result.err(
                ErrorFactories.unknown(new Error("Permission denied"), "loadConfig"),
              );
            default:
              return Result.ok({
                workingDir: "./src",
                prompt: "app.md",
                schema: "app.json",
                source: "loaded",
              });
          }
        };

        const primaryResult = attemptLoad();
        if (Result.isOk(primaryResult)) return primaryResult;

        const error = primaryResult.error;

        // Conditional recovery based on error type
        switch (error.kind) {
          case "CONFIG_FILE_NOT_FOUND":
            // Try to create default config file
            return Result.ok({
              workingDir: "./generated",
              prompt: "generated.md",
              schema: "generated.json",
              source: "generated",
            });

          case "CONFIG_PARSE_ERROR":
            // Use last known good config
            return Result.ok({
              workingDir: "./backup",
              prompt: "backup.md",
              schema: "backup.json",
              source: "backup",
            });

          case "CONFIG_VALIDATION_ERROR":
            // Use minimal valid config
            return Result.ok({
              workingDir: "./minimal",
              prompt: "minimal.md",
              schema: "minimal.json",
              source: "minimal",
            });

          default:
            // For other errors, propagate the error
            return primaryResult;
        }
      };

      // Test file not found recovery
      const notFoundResult = loadConfigWithRecovery("not_found");
      assertEquals(assertResultOk(notFoundResult).source, "generated");

      // Test parse error recovery
      const parseErrorResult = loadConfigWithRecovery("parse_error");
      assertEquals(assertResultOk(parseErrorResult).source, "backup");

      // Test validation error recovery
      const validationErrorResult = loadConfigWithRecovery("validation_error");
      assertEquals(assertResultOk(validationErrorResult).source, "minimal");

      // Test unrecoverable error propagation
      const permissionErrorResult = loadConfigWithRecovery("permission_error");
      assertResultErrorKind(permissionErrorResult, "UNKNOWN_ERROR");
    });
  });

  describe("Partial Recovery Patterns", () => {
    it("should handle partial config recovery with best-effort results", () => {
      interface PartialConfig {
        workingDir?: string;
        prompt?: string;
        schema?: string;
        errors: string[];
      }

      const loadPartialConfig = (
        workingDirAvailable: boolean,
        promptAvailable: boolean,
        schemaAvailable: boolean,
      ): PartialConfig => {
        const config: PartialConfig = { errors: [] };

        // Try to load working directory
        const workingDirResult = workingDirAvailable ? Result.ok("./src") : Result.err(
          ErrorFactories.pathValidationError("./invalid", "INVALID_CHARACTERS", "working_dir"),
        );

        if (Result.isOk(workingDirResult)) {
          config.workingDir = workingDirResult.data;
        } else {
          config.errors.push(`Working directory: ${workingDirResult.error.message}`);
        }

        // Try to load prompt
        const promptResult = promptAvailable
          ? Result.ok("app_prompt.md")
          : Result.err(ErrorFactories.configFileNotFound("prompt.md", "app"));

        if (Result.isOk(promptResult)) {
          config.prompt = promptResult.data;
        } else {
          config.errors.push(`Prompt: ${promptResult.error.message}`);
        }

        // Try to load schema
        const schemaResult = schemaAvailable
          ? Result.ok("app_schema.json")
          : Result.err(ErrorFactories.configParseError("schema.json", "Invalid JSON"));

        if (Result.isOk(schemaResult)) {
          config.schema = schemaResult.data;
        } else {
          config.errors.push(`Schema: ${schemaResult.error.message}`);
        }

        return config;
      };

      // Test full success
      const fullConfig = loadPartialConfig(true, true, true);
      assertEquals(fullConfig.errors.length, 0);
      assertEquals(fullConfig.workingDir, "./src");
      assertEquals(fullConfig.prompt, "app_prompt.md");
      assertEquals(fullConfig.schema, "app_schema.json");

      // Test partial success
      const partialConfig = loadPartialConfig(true, false, true);
      assertEquals(partialConfig.errors.length, 1);
      assertEquals(partialConfig.workingDir, "./src");
      assertEquals(partialConfig.prompt, undefined);
      assertEquals(partialConfig.schema, "app_schema.json");

      // Test complete failure
      const failedConfig = loadPartialConfig(false, false, false);
      assertEquals(failedConfig.errors.length, 3);
      assertEquals(failedConfig.workingDir, undefined);
      assertEquals(failedConfig.prompt, undefined);
      assertEquals(failedConfig.schema, undefined);
    });

    it("should aggregate partial results with error reporting", () => {
      const loadMultipleConfigs = (configPaths: string[]): {
        successful: RecoveryConfig[];
        failed: { path: string; error: UnifiedError }[];
      } => {
        const successful: RecoveryConfig[] = [];
        const failed: { path: string; error: UnifiedError }[] = [];

        for (const path of configPaths) {
          const result = path.includes("error")
            ? Result.err(ErrorFactories.configFileNotFound(path, "app"))
            : Result.ok({
              workingDir: `./src/${path}`,
              prompt: `${path}_prompt.md`,
              schema: `${path}_schema.json`,
              source: path,
            });

          if (Result.isOk(result)) {
            successful.push(result.data);
          } else {
            failed.push({ path, error: result.error });
          }
        }

        return { successful, failed };
      };

      const configPaths = ["app1", "error_app2", "app3", "error_app4", "app5"];
      const result = loadMultipleConfigs(configPaths);

      assertEquals(result.successful.length, 3);
      assertEquals(result.failed.length, 2);
      assertEquals(result.successful[0].source, "app1");
      assertEquals(result.failed[0].path, "error_app2");
    });
  });

  describe("Async Recovery Patterns", () => {
    it("should handle async recovery with timeout", async () => {
      const loadConfigWithTimeout = async (
        delay: number,
        shouldFail: boolean,
        timeoutMs: number,
      ): Promise<Result<RecoveryConfig, UnifiedError>> => {
        const loadOperation = new Promise<RecoveryConfig>((resolve, reject) => {
          setTimeout(() => {
            if (shouldFail) {
              reject(new Error("Load operation failed"));
            } else {
              resolve({
                workingDir: "./async",
                prompt: "async.md",
                schema: "async.json",
                source: "async",
              });
            }
          }, delay);
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Operation timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        });

        try {
          const result = await Promise.race([loadOperation, timeoutPromise]);
          return Result.ok(result);
        } catch (error) {
          return Result.err(ErrorFactories.unknown(error, "loadConfigWithTimeout"));
        }
      };

      const loadWithRecovery = async (
        primaryDelay: number,
        primaryShouldFail: boolean,
        timeoutMs: number,
      ): Promise<RecoveryConfig> => {
        // Try primary source
        const primaryResult = await loadConfigWithTimeout(
          primaryDelay,
          primaryShouldFail,
          timeoutMs,
        );
        if (Result.isOk(primaryResult)) return primaryResult.data;

        // Fallback to immediate default
        return {
          workingDir: "./fallback",
          prompt: "fallback.md",
          schema: "fallback.json",
          source: "fallback",
        };
      };

      // Test successful async load
      const successResult = await loadWithRecovery(10, false, 100);
      assertEquals(successResult.source, "async");

      // Test timeout recovery
      const timeoutResult = await loadWithRecovery(200, false, 100);
      assertEquals(timeoutResult.source, "fallback");

      // Test failure recovery
      const failureResult = await loadWithRecovery(10, true, 100);
      assertEquals(failureResult.source, "fallback");
    });

    it("should handle concurrent recovery attempts", async () => {
      const sources = ["source1", "source2", "source3"];
      const delays = [100, 50, 75]; // source2 is fastest
      const availableSources = new Set(["source2", "source3"]);

      const loadFromSource = async (
        source: string,
        delay: number,
      ): Promise<Result<string, UnifiedError>> => {
        await new Promise((resolve) => setTimeout(resolve, delay));

        if (!availableSources.has(source)) {
          return Result.err(ErrorFactories.configFileNotFound(`${source}.yaml`, "app"));
        }

        return Result.ok(`config from ${source}`);
      };

      const loadWithConcurrentRecovery = async (): Promise<string> => {
        const loadTasks = sources.map((source, index) => loadFromSource(source, delays[index]));

        // Use Promise.allSettled to get all results
        const results = await Promise.allSettled(loadTasks);

        // Find first successful result
        for (const result of results) {
          if (result.status === "fulfilled" && Result.isOk(result.value)) {
            return result.value.data;
          }
        }

        // If all failed, return default
        return "default config";
      };

      const result = await loadWithConcurrentRecovery();
      assertEquals(result, "config from source2"); // Fastest available source

      // Test all sources unavailable
      availableSources.clear();
      const allFailResult = await loadWithConcurrentRecovery();
      assertEquals(allFailResult, "default config");
    });
  });

  describe("Advanced Recovery Patterns", () => {
    it("should implement circuit breaker pattern for error recovery", () => {
      class CircuitBreaker {
        private failures = 0;
        private readonly threshold = 3;
        private readonly resetTimeoutMs = 1000;
        private state: "closed" | "open" | "half-open" = "closed";
        private lastFailureTime = 0;

        async execute<T>(
          operation: () => Promise<Result<T, UnifiedError>>,
        ): Promise<Result<T, UnifiedError>> {
          if (this.state === "open") {
            if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
              this.state = "half-open";
            } else {
              return Result.err(ErrorFactories.unknown(
                new Error("Circuit breaker is open"),
                "circuit-breaker",
              ));
            }
          }

          try {
            const result = await operation();

            if (Result.isOk(result)) {
              this.onSuccess();
              return result;
            } else {
              this.onFailure();
              return result;
            }
          } catch (error) {
            this.onFailure();
            return Result.err(ErrorFactories.unknown(error, "circuit-breaker"));
          }
        }

        private onSuccess() {
          this.failures = 0;
          this.state = "closed";
        }

        private onFailure() {
          this.failures++;
          this.lastFailureTime = Date.now();

          if (this.failures >= this.threshold) {
            this.state = "open";
          }
        }

        getState() {
          return this.state;
        }
      }

      const circuitBreaker = new CircuitBreaker();
      let operationCallCount = 0;

      const flakyOperation = async (): Promise<Result<string, UnifiedError>> => {
        operationCallCount++;
        // Fail first 3 times, then succeed
        if (operationCallCount <= 3) {
          return Result.err(ErrorFactories.unknown(new Error("Operation failed"), "flaky"));
        }
        return Result.ok("success");
      };

      // Test circuit breaker opening after threshold failures
      for (let i = 0; i < 3; i++) {
        const result = await circuitBreaker.execute(flakyOperation);
        assertResultErr(result);
      }

      assertEquals(circuitBreaker.getState(), "open");

      // Test circuit breaker rejecting calls when open
      const rejectedResult = await circuitBreaker.execute(flakyOperation);
      const rejectedError = assertResultErr(rejectedResult);
      assertEquals(rejectedError.message, "Circuit breaker is open");

      // Wait for reset timeout and test half-open state
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const halfOpenResult = await circuitBreaker.execute(flakyOperation);
      assertEquals(assertResultOk(halfOpenResult), "success");
      assertEquals(circuitBreaker.getState(), "closed");
    });

    it("should handle retry patterns with exponential backoff", async () => {
      const retryWithBackoff = async <T>(
        operation: () => Promise<Result<T, UnifiedError>>,
        maxRetries: number = 3,
        baseDelayMs: number = 100,
      ): Promise<Result<T, UnifiedError>> => {
        let lastError: UnifiedError | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          if (attempt > 0) {
            // Exponential backoff: 100ms, 200ms, 400ms
            const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }

          const result = await operation();

          if (Result.isOk(result)) {
            return result;
          }

          lastError = result.error;

          // Don't retry for certain error types
          if (result.error.kind === "CONFIG_VALIDATION_ERROR") {
            return result;
          }
        }

        return Result.err(lastError!);
      };

      let attemptCount = 0;
      const unreliableOperation = async (): Promise<Result<string, UnifiedError>> => {
        attemptCount++;

        if (attemptCount < 3) {
          return Result.err(ErrorFactories.configFileNotFound("config.yaml", "app"));
        }

        return Result.ok("success after retries");
      };

      const result = await retryWithBackoff(unreliableOperation, 3, 10);
      assertEquals(assertResultOk(result), "success after retries");
      assertEquals(attemptCount, 3);

      // Test non-retryable error
      attemptCount = 0;
      const nonRetryableOperation = async (): Promise<Result<string, UnifiedError>> => {
        attemptCount++;
        return Result.err(ErrorFactories.configValidationError("config.yaml", [
          { field: "test", message: "Invalid", value: null },
        ]));
      };

      const nonRetryableResult = await retryWithBackoff(nonRetryableOperation, 3, 10);
      assertResultErrorKind(nonRetryableResult, "CONFIG_VALIDATION_ERROR");
      assertEquals(attemptCount, 1); // Should not retry validation errors
    });
  });
});
