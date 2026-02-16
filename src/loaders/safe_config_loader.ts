import { parse as parseYaml } from "@std/yaml";
import { Result } from "../types/unified_result.ts";
import { ErrorFactories, type UnifiedError } from "../errors/unified_errors.ts";

/**
 * Safe configuration loader with error handling
 *
 * This loader provides safe methods for loading configuration files
 * with proper error handling and validation. It returns results
 * wrapped in Result type for explicit error handling.
 */
export class SafeConfigLoader {
  /**
   * Creates a new SafeConfigLoader instance
   *
   * @param filePath - Path to the configuration file to load
   * @param configType - Type of configuration being loaded ("app" or "user")
   */
  constructor(
    private readonly filePath: string,
    private readonly configType: "app" | "user" = "app",
  ) {}

  /**
   * Safely reads a file from the filesystem
   *
   * @returns The file content as string, or an error if reading fails
   */
  async readFile(): Promise<Result<string, UnifiedError>> {
    try {
      const content = await Deno.readTextFile(this.filePath);
      return Result.ok(content);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return Result.err(
          ErrorFactories.configFileNotFound(this.filePath, this.configType),
        );
      }
      return Result.err(
        ErrorFactories.unknown(error, `readFile:${this.filePath}`),
      );
    }
  }

  /**
   * Safely parses YAML content
   *
   * @param content - YAML content to parse
   * @returns Parsed object or error if parsing fails
   */
  parseYaml(content: string): Result<unknown, UnifiedError> {
    try {
      const parsed = parseYaml(content);
      return Result.ok(parsed);
    } catch (error) {
      let line = 0;
      let column = 0;
      let message = "Invalid YAML format";

      if (error instanceof Error) {
        message = error.message;
        const match = error.message.match(/at line (\d+), column (\d+)/);
        if (match) {
          line = parseInt(match[1], 10);
          column = parseInt(match[2], 10);
        }
      }

      return Result.err(
        ErrorFactories.configParseError(this.filePath, message, line, column),
      );
    }
  }

  /**
   * Validates configuration object structure
   *
   * @param config - Configuration object to validate
   * @param validator - Validation function that returns true if valid
   * @returns Validation result
   */
  validate<T>(
    config: unknown,
    validator: (config: unknown) => config is T,
  ): Result<T, UnifiedError> {
    if (validator(config)) {
      return Result.ok(config);
    }
    return Result.err(
      ErrorFactories.configValidationError(this.filePath, [{
        field: "root",
        value: config,
        expectedType: "valid configuration object",
        actualType: typeof config,
        constraint: "Configuration validation failed",
      }]),
    );
  }

  /**
   * Loads and validates configuration file
   *
   * @param validator - Type guard function for configuration validation
   * @returns Loaded and validated configuration or error
   */
  async load<T>(
    validator: (config: unknown) => config is T,
  ): Promise<Result<T, UnifiedError>> {
    const fileResult = await this.readFile();
    if (!fileResult.success) return fileResult;

    const parseResult = this.parseYaml(fileResult.data);
    if (!parseResult.success) return parseResult;

    return this.validate<T>(parseResult.data, validator);
  }
}
