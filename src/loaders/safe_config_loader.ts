import { parse as parseYaml } from "@std/yaml";
import {
  ConfigError,
  ConfigResult,
  type FileNotFoundError,
  type ParseError,
  Result,
  type UnknownError,
  type ValidationError as _ValidationError,
} from "../types/config_result.ts";

/**
 * Safe configuration loader with error handling
 *
 * This loader provides safe methods for loading configuration files
 * with proper error handling and validation. It returns results
 * wrapped in ConfigResult type for explicit error handling.
 */
export class SafeConfigLoader {
  /**
   * Creates a new SafeConfigLoader instance
   *
   * @param filePath - Path to the configuration file to load
   */
  constructor(private readonly filePath: string) {}

  /**
   * Safely reads a file from the filesystem
   *
   * @returns The file content as string, or an error if reading fails
   */
  async readFile(): Promise<ConfigResult<string, FileNotFoundError | UnknownError>> {
    try {
      const content = await Deno.readTextFile(this.filePath);
      return Result.ok(content);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return Result.err<FileNotFoundError>({
          kind: "fileNotFound",
          path: this.filePath,
          message: `Configuration file not found at: ${this.filePath}`,
        });
      }
      return Result.err<UnknownError>({
        kind: "unknownError",
        message: error instanceof Error ? error.message : "Unknown error reading file",
        originalError: error,
      });
    }
  }

  /**
   * Safely parses YAML content
   *
   * @param content - YAML content to parse
   * @returns Parsed object or error if parsing fails
   */
  parseYaml(content: string): ConfigResult<unknown, ParseError | UnknownError> {
    try {
      const parsed = parseYaml(content);
      return Result.ok(parsed);
    } catch (error) {
      // Extract line and column from YAML parse error if available
      let line = 0;
      let column = 0;
      let message = "Invalid YAML format";

      if (error instanceof Error) {
        message = error.message;
        // Try to extract line/column from error message
        const match = error.message.match(/at line (\d+), column (\d+)/);
        if (match) {
          line = parseInt(match[1], 10);
          column = parseInt(match[2], 10);
        }
      }

      return Result.err<ParseError>({
        kind: "parseError",
        path: this.filePath,
        line,
        column,
        message,
      });
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
  ): ConfigResult<T, ConfigError> {
    if (validator(config)) {
      return Result.ok(config);
    }
    return Result.err<ConfigError>({
      kind: "configValidationError",
      errors: [{
        field: "root",
        value: config,
        expectedType: "valid configuration object",
        message: "Configuration validation failed",
      }],
      path: this.filePath,
    });
  }

  /**
   * Loads and validates configuration file
   *
   * @param validator - Type guard function for configuration validation
   * @returns Loaded and validated configuration or error
   */
  async load<T>(
    validator: (config: unknown) => config is T,
  ): Promise<ConfigResult<T, ConfigError>> {
    // Read file
    const fileResult = await this.readFile();
    if (!fileResult.success) {
      return fileResult;
    }

    // Parse YAML
    const parseResult = this.parseYaml(fileResult.data);
    if (!parseResult.success) {
      return parseResult;
    }

    // Validate
    const validateResult = this.validate<T>(parseResult.data, validator);
    return validateResult;
  }
}
