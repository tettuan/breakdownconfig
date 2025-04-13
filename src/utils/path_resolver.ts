/**
 * Path Resolution Utility
 *
 * This module provides utilities for resolving paths using the URL API.
 * It ensures consistent path handling across different platforms and environments.
 */

/**
 * Resolves a path relative to the current module
 * @param relativePath - The path to resolve
 * @param baseUrl - The base URL to resolve against (defaults to current module)
 * @returns The resolved path
 */
export function resolvePath(relativePath: string, baseUrl: URL = new URL(import.meta.url)): string {
  const resolvedUrl = new URL(relativePath, baseUrl);
  return resolvedUrl.pathname;
}

/**
 * Gets the default app config path
 * @returns The default app config path
 */
export function getDefaultAppConfigPath(): string {
  return resolvePath("breakdown/config/app.yml");
}
