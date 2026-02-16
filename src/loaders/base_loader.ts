import { parse as parseYaml } from "@std/yaml";
import { join } from "@std/path";
import { Result } from "../types/unified_result.ts";
import { ErrorFactories, type UnifiedError } from "../errors/unified_errors.ts";

/**
 * Common interface for all configuration loaders
 *
 * Defines the contract that all configuration loaders must implement.
 * Uses Result type for consistent error handling across all loaders.
 */
export interface Loader<T> {
  /**
   * Loads and validates configuration
   *
   * @returns Result containing either the loaded configuration or an error
   */
  load(): Promise<Result<T, UnifiedError>>;
}

/**
 * Abstract base class for configuration loaders
 *
 * Provides common functionality for all configuration loaders including:
 * - File reading with proper error handling
 * - YAML parsing with detailed error information
 * - Path resolution
 * - Abstract validation method to be implemented by subclasses
 */
export abstract class BaseLoader<T> implements Loader<T> {
  /**
   * Creates a new BaseLoader instance
   *
   * @param configPath - Path to the configuration file
   * @param baseDir - Optional base directory for resolving relative paths
   */
  constructor(
    protected readonly configPath: string,
    protected readonly baseDir?: string,
  ) {}

  /**
   * Loads and validates configuration
   *
   * Template method that orchestrates the loading process:
   * 1. Resolves the configuration file path
   * 2. Reads the file content
   * 3. Parses the YAML content
   * 4. Validates the parsed configuration
   *
   * @returns Loaded and validated configuration or error
   */
  async load(): Promise<Result<T, UnifiedError>> {
    // Resolve the full path
    const fullPath = this.resolvePath(this.configPath);

    // Read the file
    const fileResult = await this.readFile(fullPath);
    if (!fileResult.success) {
      return fileResult;
    }

    // Parse YAML
    const parseResult = this.parseYaml(fileResult.data, fullPath);
    if (!parseResult.success) {
      return parseResult;
    }

    // Validate configuration
    const validateResult = await this.validate(parseResult.data);
    return validateResult;
  }

  /**
   * Validates the parsed configuration
   *
   * Abstract method that must be implemented by subclasses to provide
   * type-specific validation logic.
   *
   * @param config - Parsed configuration object
   * @returns Validation result
   */
  protected abstract validate(config: unknown): Promise<Result<T, UnifiedError>>;

  /**
   * Resolves a configuration file path
   *
   * @param path - Path to resolve
   * @returns Resolved absolute path
   */
  protected resolvePath(path: string): string {
    if (this.baseDir) {
      return join(this.baseDir, path);
    }
    return path;
  }

  /**
   * Reads a file from the filesystem
   *
   * @param path - Path to the file
   * @returns File content or error
   */
  protected async readFile(
    path: string,
  ): Promise<Result<string, UnifiedError>> {
    try {
      const content = await Deno.readTextFile(path);
      return Result.ok(content);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return Result.err(
          ErrorFactories.configFileNotFound(path, "app"),
        );
      }
      return Result.err(
        ErrorFactories.unknown(error, `readFile:${path}`),
      );
    }
  }

  /**
   * Parses YAML content
   *
   * @param content - YAML string content
   * @param path - File path for error reporting
   * @returns Parsed object or error
   */
  protected parseYaml(
    content: string,
    path: string,
  ): Result<unknown, UnifiedError> {
    try {
      const parsed = parseYaml(content);
      return Result.ok(parsed);
    } catch (error) {
      let line = 0;
      let column = 0;
      let message = "Invalid YAML format";

      if (error instanceof Error) {
        message = error.message;
        const lineMatch = error.message.match(/at line (\d+)/);
        const columnMatch = error.message.match(/column (\d+)/);

        if (lineMatch) {
          line = parseInt(lineMatch[1], 10);
        }
        if (columnMatch) {
          column = parseInt(columnMatch[1], 10);
        }
      }

      return Result.err(
        ErrorFactories.configParseError(path, message, line, column),
      );
    }
  }

  /**
   * Helper method to create a validation error
   *
   * @param field - Field that failed validation
   * @param value - Actual value
   * @param expectedType - Expected type
   * @param message - Optional error message
   * @returns Validation error result
   */
  protected validationError(
    field: string,
    value: unknown,
    expectedType: string,
    message?: string,
  ): Result<T, UnifiedError> {
    return Result.err(
      ErrorFactories.configValidationError(this.configPath, [{
        field,
        value,
        expectedType,
        actualType: typeof value,
        constraint: message || `Field '${field}' must be ${expectedType}`,
      }]),
    );
  }
}
