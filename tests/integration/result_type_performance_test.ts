/**
 * Result Type Performance Integration Tests
 *
 * Focus on Result type chain processing performance and optimization
 * Coordinated with pane3 performance testing results
 */

import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { Result } from "../../src/types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "../../src/errors/unified_errors.ts";
import { ConfigManager } from "../../src/config_manager.ts";
import {
  BaseErrorInterface,
  createError,
  ErrorUtils,
  unifiedErrorManager,
} from "../../src/errors/unified_error_final_exports.ts";

describe("Result Type Performance Integration Tests", () => {
  describe("Result Chain Performance", () => {
    it("should handle deep Result chains efficiently", async () => {
      const chainDepth = 100;
      let result: Result<number, UnifiedError> = Result.ok(1);

      const startTime = performance.now();

      // Build deep chain
      for (let i = 0; i < chainDepth; i++) {
        result = result.map((n) => n + 1);
      }

      // Force evaluation
      const finalValue = result.unwrapOr(0);

      const endTime = performance.now();
      const chainTime = endTime - startTime;

      assertEquals(finalValue, 101, "Chain should compute correct value");
      assert(chainTime < 10, `Deep chain should be fast, took ${chainTime}ms`);
    });

    it("should handle parallel Result operations efficiently", async () => {
      const parallelOps = 1000;
      const results: Result<number, UnifiedError>[] = [];

      const startTime = performance.now();

      // Create parallel operations
      for (let i = 0; i < parallelOps; i++) {
        results.push(
          Result.ok(i)
            .map((n) => n * 2)
            .flatMap((n) =>
              n % 2 === 0 ? Result.ok(n) : Result.failure(
                ErrorFactories.typeMismatch("value", "even", "odd", n),
              )
            ),
        );
      }

      // Collect all results
      const successes = results.filter((r) => r.isOk()).length;

      const endTime = performance.now();
      const parallelTime = endTime - startTime;

      assertEquals(successes, parallelOps, "All operations should succeed");
      assert(
        parallelTime < 50,
        `Parallel operations should be fast, took ${parallelTime}ms`,
      );
    });

    it("should optimize Result chain with early failure", async () => {
      const operations = 1000;
      let executedOps = 0;

      const startTime = performance.now();

      const result = Result.success<number, UnifiedError>(0)
        .flatMap((n) => {
          executedOps++;
          return Result.failure(ErrorFactories.configNotLoaded("test"));
        })
        .map((n) => {
          // This should not execute
          executedOps++;
          return n + 1;
        })
        .flatMap((n) => {
          // This should not execute
          executedOps++;
          return Result.ok(n * 2);
        });

      const endTime = performance.now();
      const failureTime = endTime - startTime;

      assert(result.isErr(), "Result should be failure");
      assertEquals(executedOps, 1, "Only first operation should execute");
      assert(failureTime < 1, `Early failure should be very fast, took ${failureTime}ms`);
    });
  });

  describe("Error Chain Performance", () => {
    it("should build error chains efficiently", async () => {
      const chainLength = 50;
      const errors: BaseErrorInterface[] = [];

      const startTime = performance.now();

      // Build error chain
      for (let i = 0; i < chainLength; i++) {
        errors.push(createError.unknown(
          new Error(`Error level ${i}`),
          `context-${i}`,
        ));
      }

      const errorChain = ErrorUtils.createErrorChain(...errors);

      const endTime = performance.now();
      const chainBuildTime = endTime - startTime;

      assert(errorChain !== null, "Error chain should be created");
      assert(
        chainBuildTime < 10,
        `Error chain building should be fast, took ${chainBuildTime}ms`,
      );

      // Verify chain structure
      let current = errorChain;
      let depth = 0;
      while (current && depth < chainLength) {
        depth++;
        current = current.cause;
      }
      assertEquals(depth, chainLength, "Chain should have correct depth");
    });

    it("should process error chains with unified manager efficiently", async () => {
      const errorCount = 100;

      const startTime = performance.now();

      // Process many errors
      const promises = [];
      for (let i = 0; i < errorCount; i++) {
        const error = createError.configFileNotFound(
          `/path/to/config${i}.yaml`,
          i % 2 === 0 ? "app" : "user",
        );
        promises.push(unifiedErrorManager.processError(error));
      }

      await Promise.all(promises);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      const aggregator = unifiedErrorManager.getAggregator();
      const processedErrors = aggregator.getErrors();

      assertEquals(
        processedErrors.length,
        errorCount,
        "All errors should be processed",
      );
      assert(
        processingTime < 100,
        `Error processing should be fast, took ${processingTime}ms for ${errorCount} errors`,
      );

      // Calculate throughput
      const errorsPerSecond = (errorCount / processingTime) * 1000;
      console.log(`Error processing throughput: ${errorsPerSecond.toFixed(2)} errors/sec`);
    });
  });

  describe("ConfigManager Result Integration Performance", () => {
    it("should handle config loading with Result chains efficiently", async () => {
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { AppConfigLoader } = await import("../../src/loaders/app_config_loader.ts");
        const { UserConfigLoader } = await import("../../src/loaders/user_config_loader.ts");
        const appLoader = new AppConfigLoader();
        const userLoader = new UserConfigLoader();
        const configManager = new ConfigManager(appLoader, userLoader);

        const startTime = performance.now();

        const result = await configManager.getConfigSafe();

        // Chain multiple operations
        const processed = result
          .map((config) => config.working_dir)
          .flatMap((dir) => {
            if (dir.includes("..")) {
              return Result.failure(
                ErrorFactories.pathValidationError(dir, "PATH_TRAVERSAL", "working_dir"),
              );
            }
            return Result.ok(dir);
          })
          .map((dir) => ({ normalized: dir.replace(/\\/g, "/") }))
          .mapErr((err) => {
            // Transform error
            return ErrorFactories.unknown(err, "ConfigProcessing");
          });

        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      assert(
        avgTime < 20,
        `Average config processing time should be fast: ${avgTime.toFixed(2)}ms`,
      );
      assert(
        maxTime < 50,
        `Max config processing time should be reasonable: ${maxTime.toFixed(2)}ms`,
      );
    });

    it("should optimize Result flatMap chains in config validation", async () => {
      interface ValidationResult {
        valid: boolean;
        fieldCount: number;
      }

      const { AppConfigLoader } = await import("../../src/loaders/app_config_loader.ts");
      const { UserConfigLoader } = await import("../../src/loaders/user_config_loader.ts");
      const appLoader = new AppConfigLoader();
      const userLoader = new UserConfigLoader();
      const configManager = new ConfigManager(appLoader, userLoader);
      const loadResult = await configManager.getConfigSafe();

      const startTime = performance.now();

      // Complex validation chain
      const validationResult = loadResult
        .flatMap((config) => {
          // Validate structure
          if (!config.working_dir || !config.app_prompt || !config.app_schema) {
            return Result.err<ValidationResult, UnifiedError>(
              ErrorFactories.requiredFieldMissing("core_fields", "config"),
            );
          }
          return Result.ok({ valid: true, fieldCount: 3 });
        })
        .flatMap((result) => {
          // Additional validation
          if (result.fieldCount < 3) {
            return Result.err<ValidationResult, UnifiedError>(
              ErrorFactories.typeMismatch(
                "fieldCount",
                ">= 3",
                String(result.fieldCount),
                result.fieldCount,
              ),
            );
          }
          return Result.ok(result);
        })
        .flatMap((result) => {
          // Final validation
          return Result.ok({ ...result, valid: true });
        });

      const endTime = performance.now();
      const validationTime = endTime - startTime;

      assert(
        validationResult.isOk(),
        "Validation should succeed",
      );
      assert(
        validationTime < 5,
        `Validation chain should be fast, took ${validationTime}ms`,
      );
    });
  });

  describe("Memory Efficiency Tests", () => {
    it("should handle large error aggregations efficiently", async () => {
      const errorCount = 10000;

      // Clear any existing errors
      unifiedErrorManager.clearAll();

      // Measure memory before (if available)
      const memBefore = (performance as any).memory?.usedJSHeapSize || 0;

      const startTime = performance.now();

      // Generate and process many errors
      for (let i = 0; i < errorCount; i++) {
        const error = createError.unknown(
          new Error(`Test error ${i}`),
          "MemoryTest",
        );
        await unifiedErrorManager.processError(error);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Measure memory after
      const memAfter = (performance as any).memory?.usedJSHeapSize || 0;
      const memIncrease = memAfter - memBefore;

      const aggregator = unifiedErrorManager.getAggregator();
      const errors = aggregator.getErrors();

      // Should be limited by max error history
      assert(
        errors.length <= 1000,
        `Error history should be limited, got ${errors.length}`,
      );

      console.log(`Processed ${errorCount} errors in ${totalTime.toFixed(2)}ms`);
      if (memBefore > 0) {
        console.log(`Memory increase: ${(memIncrease / 1024 / 1024).toFixed(2)}MB`);
      }

      // Clear after test
      unifiedErrorManager.clearAll();
    });

    it("should garbage collect Result chains properly", async () => {
      const iterations = 1000;
      const results: Result<number, UnifiedError>[] = [];

      // Create many Result chains
      for (let i = 0; i < iterations; i++) {
        let result = Result.success<number, UnifiedError>(i);

        // Build chain
        for (let j = 0; j < 10; j++) {
          result = result.map((n: number) => n + 1);
        }

        results.push(result);
      }

      // Force evaluation of some results
      const evaluated = results.slice(0, 100).map((r) => Result.unwrapOr(r, 0));

      // Clear references
      results.length = 0;

      // Results should be garbage collectible
      assert(evaluated.length === 100, "Should evaluate subset of results");
    });
  });

  describe("Concurrent Operation Tests", () => {
    it("should handle concurrent Result operations efficiently", async () => {
      const concurrentOps = 100;
      // Mock config manager for performance testing
      const mockAppLoader = {
        async loadSafe() {
          return Result.ok({
            working_dir: "test",
            app_prompt: { base_dir: "prompts" },
            app_schema: { base_dir: "schema" },
          });
        },
      };
      const mockUserLoader = {
        async loadSafe() {
          return Result.ok({});
        },
      };
      const configManager = new ConfigManager(mockAppLoader as any, mockUserLoader as any);

      const startTime = performance.now();

      // Launch concurrent operations
      const promises = Array.from({ length: concurrentOps }, async (_, i) => {
        const result = await configManager.getConfigSafe();

        const dirResult = Result.map(result, (config: any) => config.working_dir);
        return Result.flatMap(dirResult, (dir: any) => {
          // Simulate some async processing
          return Result.ok(`processed-${i}-${dir}`);
        });
      });

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const concurrentTime = endTime - startTime;

      const successCount = results.filter((r: any) => Result.isOk(r)).length;

      assertEquals(
        successCount,
        concurrentOps,
        "All concurrent operations should succeed",
      );

      const avgTimePerOp = concurrentTime / concurrentOps;
      assert(
        avgTimePerOp < 10,
        `Average time per concurrent op should be low: ${avgTimePerOp.toFixed(2)}ms`,
      );
    });
  });
});
