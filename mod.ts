/**
 * Entry point for the BreakdownConfig module
 * This module provides functionality for managing application and user configurations.
 * 
 * @module
 */

export * from "./src/mod.ts";
export * from "./src/types.ts";
export { BreakdownConfig } from "./src/breakdown_config.ts";
export type { AppConfig } from "./src/types/app_config.ts";
export type { UserConfig } from "./src/types/user_config.ts";
export type { MergedConfig } from "./src/types/merged_config.ts"; 