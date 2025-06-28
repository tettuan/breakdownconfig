/**
 * User-level configuration settings using Discriminated Union pattern
 * Provides type-safe representation of different user configuration states
 * Eliminates ambiguity from optional properties
 */

/**
 * Base interface for all user configuration variants
 */
interface BaseUserConfig {
  readonly kind: string;
  /** Additional custom configuration fields */
  readonly customFields?: Record<string, string | number | boolean | { [key: string]: unknown }>;
}

/**
 * Empty user configuration - no overrides provided
 */
export interface EmptyUserConfig extends BaseUserConfig {
  readonly kind: "empty";
}

/**
 * Partial user configuration - only prompt overrides
 */
export interface PromptOnlyUserConfig extends BaseUserConfig {
  readonly kind: "prompt-only";
  readonly app_prompt: {
    readonly base_dir: string;
    readonly [key: string]: unknown;
  };
}

/**
 * Partial user configuration - only schema overrides
 */
export interface SchemaOnlyUserConfig extends BaseUserConfig {
  readonly kind: "schema-only";
  readonly app_schema: {
    readonly base_dir: string;
    readonly [key: string]: unknown;
  };
}

/**
 * Complete user configuration - both prompt and schema overrides
 */
export interface CompleteUserConfig extends BaseUserConfig {
  readonly kind: "complete";
  readonly app_prompt: {
    readonly base_dir: string;
    readonly [key: string]: unknown;
  };
  readonly app_schema: {
    readonly base_dir: string;
    readonly [key: string]: unknown;
  };
}

/**
 * Discriminated Union for all user configuration states
 * Provides type-safe handling of different configuration scenarios
 */
export type UserConfig =
  | EmptyUserConfig
  | PromptOnlyUserConfig
  | SchemaOnlyUserConfig
  | CompleteUserConfig;

/**
 * Legacy UserConfig interface for backward compatibility
 * @deprecated Use UserConfig discriminated union instead
 */
export interface LegacyUserConfig {
  /** Optional prompt configuration overrides */
  app_prompt?: {
    /** Base directory for prompt files */
    base_dir: string;
  };
  /** Optional schema configuration overrides */
  app_schema?: {
    /** Base directory for schema files */
    base_dir: string;
  };
  /** Additional custom configuration fields */
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | { [key: string]: unknown }
    | undefined;
}

/**
 * Smart Constructor for UserConfig
 * Provides type-safe creation of UserConfig instances
 */
export class UserConfigFactory {
  private constructor() {}

  /**
   * Creates an empty user configuration
   */
  static createEmpty(customFields?: Record<string, unknown>): EmptyUserConfig {
    return {
      kind: "empty",
      customFields: customFields as Record<
        string,
        string | number | boolean | { [key: string]: unknown }
      >,
    };
  }

  /**
   * Creates a prompt-only user configuration
   */
  static createPromptOnly(
    promptBaseDir: string,
    customFields?: Record<string, unknown>,
  ): PromptOnlyUserConfig {
    return {
      kind: "prompt-only",
      app_prompt: {
        base_dir: promptBaseDir,
      },
      customFields: customFields as Record<
        string,
        string | number | boolean | { [key: string]: unknown }
      >,
    };
  }

  /**
   * Creates a schema-only user configuration
   */
  static createSchemaOnly(
    schemaBaseDir: string,
    customFields?: Record<string, unknown>,
  ): SchemaOnlyUserConfig {
    return {
      kind: "schema-only",
      app_schema: {
        base_dir: schemaBaseDir,
      },
      customFields: customFields as Record<
        string,
        string | number | boolean | { [key: string]: unknown }
      >,
    };
  }

  /**
   * Creates a complete user configuration
   */
  static createComplete(
    promptBaseDir: string,
    schemaBaseDir: string,
    customFields?: Record<string, unknown>,
  ): CompleteUserConfig {
    return {
      kind: "complete",
      app_prompt: {
        base_dir: promptBaseDir,
      },
      app_schema: {
        base_dir: schemaBaseDir,
      },
      customFields: customFields as Record<
        string,
        string | number | boolean | { [key: string]: unknown }
      >,
    };
  }

  /**
   * Converts legacy UserConfig to new discriminated union format
   */
  static fromLegacy(legacy: LegacyUserConfig): UserConfig {
    const hasPrompt = legacy.app_prompt !== undefined;
    const hasSchema = legacy.app_schema !== undefined;

    // Extract custom fields (excluding app_prompt and app_schema)
    const customFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(legacy)) {
      if (key !== "app_prompt" && key !== "app_schema" && value !== undefined) {
        customFields[key] = value;
      }
    }
    const finalCustomFields = Object.keys(customFields).length > 0 ? customFields : undefined;

    if (hasPrompt && hasSchema) {
      // Preserve ALL app_prompt and app_schema properties, not just base_dir
      const promptWithAll = (() => {
        if (!legacy.app_prompt) throw new Error("app_prompt is required");
        return {
          base_dir: legacy.app_prompt.base_dir,
          ...Object.fromEntries(
            Object.entries(legacy.app_prompt).filter(([key]) => key !== "base_dir"),
          ),
        };
      })();
      const schemaWithAll = (() => {
        if (!legacy.app_schema) throw new Error("app_schema is required");
        return {
          base_dir: legacy.app_schema.base_dir,
          ...Object.fromEntries(
            Object.entries(legacy.app_schema).filter(([key]) => key !== "base_dir"),
          ),
        };
      })();

      return {
        kind: "complete",
        app_prompt: promptWithAll,
        app_schema: schemaWithAll,
        customFields: finalCustomFields,
      } as CompleteUserConfig;
    } else if (hasPrompt) {
      // Preserve ALL app_prompt properties, not just base_dir
      const promptWithAll = (() => {
        if (!legacy.app_prompt) throw new Error("app_prompt is required");
        return {
          base_dir: legacy.app_prompt.base_dir,
          ...Object.fromEntries(
            Object.entries(legacy.app_prompt).filter(([key]) => key !== "base_dir"),
          ),
        };
      })();

      return {
        kind: "prompt-only",
        app_prompt: promptWithAll,
        customFields: finalCustomFields,
      } as unknown as PromptOnlyUserConfig;
    } else if (hasSchema) {
      // Preserve ALL app_schema properties, not just base_dir
      const schemaWithAll = (() => {
        if (!legacy.app_schema) throw new Error("app_schema is required");
        return {
          base_dir: legacy.app_schema.base_dir,
          ...Object.fromEntries(
            Object.entries(legacy.app_schema).filter(([key]) => key !== "base_dir"),
          ),
        };
      })();

      return {
        kind: "schema-only",
        app_schema: schemaWithAll,
        customFields: finalCustomFields,
      } as unknown as SchemaOnlyUserConfig;
    } else {
      return UserConfigFactory.createEmpty(finalCustomFields);
    }
  }

  /**
   * Converts new UserConfig to legacy format for backward compatibility
   */
  static toLegacy(userConfig: UserConfig): LegacyUserConfig {
    const result: LegacyUserConfig = {};

    switch (userConfig.kind) {
      case "empty":
        break;
      case "prompt-only":
        // Restore ALL app_prompt properties, not just base_dir
        result.app_prompt = { ...userConfig.app_prompt };
        break;
      case "schema-only":
        // Restore ALL app_schema properties, not just base_dir
        result.app_schema = { ...userConfig.app_schema };
        break;
      case "complete":
        // Restore ALL properties for both app_prompt and app_schema
        result.app_prompt = { ...userConfig.app_prompt };
        result.app_schema = { ...userConfig.app_schema };
        break;
    }

    // Add custom fields
    if (userConfig.customFields) {
      Object.assign(result, userConfig.customFields);
    }

    return result;
  }
}

/**
 * Type guards for UserConfig discrimination
 */
export function isEmpty(config: UserConfig): config is EmptyUserConfig {
  return config.kind === "empty";
}

export function isPromptOnly(config: UserConfig): config is PromptOnlyUserConfig {
  return config.kind === "prompt-only";
}

export function isSchemaOnly(config: UserConfig): config is SchemaOnlyUserConfig {
  return config.kind === "schema-only";
}

export function isComplete(config: UserConfig): config is CompleteUserConfig {
  return config.kind === "complete";
}

export function hasPromptConfig(
  config: UserConfig,
): config is PromptOnlyUserConfig | CompleteUserConfig {
  return config.kind === "prompt-only" || config.kind === "complete";
}

export function hasSchemaConfig(
  config: UserConfig,
): config is SchemaOnlyUserConfig | CompleteUserConfig {
  return config.kind === "schema-only" || config.kind === "complete";
}

/**
 * Helper functions for working with UserConfig
 */
export function getPromptBaseDir(config: UserConfig): string | undefined {
  if (hasPromptConfig(config)) {
    return config.app_prompt.base_dir;
  }
  return undefined;
}

export function getSchemaBaseDir(config: UserConfig): string | undefined {
  if (hasSchemaConfig(config)) {
    return config.app_schema.base_dir;
  }
  return undefined;
}

export function getCustomFields(config: UserConfig): Record<string, unknown> | undefined {
  return config.customFields;
}

export function getConfigurationLevel(config: UserConfig): "empty" | "partial" | "complete" {
  switch (config.kind) {
    case "empty":
      return "empty";
    case "complete":
      return "complete";
    default:
      return "partial";
  }
}

/**
 * Guards namespace for backward compatibility
 * Contains type guard functions for UserConfig discrimination
 */
export const UserConfigGuards = {
  isEmpty,
  isPromptOnly,
  isSchemaOnly,
  isComplete,
  hasPromptConfig,
  hasSchemaConfig,
} as const;

/**
 * Helpers namespace for backward compatibility
 * Contains helper functions for working with UserConfig
 */
export const UserConfigHelpers = {
  getPromptBaseDir,
  getSchemaBaseDir,
  getCustomFields,
  getConfigurationLevel,
} as const;
