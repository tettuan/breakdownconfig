import { isAbsolute, join, normalize } from "https://deno.land/std@0.224.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.224.0/fs/exists.ts";
import { Result } from "../types/unified_result.ts";
import { ErrorFactories, type UnifiedError } from "../errors/unified_errors.ts";
import { ValidPath } from "../utils/valid_path.ts";

/**
 * PathValidator - Validates and safely manipulates file paths
 *
 * This module provides:
 * 1. Complete path validation with Result types
 * 2. Safe path joining without traversal
 * 3. File/directory existence checking
 */
export class PathValidator {
  /**
   * Validates a path and returns a ValidPath instance
   * @param path - The path to validate
   * @returns Result containing ValidPath or UnifiedError
   */
  static validate(path: string): Result<ValidPath, UnifiedError> {
    return ValidPath.create(path);
  }

  /**
   * Safely joins multiple path segments
   * @param basePath - The base path (must be valid)
   * @param segments - Additional path segments to join
   * @returns Result containing the joined ValidPath or UnifiedError
   */
  static safeJoin(
    basePath: string | ValidPath,
    ...segments: string[]
  ): Result<ValidPath, UnifiedError> {
    // Extract the base path string
    const baseStr = typeof basePath === "string" ? basePath : basePath.getValue();

    // Validate the base path first
    if (typeof basePath === "string") {
      const baseValidation = ValidPath.create(baseStr);
      if (!baseValidation.success) {
        return baseValidation;
      }
    }

    // Filter out empty segments
    const validSegments = segments.filter((seg) => seg && seg.trim().length > 0);

    // Validate each segment
    for (const segment of validSegments) {
      // Check for path traversal in segments
      if (segment.includes("..") || isAbsolute(segment)) {
        return Result.err(
          ErrorFactories.pathValidationError(segment, "PATH_TRAVERSAL", "segment"),
        );
      }

      // Check for invalid characters in segments
      const segmentValidation = ValidPath.create(segment);
      if (!segmentValidation.success) {
        return segmentValidation;
      }
    }

    // Join and normalize the path
    const joinedPath = join(baseStr, ...validSegments);
    const normalizedPath = normalize(joinedPath);

    // Final validation of the joined path
    return ValidPath.create(normalizedPath);
  }

  /**
   * Checks if a path exists and returns the result
   * @param path - The path to check (string or ValidPath)
   * @returns Result containing boolean (true if exists) or error
   */
  static async checkExists(
    path: string | ValidPath,
  ): Promise<Result<boolean, UnifiedError>> {
    // Extract the path string
    const pathStr = typeof path === "string" ? path : path.getValue();

    // Validate the path first if it's a string
    if (typeof path === "string") {
      const validation = ValidPath.create(pathStr);
      if (!validation.success) {
        return validation;
      }
    }

    try {
      const fileExists = await exists(pathStr);
      return Result.ok(fileExists);
    } catch (error: unknown) {
      return Result.err(
        ErrorFactories.unknown(
          error instanceof Error ? error : new Error(String(error)),
          "pathValidator.checkExists",
        ),
      );
    }
  }

  /**
   * Validates that a path exists
   * @param path - The path to validate (string or ValidPath)
   * @returns Result containing ValidPath if exists, or error
   */
  static async validateExists(
    path: string | ValidPath,
  ): Promise<Result<ValidPath, UnifiedError>> {
    // First validate the path format
    let validPath: ValidPath;
    if (typeof path === "string") {
      const validation = ValidPath.create(path);
      if (!validation.success) {
        return validation;
      }
      validPath = validation.data;
    } else {
      validPath = path;
    }

    // Then check if it exists
    const existsResult = await this.checkExists(validPath);
    if (!existsResult.success) {
      return Result.err(existsResult.error);
    }

    if (!existsResult.data) {
      return Result.err(
        ErrorFactories.pathValidationError(
          validPath.getValue(),
          "PATH_TRAVERSAL",
          "path",
        ),
      );
    }

    return Result.ok(validPath);
  }

  /**
   * Ensures a path is within a base directory (no escaping)
   * @param basePath - The base directory path
   * @param targetPath - The target path to check
   * @returns Result containing ValidPath if valid, or UnifiedError
   */
  static ensureWithinBase(
    basePath: string | ValidPath,
    targetPath: string | ValidPath,
  ): Result<ValidPath, UnifiedError> {
    // Extract path strings
    const baseStr = typeof basePath === "string" ? basePath : basePath.getValue();
    const targetStr = typeof targetPath === "string" ? targetPath : targetPath.getValue();

    // Validate both paths
    if (typeof basePath === "string") {
      const baseValidation = ValidPath.create(baseStr);
      if (!baseValidation.success) {
        return baseValidation;
      }
    }

    let validTarget: ValidPath;
    if (typeof targetPath === "string") {
      const targetValidation = ValidPath.create(targetStr);
      if (!targetValidation.success) {
        return targetValidation;
      }
      validTarget = targetValidation.data;
    } else {
      validTarget = targetPath;
    }

    // Normalize both paths for comparison
    const normalizedBase = normalize(baseStr);
    const normalizedTarget = normalize(targetStr);

    // Check if target is within base
    if (!normalizedTarget.startsWith(normalizedBase)) {
      return Result.err(
        ErrorFactories.pathValidationError(targetStr, "PATH_TRAVERSAL", "path"),
      );
    }

    return Result.ok(validTarget);
  }

  /**
   * Gets the relative path from base to target
   * @param basePath - The base directory path
   * @param targetPath - The target path
   * @returns Result containing the relative ValidPath or error
   */
  static getRelativePath(
    basePath: string | ValidPath,
    targetPath: string | ValidPath,
  ): Result<ValidPath, UnifiedError> {
    // Extract path strings
    const baseStr = typeof basePath === "string" ? basePath : basePath.getValue();
    const targetStr = typeof targetPath === "string" ? targetPath : targetPath.getValue();

    // Validate both paths
    if (typeof basePath === "string") {
      const baseValidation = ValidPath.create(baseStr);
      if (!baseValidation.success) {
        return baseValidation;
      }
    }

    if (typeof targetPath === "string") {
      const targetValidation = ValidPath.create(targetStr);
      if (!targetValidation.success) {
        return targetValidation;
      }
    }

    // Normalize paths
    const normalizedBase = normalize(baseStr);
    const normalizedTarget = normalize(targetStr);

    // Calculate relative path
    if (!normalizedTarget.startsWith(normalizedBase)) {
      return Result.err(
        ErrorFactories.pathValidationError(targetStr, "PATH_TRAVERSAL", "path"),
      );
    }

    // Remove base path and all leading slashes
    let relativePath = normalizedTarget.slice(normalizedBase.length);
    if (relativePath.startsWith("/") || relativePath.startsWith("\\")) {
      relativePath = relativePath.slice(1);
    }

    // If empty, return current directory indicator
    if (!relativePath) {
      relativePath = ".";
    }

    return ValidPath.create(relativePath);
  }
}
