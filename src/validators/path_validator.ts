import { isAbsolute, join, normalize } from "https://deno.land/std@0.224.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.224.0/fs/exists.ts";
import { ConfigResult, PathError, Result, UnknownError } from "../types/config_result.ts";
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
   * @returns ConfigResult containing ValidPath or PathError
   */
  static validate(path: string): ConfigResult<ValidPath, PathError> {
    return ValidPath.create(path);
  }

  /**
   * Safely joins multiple path segments
   * @param basePath - The base path (must be valid)
   * @param segments - Additional path segments to join
   * @returns ConfigResult containing the joined ValidPath or PathError
   */
  static safeJoin(
    basePath: string | ValidPath,
    ...segments: string[]
  ): ConfigResult<ValidPath, PathError> {
    // Extract the base path string
    const baseStr = typeof basePath === "string" ? basePath : basePath.getValue();

    // Validate the base path first
    if (typeof basePath === "string") {
      const baseValidation = ValidPath.create(baseStr);
      if (!Result.isOk(baseValidation)) {
        return baseValidation;
      }
    }

    // Filter out empty segments
    const validSegments = segments.filter((seg) => seg && seg.trim().length > 0);

    // Validate each segment
    for (const segment of validSegments) {
      // Check for path traversal in segments
      if (segment.includes("..") || isAbsolute(segment)) {
        return Result.err<PathError>({
          kind: "pathError",
          path: segment,
          reason: "pathTraversal",
          message: `Invalid segment in path join: ${segment}`,
        });
      }

      // Check for invalid characters in segments
      const segmentValidation = ValidPath.create(segment);
      if (!Result.isOk(segmentValidation)) {
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
   * @returns ConfigResult containing boolean (true if exists) or error
   */
  static async checkExists(
    path: string | ValidPath,
  ): Promise<ConfigResult<boolean, PathError | UnknownError>> {
    // Extract the path string
    const pathStr = typeof path === "string" ? path : path.getValue();

    // Validate the path first if it's a string
    if (typeof path === "string") {
      const validation = ValidPath.create(pathStr);
      if (!Result.isOk(validation)) {
        return validation;
      }
    }

    try {
      const fileExists = await exists(pathStr);
      return Result.ok(fileExists);
    } catch (error) {
      return Result.err<UnknownError>({
        kind: "unknownError",
        message: `Failed to check path existence: ${pathStr}`,
        originalError: error,
      });
    }
  }

  /**
   * Validates that a path exists
   * @param path - The path to validate (string or ValidPath)
   * @returns ConfigResult containing ValidPath if exists, or error
   */
  static async validateExists(
    path: string | ValidPath,
  ): Promise<ConfigResult<ValidPath, PathError | UnknownError>> {
    // First validate the path format
    let validPath: ValidPath;
    if (typeof path === "string") {
      const validation = ValidPath.create(path);
      if (!Result.isOk(validation)) {
        return validation;
      }
      validPath = validation.data;
    } else {
      validPath = path;
    }

    // Then check if it exists
    const existsResult = await this.checkExists(validPath);
    if (!Result.isOk(existsResult)) {
      return Result.err(existsResult.error);
    }

    if (!existsResult.data) {
      return Result.err<PathError>({
        kind: "pathError",
        path: validPath.getValue(),
        reason: "pathTraversal", // Using closest available reason
        message: `Path does not exist: ${validPath.getValue()}`,
      });
    }

    return Result.ok(validPath);
  }

  /**
   * Ensures a path is within a base directory (no escaping)
   * @param basePath - The base directory path
   * @param targetPath - The target path to check
   * @returns ConfigResult containing ValidPath if valid, or PathError
   */
  static ensureWithinBase(
    basePath: string | ValidPath,
    targetPath: string | ValidPath,
  ): ConfigResult<ValidPath, PathError> {
    // Extract path strings
    const baseStr = typeof basePath === "string" ? basePath : basePath.getValue();
    const targetStr = typeof targetPath === "string" ? targetPath : targetPath.getValue();

    // Validate both paths
    if (typeof basePath === "string") {
      const baseValidation = ValidPath.create(baseStr);
      if (!Result.isOk(baseValidation)) {
        return baseValidation;
      }
    }

    let validTarget: ValidPath;
    if (typeof targetPath === "string") {
      const targetValidation = ValidPath.create(targetStr);
      if (!Result.isOk(targetValidation)) {
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
      return Result.err<PathError>({
        kind: "pathError",
        path: targetStr,
        reason: "pathTraversal",
        message: `Path '${targetStr}' is outside base directory '${baseStr}'`,
      });
    }

    return Result.ok(validTarget);
  }

  /**
   * Gets the relative path from base to target
   * @param basePath - The base directory path
   * @param targetPath - The target path
   * @returns ConfigResult containing the relative ValidPath or error
   */
  static getRelativePath(
    basePath: string | ValidPath,
    targetPath: string | ValidPath,
  ): ConfigResult<ValidPath, PathError> {
    // Extract path strings
    const baseStr = typeof basePath === "string" ? basePath : basePath.getValue();
    const targetStr = typeof targetPath === "string" ? targetPath : targetPath.getValue();

    // Validate both paths
    if (typeof basePath === "string") {
      const baseValidation = ValidPath.create(baseStr);
      if (!Result.isOk(baseValidation)) {
        return baseValidation;
      }
    }

    if (typeof targetPath === "string") {
      const targetValidation = ValidPath.create(targetStr);
      if (!Result.isOk(targetValidation)) {
        return targetValidation;
      }
    }

    // Normalize paths
    const normalizedBase = normalize(baseStr);
    const normalizedTarget = normalize(targetStr);

    // Calculate relative path
    if (!normalizedTarget.startsWith(normalizedBase)) {
      return Result.err<PathError>({
        kind: "pathError",
        path: targetStr,
        reason: "pathTraversal",
        message: `Cannot get relative path: '${targetStr}' is not within '${baseStr}'`,
      });
    }

    // Remove base path and any leading slashes
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
