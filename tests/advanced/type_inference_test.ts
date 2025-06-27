import {
  assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Result } from "../../src/types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "../../src/errors/unified_errors.ts";

Deno.test("Result type inference with complex generic constraints", () => {
  // Complex type constraint
  type ConfigValue = string | number | boolean | ConfigValue[] | { [key: string]: ConfigValue };
  
  const validateConfigValue = <T extends ConfigValue>(
    value: unknown,
    validator: (v: unknown) => v is T
  ): Result<T, UnifiedError> => {
    if (validator(value)) {
      return Result.ok(value);
    }
    return Result.err(
      ErrorFactories.typeMismatch("value", "ConfigValue", typeof value, value)
    );
  };
  
  // String validator
  const isString = (v: unknown): v is string => typeof v === "string";
  const stringResult = validateConfigValue("test", isString);
  
  assertEquals(Result.isOk(stringResult), true);
  if (Result.isOk(stringResult)) {
    // TypeScript should infer this as string
    const length: number = stringResult.data.length;
    assertEquals(length, 4);
  }
  
  // Number validator
  const isNumber = (v: unknown): v is number => typeof v === "number";
  const numberResult = validateConfigValue(42, isNumber);
  
  assertEquals(Result.isOk(numberResult), true);
  if (Result.isOk(numberResult)) {
    // TypeScript should infer this as number
    const doubled: number = numberResult.data * 2;
    assertEquals(doubled, 84);
  }
});

Deno.test("Result with conditional types and mapped types", () => {
  // Conditional type helper
  type ProfileConfigType<T extends string> = T extends "development"
    ? { debug: boolean; verbose: boolean }
    : T extends "production"
    ? { optimized: boolean; monitoring: boolean }
    : { basic: true };
  
  function loadプロファイルConfig<T extends string>(
    profileName: T
  ): Result<ProfileConfigType<T>, UnifiedError> {
    switch (profileName) {
      case "development":
        return Result.ok({ debug: true, verbose: true } as ProfileConfigType<T>);
      case "production":
        return Result.ok({ optimized: true, monitoring: true } as ProfileConfigType<T>);
      default:
        return Result.ok({ basic: true } as ProfileConfigType<T>);
    }
  }
  
  // Test development profile
  const devConfig = loadプロファイルConfig("development");
  if (Result.isOk(devConfig)) {
    // TypeScript should know this has debug and verbose properties
    assertEquals(devConfig.data.debug, true);
    assertEquals(devConfig.data.verbose, true);
  }
  
  // Test production profile
  const prodConfig = loadプロファイルConfig("production");
  if (Result.isOk(prodConfig)) {
    // TypeScript should know this has optimized and monitoring properties
    assertEquals(prodConfig.data.optimized, true);
    assertEquals(prodConfig.data.monitoring, true);
  }
  
  // Test other profile
  const otherConfig = loadプロファイルConfig("staging");
  if (Result.isOk(otherConfig)) {
    // TypeScript should know this has basic property
    assertEquals(otherConfig.data.basic, true);
  }
});

Deno.test("Result with higher-order type operations", () => {
  // Extract type from Result
  type ExtractOk<T> = T extends Result<infer U, any> ? U : never;
  type ExtractErr<T> = T extends Result<any, infer E> ? E : never;
  
  type TestResult = Result<string, UnifiedError>;
  type OkType = ExtractOk<TestResult>; // Should be string
  type ErrorType = ExtractErr<TestResult>; // Should be UnifiedError
  
  const testValue: OkType = "test"; // Should work
  assertEquals(testValue, "test");
  
  // Create error of correct type
  const testError: ErrorType = ErrorFactories.unknownError("test");
  assertEquals(testError.kind, "UNKNOWN_ERROR");
});

Deno.test("Result with recursive type inference", () => {
  // Recursive type for nested validation
  type ValidationSchema<T> = {
    [K in keyof T]: T[K] extends object
      ? ValidationSchema<T[K]>
      : (value: unknown) => Result<T[K], UnifiedError>;
  };
  
  interface Nestedプロファイル {
    name: string;
    settings: {
      theme: string;
      lang: string;
    };
    features: string[];
  }
  
  const schema: ValidationSchema<Nestedプロファイル> = {
    name: (v) => typeof v === "string" 
      ? Result.ok(v)
      : Result.err(ErrorFactories.typeMismatch("name", "string", typeof v, v)),
    
    settings: {
      theme: (v) => typeof v === "string"
        ? Result.ok(v)
        : Result.err(ErrorFactories.typeMismatch("theme", "string", typeof v, v)),
      
      lang: (v) => typeof v === "string"
        ? Result.ok(v)
        : Result.err(ErrorFactories.typeMismatch("lang", "string", typeof v, v)),
    },
    
    features: (v) => Array.isArray(v) && v.every(item => typeof item === "string")
      ? Result.ok(v)
      : Result.err(ErrorFactories.typeMismatch("features", "string[]", typeof v, v)),
  };
  
  // Use schema (simplified validation)
  const nameResult = schema.name("production");
  assertEquals(Result.isOk(nameResult), true);
  
  const themeResult = schema.settings.theme("dark");
  assertEquals(Result.isOk(themeResult), true);
});

Deno.test("Result with advanced generic variance", () => {
  // Covariant and contravariant behavior
  interface Animal { kind: string; }
  interface Dog extends Animal { breed: string; }
  interface Cat extends Animal { meows: boolean; }
  
  const createAnimal = (): Result<Animal, UnifiedError> => {
    return Result.ok({ kind: "animal" });
  };
  
  const createDog = (): Result<Dog, UnifiedError> => {
    return Result.ok({ kind: "dog", breed: "labrador" });
  };
  
  // Test that Dog result can be assigned to Animal result (covariance)
  const animalResult: Result<Animal, UnifiedError> = createDog();
  assertEquals(Result.isOk(animalResult), true);
  
  // Test mapping preserves variance
  const mappedAnimal = Result.map(createDog(), (dog): Animal => dog);
  assertEquals(Result.isOk(mappedAnimal), true);
  if (Result.isOk(mappedAnimal)) {
    assertEquals(mappedAnimal.data.kind, "dog");
  }
});

Deno.test("Result with union type discrimination", () => {
  type プロファイルResult = 
    | { type: "app"; config: { name: string; version: string } }
    | { type: "user"; config: { theme: string; lang: string } }
    | { type: "system"; config: { paths: string[] } };
  
  const loadプロファイル = (type: string): Result<プロファイルResult, UnifiedError> => {
    switch (type) {
      case "app":
        return Result.ok({
          type: "app",
          config: { name: "MyApp", version: "1.0.0" }
        });
      case "user":
        return Result.ok({
          type: "user",
          config: { theme: "dark", lang: "ja" }
        });
      case "system":
        return Result.ok({
          type: "system",
          config: { paths: ["/usr/local", "/opt"] }
        });
      default:
        return Result.err(
          ErrorFactories.configValidationError("profile_type", [{
            field: "type",
            value: type,
            expectedType: "app | user | system",
            actualType: "string",
            constraint: "Invalid profile type",
          }])
        );
    }
  };
  
  const processプロファイル = (result: Result<プロファイルResult, UnifiedError>): string => {
    if (Result.isErr(result)) {
      return `Error: ${result.error.message}`;
    }
    
    const profile = result.data;
    // TypeScript discriminated union
    switch (profile.type) {
      case "app":
        // TypeScript knows config has name and version
        return `App: ${profile.config.name} v${profile.config.version}`;
      case "user":
        // TypeScript knows config has theme and lang
        return `User: ${profile.config.theme} theme, ${profile.config.lang} language`;
      case "system":
        // TypeScript knows config has paths
        return `System: ${profile.config.paths.join(", ")}`;
    }
  };
  
  const appResult = loadプロファイル("app");
  assertEquals(processプロファイル(appResult), "App: MyApp v1.0.0");
  
  const invalidResult = loadプロファイル("invalid");
  assertEquals(processプロファイル(invalidResult).startsWith("Error:"), true);
});

Deno.test("Result with template literal types", () => {
  // Template literal types for profile names
  type EnvironmentPrefix = "dev" | "staging" | "prod";
  type VersionSuffix = "v1" | "v2" | "v3";
  type ProfileName = `${EnvironmentPrefix}-${VersionSuffix}`;
  
  const validateプロファイルName = (name: string): Result<ProfileName, UnifiedError> => {
    const validNames: ProfileName[] = [
      "dev-v1", "dev-v2", "dev-v3",
      "staging-v1", "staging-v2", "staging-v3",
      "prod-v1", "prod-v2", "prod-v3"
    ];
    
    if (validNames.includes(name as ProfileName)) {
      return Result.ok(name as ProfileName);
    }
    
    return Result.err(
      ErrorFactories.invalidProfileName(name)
    );
  };
  
  // Test valid names
  const validResult = validateプロファイルName("prod-v2");
  assertEquals(Result.isOk(validResult), true);
  if (Result.isOk(validResult)) {
    // TypeScript knows this is a valid template literal type
    const name: ProfileName = validResult.data;
    assertEquals(name, "prod-v2");
  }
  
  // Test invalid name
  const invalidResult = validateプロファイルName("invalid-name");
  assertEquals(Result.isErr(invalidResult), true);
});

Deno.test("Result with function overloading and type inference", () => {
  // Overloaded function signatures
  function parseConfig(input: string): Result<object, UnifiedError>;
  function parseConfig(input: object): Result<object, UnifiedError>;
  function parseConfig(input: string | object): Result<object, UnifiedError> {
    if (typeof input === "string") {
      try {
        return Result.ok(JSON.parse(input));
      } catch (e) {
        return Result.err(
          ErrorFactories.configParseError("inline", e instanceof Error ? e.message : String(e))
        );
      }
    } else {
      return Result.ok(input);
    }
  }
  
  // Test with string - TypeScript should infer correct overload
  const stringResult = parseConfig('{"key": "value"}');
  assertEquals(Result.isOk(stringResult), true);
  
  // Test with object - TypeScript should infer correct overload
  const objectResult = parseConfig({ key: "value" });
  assertEquals(Result.isOk(objectResult), true);
});

Deno.test("Result with branded types and phantom types", () => {
  // Branded type for validated プロファイル
  type ValidatedProfileName = string & { readonly __brand: unique symbol };
  
  const validateAndBrand = (name: string): Result<ValidatedProfileName, UnifiedError> => {
    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      return Result.err(ErrorFactories.invalidProfileName(name));
    }
    
    // Brand the type after validation
    return Result.ok(name as ValidatedProfileName);
  };
  
  const useValidatedName = (name: ValidatedProfileName): string => {
    // This function can only accept validated names
    return `Using validated profile: ${name}`;
  };
  
  const result = validateAndBrand("valid-name");
  if (Result.isOk(result)) {
    const message = useValidatedName(result.data);
    assertEquals(message, "Using validated profile: valid-name");
  }
  
  // This would cause a TypeScript error:
  // useValidatedName("unvalidated"); // Error: string is not ValidatedProfileName
});