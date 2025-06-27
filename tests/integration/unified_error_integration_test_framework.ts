/**
 * Unified Error System Integration Test Framework
 *
 * Comprehensive E2E test framework for validating the complete unified error system,
 * including polymorphic behavior, i18n, error chains, and real-world scenarios.
 */

import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertInstanceOf, assertNotEquals } from "@std/assert";
import {
  BaseErrorInterface,
  createError,
  enhancedI18n,
  ErrorCategory,
  ErrorCodeUtils,
  ErrorConfigPresets,
  ErrorDiagnostics,
  ErrorHandlingUtils,
  ErrorSeverity,
  ErrorUtils,
  initializeErrorSystem,
  QuickErrorFactory,
  StandardErrorCode,
  SupportedLanguage,
  unifiedErrorManager,
} from "../../src/errors/unified_error_final_exports.ts";

/**
 * Test context setup for integration tests
 */
export class UnifiedErrorTestContext {
  private originalConfig: any;
  private testErrors: BaseErrorInterface[] = [];

  async setup(): Promise<void> {
    // Clear any existing errors
    unifiedErrorManager.clearAll();

    // Configure for testing
    initializeErrorSystem("testing", {
      enableReporting: true,
      enableMetrics: true,
      enableAggregation: true,
      debugMode: true,
    });

    // Set default language to English
    enhancedI18n.setLanguage(SupportedLanguage.ENGLISH);
  }

  async teardown(): Promise<void> {
    // Clear test errors
    unifiedErrorManager.clearAll();

    // Reset to production config
    initializeErrorSystem("production");
  }

  recordError(error: BaseErrorInterface): void {
    this.testErrors.push(error);
  }

  getRecordedErrors(): BaseErrorInterface[] {
    return [...this.testErrors];
  }

  clearRecordedErrors(): void {
    this.testErrors = [];
  }
}

/**
 * Test helper assertions for unified errors
 */
export const UnifiedErrorAssertions = {
  assertErrorKind(error: BaseErrorInterface, expectedKind: string): void {
    assertEquals(
      error.kind,
      expectedKind,
      `Expected error kind ${expectedKind}, got ${error.kind}`,
    );
  },

  assertErrorCode(error: BaseErrorInterface, expectedCode: StandardErrorCode): void {
    assertEquals(
      error.code,
      expectedCode,
      `Expected error code ${expectedCode}, got ${error.code}`,
    );
  },

  assertErrorCategory(error: BaseErrorInterface, expectedCategory: ErrorCategory): void {
    assertEquals(
      error.category,
      expectedCategory,
      `Expected error category ${expectedCategory}, got ${error.category}`,
    );
  },

  assertErrorSeverity(error: BaseErrorInterface, expectedSeverity: ErrorSeverity): void {
    assertEquals(
      error.severity,
      expectedSeverity,
      `Expected error severity ${expectedSeverity}, got ${error.severity}`,
    );
  },

  assertErrorHasCorrelationId(error: BaseErrorInterface): void {
    assert(
      error.correlationId && error.correlationId.length > 0,
      "Error should have a correlation ID",
    );
  },

  assertErrorChain(error: BaseErrorInterface, expectedChainLength: number): void {
    let current: BaseErrorInterface | undefined = error;
    let count = 0;

    while (current) {
      count++;
      current = current.cause;
    }

    assertEquals(
      count,
      expectedChainLength,
      `Expected error chain length ${expectedChainLength}, got ${count}`,
    );
  },

  assertErrorMessage(error: BaseErrorInterface, expectedPattern: string | RegExp): void {
    if (typeof expectedPattern === "string") {
      assert(
        error.message.includes(expectedPattern),
        `Expected error message to contain "${expectedPattern}", got "${error.message}"`,
      );
    } else {
      assert(
        expectedPattern.test(error.message),
        `Expected error message to match pattern ${expectedPattern}, got "${error.message}"`,
      );
    }
  },
};

/**
 * E2E test scenarios for real-world usage
 */
export const E2ETestScenarios = {
  /**
   * Simulate configuration loading failure scenario
   */
  async simulateConfigLoadFailure(configPath: string): Promise<BaseErrorInterface[]> {
    const errors: BaseErrorInterface[] = [];

    // 1. File not found error
    const fileNotFoundError = createError.configFileNotFound(
      configPath,
      "app",
      ["/etc/app/config.yaml", "./config.yaml", "~/.config/app/config.yaml"],
    );
    errors.push(fileNotFoundError);
    await unifiedErrorManager.processError(fileNotFoundError);

    // 2. Fallback to default but parse error
    const parseError = createError.configParseError(
      "./default-config.yaml",
      "Unexpected token at line 10",
      10,
      15,
    );
    errors.push(parseError);
    await unifiedErrorManager.processError(parseError);

    // 3. Final unknown error
    const unknownError = createError.unknown(
      new Error("Unable to initialize configuration system"),
      "ConfigLoader.initialize",
    );
    errors.push(unknownError);
    await unifiedErrorManager.processError(unknownError);

    return errors;
  },

  /**
   * Simulate validation failure scenario
   */
  async simulateValidationFailure(data: any): Promise<BaseErrorInterface[]> {
    const errors: BaseErrorInterface[] = [];

    // Required field missing
    const missingFieldError = createError.requiredFieldMissing(
      "apiKey",
      "config.authentication",
      ["username", "password", "token"],
    );
    errors.push(missingFieldError);

    // Type mismatch
    const typeMismatchError = createError.typeMismatch(
      "port",
      "number",
      "string",
      "8080",
    );
    errors.push(typeMismatchError);

    // Path traversal security error
    const pathTraversalError = createError.pathTraversal(
      "../../../etc/passwd",
      "config.dataPath",
    );
    errors.push(pathTraversalError);

    // Process all errors
    for (const error of errors) {
      await unifiedErrorManager.processError(error);
    }

    return errors;
  },

  /**
   * Simulate error recovery workflow
   */
  async simulateErrorRecovery(): Promise<{
    initialError: BaseErrorInterface;
    recoveryAttempts: BaseErrorInterface[];
    finalResult: "success" | "failure";
  }> {
    // Initial error
    const initialError = createError.configFileNotFound(
      "/app/config.yaml",
      "app",
    );
    await unifiedErrorManager.processError(initialError);

    // Recovery attempts
    const recoveryAttempts: BaseErrorInterface[] = [];

    // Attempt 1: Try alternative location
    const attempt1 = createError.configFileNotFound(
      "/etc/app/config.yaml",
      "app",
    );
    recoveryAttempts.push(attempt1);

    // Attempt 2: Try to create default
    try {
      // Simulate file creation failure
      throw new Error("Permission denied");
    } catch (e) {
      const attempt2 = createError.unknown(e, "createDefaultConfig");
      recoveryAttempts.push(attempt2);
    }

    // Process recovery attempts
    for (const error of recoveryAttempts) {
      await unifiedErrorManager.processError(error);
    }

    // Determine final result
    const aggregator = unifiedErrorManager.getAggregator();
    const finalResult = aggregator.hasCriticalErrors() ? "failure" : "success";

    return {
      initialError,
      recoveryAttempts,
      finalResult,
    };
  },
};

/**
 * Performance test utilities
 */
export const PerformanceTestUtils = {
  /**
   * Measure error processing performance
   */
  async measureErrorProcessingTime(errorCount: number): Promise<{
    totalTime: number;
    averageTime: number;
    errorsPerSecond: number;
  }> {
    const errors: BaseErrorInterface[] = [];

    // Generate diverse errors
    for (let i = 0; i < errorCount; i++) {
      const errorType = i % 4;
      switch (errorType) {
        case 0:
          errors.push(createError.configFileNotFound(`/path/to/config${i}.yaml`, "app"));
          break;
        case 1:
          errors.push(createError.typeMismatch(`field${i}`, "string", "number", i));
          break;
        case 2:
          errors.push(createError.requiredFieldMissing(`requiredField${i}`, `object${i}`));
          break;
        case 3:
          errors.push(createError.unknown(new Error(`Test error ${i}`), `context${i}`));
          break;
      }
    }

    const startTime = performance.now();

    // Process all errors
    for (const error of errors) {
      await unifiedErrorManager.processError(error);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / errorCount;
    const errorsPerSecond = 1000 / averageTime;

    return {
      totalTime,
      averageTime,
      errorsPerSecond,
    };
  },

  /**
   * Stress test error aggregation
   */
  async stressTestAggregation(errorCount: number): Promise<{
    memoryUsageBefore: number;
    memoryUsageAfter: number;
    aggregationTime: number;
    retrievalTime: number;
  }> {
    // Get initial memory usage
    const memoryUsageBefore = (performance as any).memory?.usedJSHeapSize || 0;

    const startTime = performance.now();

    // Generate and aggregate errors
    for (let i = 0; i < errorCount; i++) {
      const error = createError.unknown(
        new Error(`Stress test error ${i}`),
        "stressTest",
      );
      await unifiedErrorManager.processError(error);
    }

    const aggregationTime = performance.now() - startTime;

    // Test retrieval performance
    const retrievalStart = performance.now();
    const aggregator = unifiedErrorManager.getAggregator();
    const allErrors = aggregator.getErrors();
    const retrievalTime = performance.now() - retrievalStart;

    // Get final memory usage
    const memoryUsageAfter = (performance as any).memory?.usedJSHeapSize || 0;

    return {
      memoryUsageBefore,
      memoryUsageAfter,
      aggregationTime,
      retrievalTime,
    };
  },
};

/**
 * I18n test utilities
 */
export const I18nTestUtils = {
  /**
   * Test error messages in multiple languages
   */
  async testMultiLanguageErrors(): Promise<Map<SupportedLanguage, string[]>> {
    const results = new Map<SupportedLanguage, string[]>();
    const testError = createError.configFileNotFound(
      "/app/config.yaml",
      "app",
      ["/etc/app/config.yaml", "./config.yaml"],
    );

    // Test each supported language
    const languages = [
      SupportedLanguage.ENGLISH,
      SupportedLanguage.JAPANESE,
      SupportedLanguage.SPANISH,
      SupportedLanguage.FRENCH,
      SupportedLanguage.GERMAN,
      SupportedLanguage.CHINESE_SIMPLIFIED,
      SupportedLanguage.KOREAN,
    ];

    for (const lang of languages) {
      enhancedI18n.setLanguage(lang);

      const messages = [
        enhancedI18n.getErrorTitle(testError),
        enhancedI18n.getErrorMessage(testError),
        enhancedI18n.getErrorDescription(testError),
        ...enhancedI18n.getRecoverySuggestions(testError),
      ];

      results.set(lang, messages);
    }

    // Reset to English
    enhancedI18n.setLanguage(SupportedLanguage.ENGLISH);

    return results;
  },
};

/**
 * Error chain test utilities
 */
export const ErrorChainTestUtils = {
  /**
   * Create a complex error chain
   */
  createComplexErrorChain(): BaseErrorInterface {
    // Level 1: File system error
    const fsError = createError.unknown(
      new Error("ENOENT: no such file or directory"),
      "fs.readFile",
    );

    // Level 2: Config file not found (caused by fs error)
    const configNotFound = createError.configFileNotFound(
      "/app/config.yaml",
      "app",
    );
    (configNotFound as any).cause = fsError;

    // Level 3: Config loading failed (caused by file not found)
    const configLoadError = ErrorUtils.createErrorChain(
      fsError,
      configNotFound,
      createError.unknown(
        new Error("Failed to load application configuration"),
        "ConfigLoader",
      ),
    );

    return configLoadError!;
  },
};
