import { ConfigResult, PathError, PathErrorReason, Result } from "../types/config_result.ts";

/**
 * ValidPath - A Smart Constructor pattern implementation for safe path handling
 * 
 * This class ensures that file paths are:
 * 1. Free from path traversal attempts (../, ..\)
 * 2. Not absolute paths (starting with / or drive letters on Windows)
 * 3. Free from invalid characters
 */
export class ValidPath {
  private readonly path: string;

  private constructor(path: string) {
    this.path = path;
  }

  /**
   * Creates a ValidPath instance after validating the input
   * @param path - The path to validate
   * @returns ConfigResult containing either a ValidPath instance or a PathError
   */
  static create(path: string): ConfigResult<ValidPath, PathError> {
    // Check for empty or whitespace-only paths
    if (!path || path.trim().length === 0) {
      return Result.err<PathError>({
        kind: "pathError",
        path: path,
        reason: "empty",
        message: "Path cannot be empty"
      });
    }

    // Check for path traversal attempts
    if (this.containsPathTraversal(path)) {
      return Result.err<PathError>({
        kind: "pathError",
        path: path,
        reason: "pathTraversal",
        message: `Path traversal detected in: ${path}`
      });
    }

    // Check for absolute paths
    if (this.isAbsolutePath(path)) {
      return Result.err<PathError>({
        kind: "pathError",
        path: path,
        reason: "absoluteNotAllowed",
        message: `Absolute paths are not allowed: ${path}`
      });
    }

    // Check for invalid characters
    const invalidChar = this.getInvalidCharacter(path);
    if (invalidChar) {
      return Result.err<PathError>({
        kind: "pathError",
        path: path,
        reason: "invalidCharacters",
        message: `Invalid character '${invalidChar}' in path: ${path}`
      });
    }

    return Result.ok(new ValidPath(path.trim()));
  }

  /**
   * Returns the validated path string
   */
  getValue(): string {
    return this.path;
  }

  /**
   * Checks if the path contains path traversal attempts
   */
  private static containsPathTraversal(path: string): boolean {
    // Check for ../ or ..\ patterns
    return path.includes('../') || path.includes('..\\') || 
           path === '..' || path.startsWith('../') || path.startsWith('..\\') ||
           path.includes('/../') || path.includes('\\..\\') ||
           path.endsWith('/..') || path.endsWith('\\..');
  }

  /**
   * Checks if the path is an absolute path
   */
  private static isAbsolutePath(path: string): boolean {
    // Unix/Linux/macOS absolute paths start with /
    if (path.startsWith('/')) {
      return true;
    }

    // Windows absolute paths (C:\, D:\, etc.)
    if (/^[a-zA-Z]:[\\\/]/.test(path)) {
      return true;
    }

    // UNC paths (\\server\share)
    if (path.startsWith('\\\\') || path.startsWith('//')) {
      return true;
    }

    return false;
  }

  /**
   * Returns the first invalid character found in the path, or null if none
   */
  private static getInvalidCharacter(path: string): string | null {
    // Define invalid characters for file paths
    // These are commonly restricted across different file systems
    const invalidChars = [
      '\0',  // Null character
      '<', '>', ':', '"', '|', '?', '*',  // Windows invalid chars
      '\x01', '\x02', '\x03', '\x04', '\x05', '\x06', '\x07', '\x08',
      '\x09', '\x0A', '\x0B', '\x0C', '\x0D', '\x0E', '\x0F', '\x10',
      '\x11', '\x12', '\x13', '\x14', '\x15', '\x16', '\x17', '\x18',
      '\x19', '\x1A', '\x1B', '\x1C', '\x1D', '\x1E', '\x1F'  // Control characters
    ];

    for (const char of path) {
      if (invalidChars.includes(char)) {
        return char;
      }
    }

    return null;
  }

  /**
   * Type guard to check if a value is a ValidPath
   */
  static isValidPath(value: unknown): value is ValidPath {
    return value instanceof ValidPath;
  }

  /**
   * Equality check for ValidPath instances
   */
  equals(other: ValidPath): boolean {
    return this.path === other.path;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.path;
  }
}