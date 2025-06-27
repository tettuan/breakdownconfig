/**
 * Error Propagation Patterns Test
 *
 * Purpose:
 * Test specific error propagation patterns in configuration loading and validation
 * - Chain of operations with error propagation
 * - Error context preservation through multiple operations
 * - Complex error scenarios with multiple failure points
 * - Error propagation in async operations
 *
 * Test Focus:
 * 1. Config loading error propagation (file not found → parse error → validation error)
 * 2. Validation error propagation through nested structures
 * 3. Path validation error propagation
 * 4. User config error propagation and transformation
 * 5. Schema validation error propagation
 */

import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Result } from "../src/types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "../src/errors/unified_errors.ts";
import { errorCodeToUnifiedError, userConfigErrorToResult } from "../src/errors/throw_to_result.ts";
import { ErrorCode } from "../src/error_manager.ts";
import {
  assertConfigFileNotFoundError,
  assertPathValidationError,
  assertResultErr,
  assertResultErrorKind,
  assertResultOk,
  assertUserConfigInvalidError,
} from "./test_helpers/result_test_helpers.ts";

// Mock configuration structures for testing
interface MockAppConfig {
  working_dir: string;
  app_prompt: string;
  app_schema: string;
}

interface MockUserConfig {
  userPrompt?: string;
  include?: string[];
  exclude?: string[];
}

interface MockMergedConfig {
  workingDir: string;
  appPrompt: string;
  appSchema: string;
  userPrompt?: string;
  includePaths: string[];
  excludePaths: string[];
}

describe("Error Propagation Patterns", () => {
  describe("Configuration Loading Error Chain", () => {
    it("should propagate file not found errors through config loading chain", () => {
      // Simulate app config loading failure
      const loadAppConfig = (path: string): Result<MockAppConfig, UnifiedError> => {
        if (path.includes("missing")) {
          return Result.err(ErrorFactories.configFileNotFound(path, "app"));
        }
        return Result.ok({
          working_dir: "./src",
          app_prompt: "prompt.md",
          app_schema: "schema.json",
        });
      };

      // Simulate user config loading failure
      const loadUserConfig = (path: string): Result<MockUserConfig, UnifiedError> => {
        if (path.includes("missing")) {
          return Result.err(ErrorFactories.configFileNotFound(path, "user"));
        }
        return Result.ok({
          userPrompt: "user_prompt.md",
          include: ["src/**"],
          exclude: ["node_modules/**"],
        });
      };

      // Config loading chain
      const loadConfigs = (
        appPath: string,
        userPath: string,
      ): Result<MockMergedConfig, UnifiedError> => {
        return Result.flatMap(
          loadAppConfig(appPath),
          (appConfig) =>
            Result.flatMap(
              loadUserConfig(userPath),
              (userConfig) =>
                Result.ok({
                  workingDir: appConfig.working_dir,
                  appPrompt: appConfig.app_prompt,
                  appSchema: appConfig.app_schema,
                  userPrompt: userConfig.userPrompt,
                  includePaths: userConfig.include || [],
                  excludePaths: userConfig.exclude || [],
                }),
            ),
        );
      };

      // Test successful loading
      const successResult = loadConfigs("app.yaml", "user.yaml");
      const mergedConfig = assertResultOk(successResult);
      assertEquals(mergedConfig.workingDir, "./src");

      // Test app config not found error propagation
      const appMissingResult = loadConfigs("missing_app.yaml", "user.yaml");
      assertConfigFileNotFoundError(appMissingResult, "missing_app.yaml", "app");

      // Test user config not found error propagation
      const userMissingResult = loadConfigs("app.yaml", "missing_user.yaml");
      assertConfigFileNotFoundError(userMissingResult, "missing_user.yaml", "user");
    });

    it("should propagate parse errors through validation chain", () => {
      // Simulate config parsing with potential errors
      const parseConfig = (content: string): Result<Record<string, unknown>, UnifiedError> => {
        if (content.includes("malformed")) {
          return Result.err(ErrorFactories.configParseError("config.yaml", "Invalid YAML syntax"));
        }
        try {
          return Result.ok(JSON.parse(content));
        } catch (error) {
          return Result.err(
            ErrorFactories.configParseError(
              "config.yaml",
              error instanceof Error ? error.message : "Parse error",
            ),
          );
        }
      };

      // Config validation after parsing
      const validateParsedConfig = (
        parsed: Record<string, unknown>,
      ): Result<MockAppConfig, UnifiedError> => {
        const violations = [];

        if (!parsed.working_dir) {
          violations.push({ field: "working_dir", message: "Required field missing", value: null });
        }
        if (!parsed.app_prompt) {
          violations.push({ field: "app_prompt", message: "Required field missing", value: null });
        }
        if (!parsed.app_schema) {
          violations.push({ field: "app_schema", message: "Required field missing", value: null });
        }

        if (violations.length > 0) {
          return Result.err(ErrorFactories.configValidationError("config.yaml", violations));
        }

        return Result.ok({
          working_dir: parsed.working_dir as string,
          app_prompt: parsed.app_prompt as string,
          app_schema: parsed.app_schema as string,
        });
      };

      // Parse and validate chain
      const processConfig = (content: string): Result<MockAppConfig, UnifiedError> => {
        return Result.flatMap(parseConfig(content), validateParsedConfig);
      };

      // Test successful processing
      const validContent = JSON.stringify({
        working_dir: "./src",
        app_prompt: "prompt.md",
        app_schema: "schema.json",
      });
      const successResult = processConfig(validContent);
      assertResultOk(successResult);

      // Test parse error propagation
      const malformedResult = processConfig("malformed content");
      assertResultErrorKind(malformedResult, "CONFIG_PARSE_ERROR");

      // Test validation error propagation after successful parsing
      const incompleteContent = JSON.stringify({ working_dir: "./src" });
      const validationResult = processConfig(incompleteContent);
      assertResultErrorKind(validationResult, "CONFIG_VALIDATION_ERROR");
    });
  });

  describe("User Config Error Propagation", () => {
    it("should propagate user config parsing errors with context", () => {
      const testCases = [
        {
          errorKind: "parseError" as const,
          message: "Invalid YAML syntax at line 5",
          expectedReason: "PARSE_ERROR" as const,
        },
        {
          errorKind: "validationError" as const,
          message: "Schema validation failed",
          expectedReason: "VALIDATION_ERROR" as const,
        },
        {
          errorKind: "unknownError" as const,
          message: "Unexpected error occurred",
          expectedReason: "UNKNOWN_ERROR" as const,
        },
      ];

      testCases.forEach(({ errorKind, message, expectedReason }) => {
        const result = userConfigErrorToResult(
          "user_config.yaml",
          errorKind,
          message,
          new Error("Original error"),
        );

        assertUserConfigInvalidError(result, expectedReason);
        const error = assertResultErr(result);
        assertEquals(error.message, message);
      });
    });

    it("should propagate ErrorCode to UnifiedError with context preservation", () => {
      const errorCodeMappings = [
        {
          code: ErrorCode.USER_CONFIG_INVALID,
          context: { path: "user.yaml", reason: "PARSE_ERROR" },
          expectedKind: "USER_CONFIG_INVALID",
        },
        {
          code: ErrorCode.APP_CONFIG_NOT_FOUND,
          context: { path: "app.yaml" },
          expectedKind: "CONFIG_FILE_NOT_FOUND",
        },
        {
          code: ErrorCode.INVALID_PATH_FORMAT,
          context: { path: "../invalid", field: "working_dir" },
          expectedKind: "PATH_VALIDATION_ERROR",
        },
        {
          code: ErrorCode.PATH_TRAVERSAL_DETECTED,
          context: { path: "../../etc/passwd", field: "include_path" },
          expectedKind: "PATH_VALIDATION_ERROR",
        },
      ];

      errorCodeMappings.forEach(({ code, context, expectedKind }) => {
        const error = errorCodeToUnifiedError(code, "Test message", context);
        assertEquals(error.kind, expectedKind);

        if (context.path && "path" in error) {
          assertEquals((error as any).path, context.path);
        }
      });
    });
  });

  describe("Path Validation Error Propagation", () => {
    it("should propagate path validation errors through file resolution chain", () => {
      // Mock path validation function
      const validatePath = (path: string, field: string): Result<string, UnifiedError> => {
        if (path.includes("..")) {
          return Result.err(ErrorFactories.pathValidationError(path, "PATH_TRAVERSAL", field));
        }
        if (path.startsWith("/")) {
          return Result.err(
            ErrorFactories.pathValidationError(path, "ABSOLUTE_PATH_NOT_ALLOWED", field),
          );
        }
        if (path.includes("\x00")) {
          return Result.err(ErrorFactories.pathValidationError(path, "INVALID_CHARACTERS", field));
        }
        if (path === "") {
          return Result.err(ErrorFactories.pathValidationError(path, "EMPTY_PATH", field));
        }
        return Result.ok(path);
      };

      // Validate multiple paths in a config
      const validateConfigPaths = (config: {
        working_dir: string;
        include_paths: string[];
        exclude_paths: string[];
      }): Result<typeof config, UnifiedError> => {
        // Validate working directory
        const workingDirResult = validatePath(config.working_dir, "working_dir");
        if (Result.isErr(workingDirResult)) return workingDirResult;

        // Validate include paths
        for (const [index, path] of config.include_paths.entries()) {
          const pathResult = validatePath(path, `include_paths[${index}]`);
          if (Result.isErr(pathResult)) return pathResult;
        }

        // Validate exclude paths
        for (const [index, path] of config.exclude_paths.entries()) {
          const pathResult = validatePath(path, `exclude_paths[${index}]`);
          if (Result.isErr(pathResult)) return pathResult;
        }

        return Result.ok(config);
      };

      // Test successful validation
      const validConfig = {
        working_dir: "src",
        include_paths: ["src/**/*.ts", "docs/**/*.md"],
        exclude_paths: ["node_modules/**", "dist/**"],
      };
      const successResult = validateConfigPaths(validConfig);
      assertResultOk(successResult);

      // Test path traversal error propagation in working_dir
      const pathTraversalConfig = {
        ...validConfig,
        working_dir: "../unsafe",
      };
      const pathTraversalResult = validateConfigPaths(pathTraversalConfig);
      assertPathValidationError(pathTraversalResult, "PATH_TRAVERSAL");

      // Test absolute path error propagation in include_paths
      const absolutePathConfig = {
        ...validConfig,
        include_paths: ["/etc/passwd"],
      };
      const absolutePathResult = validateConfigPaths(absolutePathConfig);
      assertPathValidationError(absolutePathResult, "ABSOLUTE_PATH_NOT_ALLOWED");

      // Test invalid characters error propagation in exclude_paths
      const invalidCharsConfig = {
        ...validConfig,
        exclude_paths: ["test\x00file"],
      };
      const invalidCharsResult = validateConfigPaths(invalidCharsConfig);
      assertPathValidationError(invalidCharsResult, "INVALID_CHARACTERS");
    });
  });

  describe("Async Error Propagation", () => {
    it("should propagate errors through async operation chains", async () => {
      // Mock async file operations
      const readFile = async (path: string): Promise<Result<string, UnifiedError>> => {
        await new Promise((resolve) => setTimeout(resolve, 1)); // Simulate async delay

        if (path.includes("missing")) {
          return Result.err(ErrorFactories.configFileNotFound(path, "app"));
        }
        if (path.includes("permission")) {
          return Result.err(ErrorFactories.unknown(new Error("Permission denied"), "readFile"));
        }
        return Result.ok(`content of ${path}`);
      };

      const parseContent = async (
        content: string,
      ): Promise<Result<Record<string, unknown>, UnifiedError>> => {
        await new Promise((resolve) => setTimeout(resolve, 1)); // Simulate async delay

        if (content.includes("malformed")) {
          return Result.err(ErrorFactories.configParseError("content", "Invalid format"));
        }
        return Result.ok({ parsed: true, content });
      };

      // Async chain operation
      const processFile = async (
        path: string,
      ): Promise<Result<Record<string, unknown>, UnifiedError>> => {
        const fileResult = await readFile(path);
        if (Result.isErr(fileResult)) return fileResult;

        return await parseContent(fileResult.data);
      };

      // Test successful async chain
      const successResult = await processFile("valid.yaml");
      assertResultOk(successResult);

      // Test file not found error propagation
      const notFoundResult = await processFile("missing.yaml");
      assertConfigFileNotFoundError(notFoundResult, "missing.yaml", "app");

      // Test permission error propagation
      const permissionResult = await processFile("permission.yaml");
      const permissionError = assertResultErr(permissionResult);
      assertEquals(permissionError.message, "Permission denied");

      // Test parse error propagation
      const parseErrorResult = await processFile("malformed");
      assertResultErrorKind(parseErrorResult, "CONFIG_PARSE_ERROR");
    });

    it("should handle concurrent async operations with error aggregation", async () => {
      const loadMultipleConfigs = async (
        paths: string[],
      ): Promise<Result<string[], UnifiedError>> => {
        const loadTasks = paths.map(async (path) => {
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 10)); // Random delay

          if (path.includes("error")) {
            return Result.err(ErrorFactories.configFileNotFound(path, "app"));
          }
          return Result.ok(`loaded: ${path}`);
        });

        const results = await Promise.all(loadTasks);
        return Result.all(results);
      };

      // Test successful concurrent loading
      const successPaths = ["config1.yaml", "config2.yaml", "config3.yaml"];
      const successResult = await loadMultipleConfigs(successPaths);
      const loadedConfigs = assertResultOk(successResult);
      assertEquals(loadedConfigs.length, 3);

      // Test error in concurrent loading (fail fast)
      const errorPaths = ["config1.yaml", "error_config.yaml", "config3.yaml"];
      const errorResult = await loadMultipleConfigs(errorPaths);
      assertConfigFileNotFoundError(errorResult, "error_config.yaml", "app");
    });
  });

  describe("Complex Error Propagation Scenarios", () => {
    it("should handle nested error transformations in complex workflows", () => {
      // Simulate a complex configuration workflow with multiple transformation steps
      type WorkflowStep<T, U> = (input: T) => Result<U, UnifiedError>;

      const step1: WorkflowStep<string, Record<string, unknown>> = (input) => {
        if (input.includes("invalid")) {
          return Result.err(ErrorFactories.configParseError("input", "Invalid input format"));
        }
        return Result.ok({ step1: true, data: input });
      };

      const step2: WorkflowStep<Record<string, unknown>, Record<string, unknown>> = (input) => {
        if (!input.step1) {
          return Result.err(ErrorFactories.configValidationError("workflow", [
            { field: "step1", message: "Step1 marker missing", value: input.step1 },
          ]));
        }
        return Result.ok({ ...input, step2: true });
      };

      const step3: WorkflowStep<Record<string, unknown>, string> = (input) => {
        if (!input.step2) {
          return Result.err(ErrorFactories.unknown(new Error("Step2 incomplete"), "step3"));
        }
        return Result.ok(`final result: ${JSON.stringify(input)}`);
      };

      // Execute workflow with error propagation
      const executeWorkflow = (input: string): Result<string, UnifiedError> => {
        return Result.flatMap(
          Result.flatMap(step1(input), step2),
          step3,
        );
      };

      // Test successful workflow
      const successResult = executeWorkflow("valid input");
      const finalOutput = assertResultOk(successResult);
      assertEquals(finalOutput.includes("final result"), true);

      // Test error propagation at step1
      const step1ErrorResult = executeWorkflow("invalid input");
      assertResultErrorKind(step1ErrorResult, "CONFIG_PARSE_ERROR");

      // Test error propagation at step2 (simulate by manipulating step1 output)
      const step2ErrorResult = Result.flatMap(
        Result.ok({ step1: false, data: "test" }),
        (data) => Result.flatMap(step2(data), step3),
      );
      assertResultErrorKind(step2ErrorResult, "CONFIG_VALIDATION_ERROR");
    });

    it("should preserve error context through multiple layers of abstraction", () => {
      // Layer 1: File system operations
      const fsLayer = (path: string) => {
        if (path.includes("not_found")) {
          return Result.err(ErrorFactories.configFileNotFound(path, "app"));
        }
        return Result.ok(`file_content_of_${path}`);
      };

      // Layer 2: Parser operations
      const parserLayer = (content: string) => {
        if (content.includes("malformed")) {
          return Result.err(ErrorFactories.configParseError("parser_input", "Malformed content"));
        }
        return Result.ok({ parsed_content: content });
      };

      // Layer 3: Validation operations
      const validationLayer = (data: Record<string, unknown>) => {
        if (!data.parsed_content) {
          return Result.err(ErrorFactories.configValidationError("validation", [
            {
              field: "parsed_content",
              message: "Missing parsed content",
              value: data.parsed_content,
            },
          ]));
        }
        return Result.ok({ validated: true, ...data });
      };

      // Layer 4: Business logic
      const businessLayer = (data: Record<string, unknown>) => {
        if (!data.validated) {
          return Result.err(
            ErrorFactories.unknown(new Error("Validation required"), "businessLayer"),
          );
        }
        return Result.ok(`processed: ${JSON.stringify(data)}`);
      };

      // Multi-layer processing pipeline
      const processWithLayers = (path: string): Result<string, UnifiedError> => {
        return Result.flatMap(
          Result.flatMap(
            Result.flatMap(fsLayer(path), parserLayer),
            validationLayer,
          ),
          businessLayer,
        );
      };

      // Test successful multi-layer processing
      const successResult = processWithLayers("valid_file.yaml");
      assertResultOk(successResult);

      // Test error context preservation from fs layer
      const fsErrorResult = processWithLayers("not_found.yaml");
      const fsError = assertResultErr(fsErrorResult);
      assertEquals(fsError.kind, "CONFIG_FILE_NOT_FOUND");
      assertEquals((fsError as any).path, "not_found.yaml");

      // Test error context preservation from parser layer
      const parserErrorResult = processWithLayers("malformed");
      const parserError = assertResultErr(parserErrorResult);
      assertEquals(parserError.kind, "CONFIG_PARSE_ERROR");
      assertEquals((parserError as any).path, "parser_input");
    });
  });
});
