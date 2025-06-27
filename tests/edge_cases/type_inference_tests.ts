/**
 * Type Inference Edge Case Tests
 *
 * Tests for advanced TypeScript type system features including:
 * - Union types and discriminated unions
 * - Conditional types and type predicates
 * - Template literal types and mapped types
 * - Generic constraints and inference
 */

import { assertEquals, assertExists, assertInstanceOf } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { ErrorGuards, UnifiedError } from "../../src/errors/unified_errors.ts";
import { ConfigResult } from "../../src/types/config_result.ts";

describe("Type Inference Edge Cases", () => {
  describe("Union Type Discrimination", () => {
    // Test discriminated union patterns used in error handling
    it("should properly discriminate UnifiedError union types", () => {
      const configError: UnifiedError = {
        kind: "CONFIG_VALIDATION_ERROR",
        path: "/test/path",
        violations: [],
        message: "Test validation error",
        timestamp: new Date(),
      };

      // Type narrowing through discriminated union
      if (configError.kind === "CONFIG_VALIDATION_ERROR") {
        // TypeScript should infer this as ConfigValidationError
        assertEquals(configError.violations, []);
        assertEquals(configError.path, "/test/path");
        assertExists(configError.violations); // violations should exist on this type
      }

      // Test type guards
      assertEquals(ErrorGuards.isConfigValidationError(configError), true);
      assertEquals(ErrorGuards.isConfigFileNotFound(configError), false);
    });

    it("should handle complex union type scenarios", () => {
      type ComplexUnion =
        | { type: "string"; value: string }
        | { type: "number"; value: number }
        | { type: "boolean"; value: boolean }
        | { type: "array"; value: unknown[] };

      const testValues: ComplexUnion[] = [
        { type: "string", value: "test" },
        { type: "number", value: 42 },
        { type: "boolean", value: true },
        { type: "array", value: [1, 2, 3] },
      ];

      testValues.forEach((val) => {
        switch (val.type) {
          case "string":
            assertEquals(typeof val.value, "string");
            break;
          case "number":
            assertEquals(typeof val.value, "number");
            break;
          case "boolean":
            assertEquals(typeof val.value, "boolean");
            break;
          case "array":
            assertEquals(Array.isArray(val.value), true);
            break;
        }
      });
    });
  });

  describe("Conditional Type Inference", () => {
    // Test conditional types used in configuration type resolution
    type IsString<T> = T extends string ? true : false;
    type IsArray<T> = T extends unknown[] ? true : false;
    type IsFunction<T> = T extends (...args: any[]) => any ? true : false;

    it("should correctly infer conditional types", () => {
      // Test compile-time type inference
      type StringTest = IsString<string>; // should be true
      type NumberTest = IsString<number>; // should be false
      type ArrayTest = IsArray<string[]>; // should be true
      type FunctionTest = IsFunction<() => void>; // should be true

      // Runtime verification of type behavior
      const stringValue: string = "test";
      const numberValue: number = 42;
      const arrayValue: string[] = ["a", "b"];
      const functionValue = () => {};

      assertEquals(typeof stringValue === "string", true);
      assertEquals(typeof numberValue === "number", true);
      assertEquals(Array.isArray(arrayValue), true);
      assertEquals(typeof functionValue === "function", true);
    });

    it("should handle nested conditional types", () => {
      type DeepConditional<T> = T extends string
        ? T extends `${infer Prefix}_${infer Suffix}` ? [Prefix, Suffix]
        : [T]
        : never;

      // These types would be resolved at compile time
      type Test1 = DeepConditional<"hello_world">; // [string, string]
      type Test2 = DeepConditional<"simple">; // [string]
      type Test3 = DeepConditional<number>; // never

      // Runtime tests to verify the pattern works
      const parseKey = <T extends string>(
        key: T,
      ): T extends `${infer P}_${infer S}` ? [P, S] : [T] => {
        const parts = key.split("_");
        return (parts.length === 2 ? [parts[0], parts[1]] : [key]) as any;
      };

      assertEquals(parseKey("hello_world"), ["hello", "world"]);
      assertEquals(parseKey("simple"), ["simple"]);
    });
  });

  describe("Template Literal Type Inference", () => {
    // Test template literal types used in path and configuration key validation
    type PathPattern = `/${string}` | `./${string}` | `../${string}`;
    type ConfigKey = `app_${string}` | `user_${string}` | `system_${string}`;
    type ErrorCode = `ERR${number}`;

    it("should validate template literal type patterns", () => {
      const validPaths: PathPattern[] = [
        "/absolute/path",
        "./relative/path",
        "../parent/path",
      ];

      const validConfigKeys: ConfigKey[] = [
        "app_prompt",
        "user_config",
        "system_default",
      ];

      const validErrorCodes: ErrorCode[] = [
        "ERR1001",
        "ERR1002",
        "ERR2000",
      ];

      // Verify patterns work correctly
      validPaths.forEach((path) => {
        assertEquals(
          path.startsWith("/") || path.startsWith("./") || path.startsWith("../"),
          true,
        );
      });

      validConfigKeys.forEach((key) => {
        assertEquals(
          key.startsWith("app_") || key.startsWith("user_") || key.startsWith("system_"),
          true,
        );
      });

      validErrorCodes.forEach((code) => {
        assertEquals(code.startsWith("ERR"), true);
        assertEquals(/ERR\d+/.test(code), true);
      });
    });

    it("should handle complex template literal patterns", () => {
      type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
      type ApiEndpoint<M extends HttpMethod, P extends string> = `${M} /api/${P}`;

      type RouteMap = {
        getUsers: ApiEndpoint<"GET", "users">;
        createUser: ApiEndpoint<"POST", "users">;
        updateUser: ApiEndpoint<"PUT", `users/${string}`>;
        deleteUser: ApiEndpoint<"DELETE", `users/${string}`>;
      };

      const routes: RouteMap = {
        getUsers: "GET /api/users",
        createUser: "POST /api/users",
        updateUser: "PUT /api/users/123",
        deleteUser: "DELETE /api/users/123",
      };

      Object.values(routes).forEach((route) => {
        assertEquals(route.includes("/api/"), true);
        assertEquals(/^(GET|POST|PUT|DELETE) /.test(route), true);
      });
    });
  });

  describe("Mapped Type Inference", () => {
    // Test mapped types used in configuration transformation
    type MakeOptional<T> = {
      [K in keyof T]?: T[K];
    };

    type MakeReadonly<T> = {
      readonly [K in keyof T]: T[K];
    };

    type ConfigBase = {
      working_dir: string;
      app_prompt: { base_dir: string };
      app_schema: { base_dir: string };
    };

    it("should handle mapped type transformations", () => {
      type OptionalConfig = MakeOptional<ConfigBase>;
      type ReadonlyConfig = MakeReadonly<ConfigBase>;

      const optionalConfig: OptionalConfig = {
        working_dir: "/test",
        // Other fields are optional
      };

      const readonlyConfig: ReadonlyConfig = {
        working_dir: "/test",
        app_prompt: { base_dir: "/prompts" },
        app_schema: { base_dir: "/schemas" },
      };

      assertEquals(optionalConfig.working_dir, "/test");
      assertEquals(readonlyConfig.working_dir, "/test");

      // Verify readonly nature (would be compile-time error if we tried to modify)
      assertExists(readonlyConfig.app_prompt.base_dir);
    });

    it("should handle conditional mapped types", () => {
      type Nullish<T> = {
        [K in keyof T]: T[K] | null | undefined;
      };

      type NonNullish<T> = {
        [K in keyof T]: NonNullable<T[K]>;
      };

      type TestType = {
        required: string;
        optional?: number;
      };

      type NullishTest = Nullish<TestType>;
      type NonNullishTest = NonNullish<TestType>;

      const nullishValue: NullishTest = {
        required: null, // Can be null
        optional: undefined, // Can be undefined
      };

      const nonNullishValue: NonNullishTest = {
        required: "test", // Must be non-null
        optional: 42, // Must be non-null if present
      };

      assertEquals(nullishValue.required, null);
      assertEquals(nonNullishValue.required, "test");
    });
  });

  describe("Generic Constraint Inference", () => {
    // Test generic constraints used in loader and validator types
    interface Loadable {
      load(): Promise<unknown>;
    }

    interface Validatable {
      validate(): boolean;
    }

    function processLoadable<T extends Loadable>(item: T): Promise<T> {
      return item.load().then(() => item);
    }

    function processValidatable<T extends Validatable>(item: T): T | null {
      return item.validate() ? item : null;
    }

    it("should handle generic constraints correctly", async () => {
      class TestLoader implements Loadable {
        loaded = false;

        async load() {
          this.loaded = true;
          return this;
        }
      }

      class TestValidator implements Validatable {
        valid: boolean;

        constructor(valid: boolean) {
          this.valid = valid;
        }

        validate(): boolean {
          return this.valid;
        }
      }

      const loader = new TestLoader();
      const result = await processLoadable(loader);

      assertEquals(result.loaded, true);
      assertInstanceOf(result, TestLoader);

      const validValidator = new TestValidator(true);
      const invalidValidator = new TestValidator(false);

      assertEquals(processValidatable(validValidator), validValidator);
      assertEquals(processValidatable(invalidValidator), null);
    });

    it("should handle multiple constraint inference", () => {
      interface Named {
        name: string;
      }

      interface Timestamped {
        timestamp: Date;
      }

      function processEntity<T extends Named & Timestamped>(entity: T): string {
        return `${entity.name} at ${entity.timestamp.toISOString()}`;
      }

      const testEntity = {
        name: "Test Entity",
        timestamp: new Date("2023-01-01T00:00:00Z"),
        additionalProp: "extra",
      };

      const result = processEntity(testEntity);
      assertEquals(result, "Test Entity at 2023-01-01T00:00:00.000Z");
    });
  });

  describe("Type Predicate Inference", () => {
    // Test type predicates used in error type checking
    function isString(value: unknown): value is string {
      return typeof value === "string";
    }

    function isConfigResult<T>(value: unknown): value is ConfigResult<T, UnifiedError> {
      return typeof value === "object" &&
        value !== null &&
        "success" in value &&
        typeof (value as any).success === "boolean";
    }

    it("should properly narrow types with predicates", () => {
      const unknownValue: unknown = "test string";

      if (isString(unknownValue)) {
        // TypeScript should narrow this to string
        assertEquals(unknownValue.length, 11);
        assertEquals(unknownValue.charAt(0), "t");
      }

      const resultLike = { success: true, data: "test" };

      if (isConfigResult(resultLike)) {
        assertEquals(resultLike.success, true);
        // TypeScript should know this has success property
      }
    });

    it("should handle complex type predicate scenarios", () => {
      type Result<T, E> = { success: true; data: T } | { success: false; error: E };

      function isSuccessResult<T, E>(result: Result<T, E>): result is { success: true; data: T } {
        return result.success === true;
      }

      function isErrorResult<T, E>(result: Result<T, E>): result is { success: false; error: E } {
        return result.success === false;
      }

      const successResult: Result<string, Error> = { success: true, data: "success" };
      const errorResult: Result<string, Error> = { success: false, error: new Error("fail") };

      if (isSuccessResult(successResult)) {
        assertEquals(successResult.data, "success");
      }

      if (isErrorResult(errorResult)) {
        assertEquals(errorResult.error.message, "fail");
      }
    });
  });

  describe("Recursive Type Inference", () => {
    // Test recursive types that might be used in nested configuration structures
    type NestedConfig = {
      [key: string]: string | number | boolean | NestedConfig;
    };

    type TreeNode<T> = {
      value: T;
      children?: TreeNode<T>[];
    };

    it("should handle recursive type structures", () => {
      const config: NestedConfig = {
        database: {
          host: "localhost",
          port: 5432,
          ssl: {
            enabled: true,
            cert: "/path/to/cert",
          },
        },
        logging: {
          level: "info",
          targets: {
            console: true,
            file: "/var/log/app.log",
          },
        },
      };

      // Verify recursive structure access
      assertEquals(typeof config.database, "object");
      assertEquals((config.database as NestedConfig).host, "localhost");
      assertEquals(((config.database as NestedConfig).ssl as NestedConfig).enabled, true);
    });

    it("should handle tree-like recursive structures", () => {
      const tree: TreeNode<string> = {
        value: "root",
        children: [
          {
            value: "child1",
            children: [
              { value: "grandchild1" },
              { value: "grandchild2" },
            ],
          },
          {
            value: "child2",
          },
        ],
      };

      assertEquals(tree.value, "root");
      assertEquals(tree.children?.[0].value, "child1");
      assertEquals(tree.children?.[0].children?.[0].value, "grandchild1");
      assertEquals(tree.children?.[1].children, undefined);
    });
  });
});
