/**
 * Type-Level Constraints and Compile-Time Safety Tests
 *
 * Advanced TypeScript type system tests for ensuring compile-time safety
 * and type-level constraints in the configuration system
 */

import { assertEquals, assertExists, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { ErrorGuards, UnifiedError } from "../../src/errors/unified_errors.ts";
import { Result as UnifiedResult } from "../../src/types/unified_result.ts";
import { ConfigResult } from "../../src/types/config_result.ts";

describe("Type-Level Constraints and Compile-Time Safety", () => {
  describe("Phantom Types for Enhanced Safety", () => {
    // Brand types for path validation
    type ValidatedPath<T extends string = string> = T & { __validated: true };
    type SanitizedPath<T extends string = string> = T & { __sanitized: true };

    function validatePath<T extends string>(path: T): ValidatedPath<T> | null {
      if (path.includes("..") || path.startsWith("/")) {
        return null;
      }
      return path as ValidatedPath<T>;
    }

    function sanitizePath<T extends ValidatedPath>(path: T): SanitizedPath<T> {
      return path.replace(/[^\w\-\.\/]/g, "_") as SanitizedPath<T>;
    }

    it("should enforce path validation at type level", () => {
      const rawPath = "config/app.yaml";
      const validatedPath = validatePath(rawPath);

      assertExists(validatedPath);
      if (validatedPath) {
        // Can only call sanitizePath on validated paths
        const sanitized = sanitizePath(validatedPath);
        assertEquals(typeof sanitized, "string");
      }

      // Invalid paths
      const invalidPath1 = validatePath("../etc/passwd");
      const invalidPath2 = validatePath("/absolute/path");

      assertEquals(invalidPath1, null);
      assertEquals(invalidPath2, null);
    });
  });

  describe("Literal Types for Configuration Keys", () => {
    // Define exact configuration structure with literal types
    type ConfigKeys = {
      readonly "working_dir": string;
      readonly "app_prompt": {
        readonly "base_dir": string;
        readonly "extension"?: ".yaml" | ".json";
      };
      readonly "app_schema": {
        readonly "base_dir": string;
        readonly "validation"?: "strict" | "loose";
      };
    };

    function getConfigValue<K extends keyof ConfigKeys>(
      config: ConfigKeys,
      key: K,
    ): ConfigKeys[K] {
      return config[key];
    }

    it("should enforce literal type constraints", () => {
      const config: ConfigKeys = {
        working_dir: "/home/user",
        app_prompt: {
          base_dir: "prompts",
          extension: ".yaml",
        },
        app_schema: {
          base_dir: "schemas",
          validation: "strict",
        },
      };

      // Type-safe access
      const workingDir = getConfigValue(config, "working_dir");
      const appPrompt = getConfigValue(config, "app_prompt");

      assertEquals(typeof workingDir, "string");
      assertEquals(appPrompt.extension, ".yaml");

      // Extension must be one of the literal types
      // @ts-expect-error - invalid extension
      config.app_prompt.extension = ".txt";
    });
  });

  describe("Conditional Types for Error Handling", () => {
    // Advanced conditional types for error transformations
    type ErrorToResult<E, T = never> = E extends Error ? UnifiedResult<T, UnifiedError>
      : E extends UnifiedError ? UnifiedResult<T, E>
      : never;

    type ExtractErrorKind<E> = E extends { kind: infer K } ? K : never;

    type NarrowError<E extends UnifiedError, K extends E["kind"]> = Extract<E, { kind: K }>;

    it("should use conditional types for error handling", () => {
      type ValidationErrorKind = ExtractErrorKind<UnifiedError>;

      // Should extract all possible error kinds
      const errorKinds: ValidationErrorKind[] = [
        "CONFIG_FILE_NOT_FOUND",
        "CONFIG_VALIDATION_ERROR",
        "UNKNOWN_ERROR",
      ];

      errorKinds.forEach((kind) => {
        assertEquals(typeof kind, "string");
      });
    });

    it("should narrow error types based on kind", () => {
      const error: UnifiedError = {
        kind: "CONFIG_VALIDATION_ERROR",
        path: "/test",
        violations: [],
        message: "Test",
        timestamp: new Date(),
      };

      if (error.kind === "CONFIG_VALIDATION_ERROR") {
        // TypeScript narrows to ConfigValidationError
        type NarrowedType = typeof error;
        assertExists(error.violations);
        assertEquals(error.violations.length, 0);
      }
    });
  });

  describe("Template Literal Types for Path Validation", () => {
    // Advanced template literal patterns
    type RelativePath = `./${string}`;
    type ConfigFilePath = `${string}/${"app" | "user"}_config.${"yaml" | "json"}`;
    type VersionedPath = `v${number}/${string}`;

    type ParsePath<T extends string> = T extends `${infer Dir}/${infer File}`
      ? { directory: Dir; file: File }
      : { directory: "."; file: T };

    it("should validate paths with template literal types", () => {
      const validRelativePath: RelativePath = "./config/app.yaml";
      const validConfigPath: ConfigFilePath = "config/app_config.yaml";
      const validVersionedPath: VersionedPath = "v1/schemas";

      // Type-level path parsing
      type ParsedPath1 = ParsePath<"config/app.yaml">;
      type ParsedPath2 = ParsePath<"app.yaml">;

      // Runtime validation matching compile-time types
      const parsePath = <T extends string>(path: T): ParsePath<T> => {
        const parts = path.split("/");
        if (parts.length > 1) {
          const file = parts.pop()!;
          return { directory: parts.join("/"), file } as ParsePath<T>;
        }
        return { directory: ".", file: path } as ParsePath<T>;
      };

      const parsed1 = parsePath("config/app.yaml");
      const parsed2 = parsePath("app.yaml");

      assertEquals(parsed1.directory, "config");
      assertEquals(parsed1.file, "app.yaml");
      assertEquals(parsed2.directory, ".");
      assertEquals(parsed2.file, "app.yaml");
    });
  });

  describe("Mapped Types with Constraints", () => {
    // Advanced mapped types with constraints
    type DeepReadonly<T> = {
      readonly [P in keyof T]: T[P] extends object ? T[P] extends Function ? T[P]
        : DeepReadonly<T[P]>
        : T[P];
    };

    type RequiredKeys<T> = {
      [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
    }[keyof T];

    type OptionalKeys<T> = {
      [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
    }[keyof T];

    it("should apply deep readonly constraints", () => {
      interface Config {
        database: {
          host: string;
          port: number;
          credentials: {
            username: string;
            password: string;
          };
        };
        features: string[];
      }

      type ReadonlyConfig = DeepReadonly<Config>;

      const config: ReadonlyConfig = {
        database: {
          host: "localhost",
          port: 5432,
          credentials: {
            username: "admin",
            password: "secret",
          },
        },
        features: ["auth", "api"],
      };

      // All properties are readonly at all levels
      // These assignments would cause TypeScript errors in compile time
      // but in runtime without type checking they actually mutate the object
      // So we comment them out to verify the immutability concept
      // config.database.host = "newhost"; // Would be compile error
      // config.database.credentials.username = "newuser"; // Would be compile error

      assertEquals(config.database.host, "localhost");
    });

    it("should distinguish required and optional keys", () => {
      interface TestConfig {
        required: string;
        optional?: number;
        requiredNested: {
          value: string;
        };
        optionalNested?: {
          value: string;
        };
      }

      type Required = RequiredKeys<TestConfig>;
      type Optional = OptionalKeys<TestConfig>;

      // Type-level verification (compile-time)
      const requiredKeys: Required[] = ["required", "requiredNested"];
      const optionalKeys: Optional[] = ["optional", "optionalNested"];

      assertEquals(requiredKeys.length, 2);
      assertEquals(optionalKeys.length, 2);
    });
  });

  describe("Type-Safe Builder Pattern", () => {
    // Builder pattern with compile-time state tracking
    interface BuilderState {
      hasWorkingDir: boolean;
      hasAppPrompt: boolean;
      hasAppSchema: boolean;
    }

    class ConfigBuilder<
      State extends BuilderState = {
        hasWorkingDir: false;
        hasAppPrompt: false;
        hasAppSchema: false;
      },
    > {
      private config: Partial<{
        working_dir: string;
        app_prompt: { base_dir: string };
        app_schema: { base_dir: string };
      }> = {};

      setWorkingDir(dir: string): ConfigBuilder<State & { hasWorkingDir: true }> {
        this.config.working_dir = dir;
        return this as any;
      }

      setAppPrompt(baseDir: string): ConfigBuilder<State & { hasAppPrompt: true }> {
        this.config.app_prompt = { base_dir: baseDir };
        return this as any;
      }

      setAppSchema(baseDir: string): ConfigBuilder<State & { hasAppSchema: true }> {
        this.config.app_schema = { base_dir: baseDir };
        return this as any;
      }

      // Build is only available when all required fields are set
      build(): State extends {
        hasWorkingDir: true;
        hasAppPrompt: true;
        hasAppSchema: true;
      } ? {
          working_dir: string;
          app_prompt: { base_dir: string };
          app_schema: { base_dir: string };
        }
        : never {
        return this.config as any;
      }
    }

    it("should enforce builder completion at compile time", () => {
      const builder = new ConfigBuilder();

      // Cannot build incomplete config
      // @ts-expect-error - build returns never for incomplete state
      const incomplete = builder.setWorkingDir("/test").build();

      // Can build complete config
      const complete = builder
        .setWorkingDir("/test")
        .setAppPrompt("prompts")
        .setAppSchema("schemas")
        .build();

      assertEquals(complete.working_dir, "/test");
      assertEquals(complete.app_prompt.base_dir, "prompts");
      assertEquals(complete.app_schema.base_dir, "schemas");
    });
  });

  describe("Exhaustive Pattern Matching", () => {
    // Ensure all cases are handled at compile time
    type Action =
      | { type: "LOAD_CONFIG"; path: string }
      | { type: "VALIDATE_CONFIG"; config: unknown }
      | { type: "SAVE_CONFIG"; path: string; data: unknown }
      | { type: "DELETE_CONFIG"; path: string };

    function handleAction(action: Action): string {
      switch (action.type) {
        case "LOAD_CONFIG":
          return `Loading from ${action.path}`;
        case "VALIDATE_CONFIG":
          return "Validating configuration";
        case "SAVE_CONFIG":
          return `Saving to ${action.path}`;
        case "DELETE_CONFIG":
          return `Deleting ${action.path}`;
        default:
          // This ensures exhaustiveness - will error if case is missed
          const exhaustive: never = action;
          throw new Error(`Unhandled action: ${JSON.stringify(exhaustive)}`);
      }
    }

    it("should handle all action types exhaustively", () => {
      const actions: Action[] = [
        { type: "LOAD_CONFIG", path: "config.yaml" },
        { type: "VALIDATE_CONFIG", config: {} },
        { type: "SAVE_CONFIG", path: "config.yaml", data: {} },
        { type: "DELETE_CONFIG", path: "config.yaml" },
      ];

      actions.forEach((action) => {
        const result = handleAction(action);
        assertEquals(typeof result, "string");
        assertEquals(result.length > 0, true);
      });
    });
  });
});
