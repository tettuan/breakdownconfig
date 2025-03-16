/**
 * Type definitions for the BreakdownConfig module
 * This module contains all the interface and type definitions used in the configuration system.
 */

export interface PromptConfig {
  base_dir: string;
}

export interface SchemaConfig {
  base_dir: string;
}

export interface AppConfig {
  working_dir: string;
  app_prompt: PromptConfig;
  app_schema: SchemaConfig;
}

export interface UserConfig {
  app_prompt?: PromptConfig;
  app_schema?: SchemaConfig;
}

export type ConfigRecord = {
  working_dir?: string;
  app_prompt?: { base_dir?: string };
  app_schema?: { base_dir?: string };
  [key: string]: unknown;
}; 