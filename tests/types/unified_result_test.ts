import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Result } from "../../src/types/unified_result.ts";
import { UnifiedError } from "../../src/errors/unified_errors.ts";

Deno.test("Result.ok creates success result", () => {
  const result = Result.ok("test data");
  assertEquals(result.success, true);
  assertEquals(result.data, "test data");
});

Deno.test("Result.err creates failure result", () => {
  const error: UnifiedError = {
    kind: "CONFIG_VALIDATION_ERROR",
    path: "/test/path",
    message: "Test error",
    timestamp: new Date(),
    violations: [],
  };
  const result = Result.err(error);
  assertEquals(result.success, false);
  assertEquals(result.error, error);
});

Deno.test("Result.success is alias for ok", () => {
  const result = Result.success(42);
  assertEquals(result.success, true);
  assertEquals(result.data, 42);
});

Deno.test("Result.failure is alias for err", () => {
  const error: UnifiedError = {
    kind: "CONFIG_FILE_NOT_FOUND",
    path: "/test/path",
    configType: "app",
    message: "Not found",
    timestamp: new Date(),
  };
  const result = Result.failure(error);
  assertEquals(result.success, false);
  assertEquals(result.error, error);
});

Deno.test("Result.isOk correctly identifies success", () => {
  const successResult = Result.ok("success");
  const failureResult = Result.err({
    kind: "UNKNOWN_ERROR",
    message: "error",
    timestamp: new Date(),
  });
  
  assertEquals(Result.isOk(successResult), true);
  assertEquals(Result.isOk(failureResult), false);
});

Deno.test("Result.isErr correctly identifies failure", () => {
  const successResult = Result.ok("success");
  const failureResult = Result.err({
    kind: "UNKNOWN_ERROR",
    message: "error",
    timestamp: new Date(),
  });
  
  assertEquals(Result.isErr(successResult), false);
  assertEquals(Result.isErr(failureResult), true);
});

Deno.test("Result.map transforms success value", () => {
  const result = Result.ok(5);
  const mapped = Result.map(result, (n) => n * 2);
  
  assertEquals(Result.isOk(mapped), true);
  if (Result.isOk(mapped)) {
    assertEquals(mapped.data, 10);
  }
});

Deno.test("Result.map passes through error", () => {
  const error: UnifiedError = {
    kind: "CONFIG_VALIDATION_ERROR",
    path: "/test/path",
    message: "error",
    timestamp: new Date(),
    violations: [],
  };
  const result = Result.err(error);
  const mapped = Result.map(result, (n: number) => n * 2);
  
  assertEquals(Result.isErr(mapped), true);
  if (Result.isErr(mapped)) {
    assertEquals(mapped.error, error);
  }
});

Deno.test("Result.mapErr transforms error value", () => {
  const originalError: UnifiedError = {
    kind: "CONFIG_VALIDATION_ERROR",
    path: "/test/path",
    message: "original",
    timestamp: new Date(),
    violations: [],
  };
  const newError: UnifiedError = {
    kind: "UNKNOWN_ERROR",
    message: "transformed",
    timestamp: new Date(),
    originalError: originalError,
  };
  
  const result = Result.err(originalError);
  const mapped = Result.mapErr(result, () => newError);
  
  assertEquals(Result.isErr(mapped), true);
  if (Result.isErr(mapped)) {
    assertEquals(mapped.error, newError);
  }
});

Deno.test("Result.mapErr passes through success", () => {
  const result = Result.ok("success");
  const mapped = Result.mapErr(result, (e: UnifiedError) => ({
    ...e,
    message: "transformed",
  }));
  
  assertEquals(Result.isOk(mapped), true);
  if (Result.isOk(mapped)) {
    assertEquals(mapped.data, "success");
  }
});

Deno.test("Result.flatMap chains success operations", () => {
  const result = Result.ok(5);
  const chained = Result.flatMap(result, (n) => Result.ok(n * 2));
  
  assertEquals(Result.isOk(chained), true);
  if (Result.isOk(chained)) {
    assertEquals(chained.data, 10);
  }
});

Deno.test("Result.flatMap short-circuits on error", () => {
  const error: UnifiedError = {
    kind: "CONFIG_VALIDATION_ERROR",
    path: "/test/path",
    message: "error",
    timestamp: new Date(),
    violations: [],
  };
  const result = Result.err(error);
  const chained = Result.flatMap(result, (n: number) => Result.ok(n * 2));
  
  assertEquals(Result.isErr(chained), true);
  if (Result.isErr(chained)) {
    assertEquals(chained.error, error);
  }
});

Deno.test("Result.unwrapOr returns value on success", () => {
  const result = Result.ok("value");
  const unwrapped = Result.unwrapOr(result, "default");
  assertEquals(unwrapped, "value");
});

Deno.test("Result.unwrapOr returns default on error", () => {
  const result = Result.err({
    kind: "UNKNOWN_ERROR",
    message: "error",
    timestamp: new Date(),
  });
  const unwrapped = Result.unwrapOr(result, "default");
  assertEquals(unwrapped, "default");
});

Deno.test("Result.unwrap returns value on success", () => {
  const result = Result.ok("value");
  const unwrapped = Result.unwrap(result);
  assertEquals(unwrapped, "value");
});

Deno.test("Result.unwrap throws on error", () => {
  const result = Result.err({
    kind: "UNKNOWN_ERROR",
    message: "error",
    timestamp: new Date(),
  });
  
  assertThrows(
    () => Result.unwrap(result),
    Error,
    "Unwrap called on error result"
  );
});

Deno.test("Result.all combines success results", () => {
  const results = [
    Result.ok(1),
    Result.ok(2),
    Result.ok(3),
  ];
  
  const combined = Result.all(results);
  assertEquals(Result.isOk(combined), true);
  if (Result.isOk(combined)) {
    assertEquals(combined.data, [1, 2, 3]);
  }
});

Deno.test("Result.all returns first error", () => {
  const error1: UnifiedError = {
    kind: "CONFIG_VALIDATION_ERROR",
    path: "/test/path1",
    message: "error1",
    timestamp: new Date(),
    violations: [],
  };
  const error2: UnifiedError = {
    kind: "CONFIG_FILE_NOT_FOUND",
    path: "/test/path2",
    configType: "user",
    message: "error2",
    timestamp: new Date(),
  };
  
  const results = [
    Result.ok(1),
    Result.err(error1),
    Result.err(error2),
  ];
  
  const combined = Result.all(results as Result<number, UnifiedError>[]);
  assertEquals(Result.isErr(combined), true);
  if (Result.isErr(combined)) {
    assertEquals(combined.error, error1);
  }
});

Deno.test("Result.fromPromise handles resolved promise", async () => {
  const promise = Promise.resolve("success");
  const result = await Result.fromPromise(promise);
  
  assertEquals(Result.isOk(result), true);
  if (Result.isOk(result)) {
    assertEquals(result.data, "success");
  }
});

Deno.test("Result.fromPromise handles rejected promise with default mapper", async () => {
  const promise = Promise.reject(new Error("test error"));
  const result = await Result.fromPromise(promise);
  
  assertEquals(Result.isErr(result), true);
  if (Result.isErr(result)) {
    assertEquals(result.error.kind, "UNKNOWN_ERROR");
    assertEquals(result.error.message, "test error");
  }
});

Deno.test("Result.fromPromise handles rejected promise with custom mapper", async () => {
  const promise = Promise.reject(new Error("test error"));
  const customMapper = (error: unknown): UnifiedError => ({
    kind: "CONFIG_VALIDATION_ERROR",
    path: "custom",
    message: `Custom: ${error instanceof Error ? error.message : "unknown"}`,
    timestamp: new Date(),
    violations: [],
  });
  
  const result = await Result.fromPromise(promise, customMapper);
  
  assertEquals(Result.isErr(result), true);
  if (Result.isErr(result)) {
    assertEquals(result.error.kind, "CONFIG_VALIDATION_ERROR");
    assertEquals(result.error.message, "Custom: test error");
  }
});

Deno.test("Result type guards work with custom error types", () => {
  type CustomError = { code: string; message: string };
  const customError: CustomError = { code: "ERR001", message: "Custom error" };
  
  const result: Result<string, CustomError> = Result.err(customError);
  
  if (Result.isErr(result)) {
    assertEquals(result.error.code, "ERR001");
  }
});

Deno.test("Result type can handle complex data types", () => {
  interface User {
    id: number;
    name: string;
    email: string;
  }
  
  const user: User = {
    id: 1,
    name: "Test User",
    email: "test@example.com",
  };
  
  const result = Result.ok(user);
  
  assertEquals(Result.isOk(result), true);
  if (Result.isOk(result)) {
    assertEquals(result.data.id, 1);
    assertEquals(result.data.name, "Test User");
    assertEquals(result.data.email, "test@example.com");
  }
});

Deno.test("Result operations can be chained", () => {
  const result1 = Result.ok(5);
  const result2 = Result.map(result1, (n) => n * 2);
  const result3 = Result.flatMap(result2, (n) => n > 8 ? Result.ok(n) : Result.err({
    kind: "CONFIG_VALIDATION_ERROR",
    path: "/test",
    message: "Value too small",
    timestamp: new Date(),
    violations: [],
  }));
  const result4 = Result.map(result3, (n) => n.toString());
  
  assertEquals(Result.isOk(result4), true);
  if (Result.isOk(result4)) {
    assertEquals(result4.data, "10");
  }
});

Deno.test("Result type with プロファイル validation example", () => {
  // プロファイル名の検証例
  const validateProfileName = (name: string): Result<string, UnifiedError> => {
    if (!name || name.trim() === "") {
      return Result.err({
        kind: "CONFIG_VALIDATION_ERROR",
        path: "profile",
        message: "プロファイル名は空にできません",
        timestamp: new Date(),
        violations: [{
          field: "name",
          value: name,
          expectedType: "non-empty string",
          actualType: "string",
          constraint: "cannot be empty",
        }],
      });
    }
    
    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      return Result.err({
        kind: "CONFIG_VALIDATION_ERROR",
        path: "profile",
        message: "プロファイル名は英数字とハイフンのみ使用可能です",
        timestamp: new Date(),
        violations: [{
          field: "name",
          value: name,
          expectedType: "alphanumeric with hyphens",
          actualType: "string",
          constraint: "only alphanumeric characters and hyphens are allowed",
        }],
      });
    }
    
    return Result.ok(name);
  };
  
  const valid = validateProfileName("production");
  assertEquals(Result.isOk(valid), true);
  
  const invalid = validateProfileName("prod@123");
  assertEquals(Result.isErr(invalid), true);
  if (Result.isErr(invalid)) {
    assertEquals(invalid.error.message, "プロファイル名は英数字とハイフンのみ使用可能です");
  }
});