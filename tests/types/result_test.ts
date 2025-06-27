import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Result } from "../../src/types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "../../src/errors/unified_errors.ts";

Deno.test("Result.map transforms data on success", () => {
  const original = Result.ok(42);
  const mapped = Result.map(original, (x) => x * 2);
  
  assertEquals(Result.isOk(mapped), true);
  if (Result.isOk(mapped)) {
    assertEquals(mapped.data, 84);
  }
});

Deno.test("Result.map preserves error on failure", () => {
  const error = ErrorFactories.configFileNotFound("/test/path", "app");
  const original = Result.err(error);
  const mapped = Result.map(original, (x: number) => x * 2);
  
  assertEquals(Result.isErr(mapped), true);
  if (Result.isErr(mapped)) {
    assertEquals(mapped.error.kind, "CONFIG_FILE_NOT_FOUND");
  }
});

Deno.test("Result.flatMap chains operations on success", () => {
  const divide = (a: number, b: number): Result<number, UnifiedError> => {
    if (b === 0) {
      return Result.err(
        ErrorFactories.configValidationError("division", [{
          field: "divisor",
          value: b,
          expectedType: "non-zero number",
          actualType: "number",
          constraint: "must not be zero",
        }])
      );
    }
    return Result.ok(a / b);
  };
  
  const result = Result.ok(100);
  const chained = Result.flatMap(result, (x) => divide(x, 4));
  
  assertEquals(Result.isOk(chained), true);
  if (Result.isOk(chained)) {
    assertEquals(chained.data, 25);
  }
});

Deno.test("Result.flatMap propagates first error", () => {
  const error = ErrorFactories.pathValidationError(
    "/invalid/../path",
    "PATH_TRAVERSAL",
    "config_path"
  );
  
  const result = Result.err(error);
  const chained = Result.flatMap(result, (x: number) => Result.ok(x * 2));
  
  assertEquals(Result.isErr(chained), true);
  if (Result.isErr(chained)) {
    assertEquals(chained.error.kind, "PATH_VALIDATION_ERROR");
    assertEquals(chained.error.reason, "PATH_TRAVERSAL");
  }
});

Deno.test("Result.unwrapOr provides default value on error", () => {
  const error = ErrorFactories.configNotLoaded("loadConfig");
  const result = Result.err(error);
  const value = Result.unwrapOr(result, "default");
  
  assertEquals(value, "default");
});

Deno.test("Result.unwrapOr returns success value", () => {
  const result = Result.ok("success");
  const value = Result.unwrapOr(result, "default");
  
  assertEquals(value, "success");
});

Deno.test("Result.unwrap throws on error with proper message", () => {
  const error = ErrorFactories.invalidProfileName(
    "prod@123"
  );
  const result = Result.err(error);
  
  assertThrows(
    () => Result.unwrap(result),
    Error,
    "Unwrap called on error result"
  );
});

Deno.test("Result.mapErr transforms error value", () => {
  const original = ErrorFactories.configFileNotFound("/test", "app");
  const result = Result.err(original);
  
  const mapped = Result.mapErr(result, (err) => 
    ErrorFactories.unknown(
      new Error(`Wrapped: ${err.message}`),
      "error transformation"
    )
  );
  
  assertEquals(Result.isErr(mapped), true);
  if (Result.isErr(mapped)) {
    assertEquals(mapped.error.kind, "UNKNOWN_ERROR");
    assertEquals(mapped.error.message.includes("Wrapped:"), true);
  }
});

Deno.test("Result.all combines all success values", () => {
  const results: Result<number, UnifiedError>[] = [
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

Deno.test("Result.all returns first error when multiple errors", () => {
  const error1 = ErrorFactories.requiredFieldMissing("field1");
  const error2 = ErrorFactories.typeMismatch(
    "field2",
    "string",
    "number",
    42
  );
  
  const results: Result<number, UnifiedError>[] = [
    Result.ok(1),
    Result.err(error1),
    Result.err(error2),
  ];
  
  const combined = Result.all(results);
  
  assertEquals(Result.isErr(combined), true);
  if (Result.isErr(combined)) {
    assertEquals(combined.error.kind, "REQUIRED_FIELD_MISSING");
    assertEquals((combined.error as any).field, "field1");
  }
});

Deno.test("Result.fromPromise handles successful promise", async () => {
  const promise = Promise.resolve("async value");
  const result = await Result.fromPromise(promise);
  
  assertEquals(Result.isOk(result), true);
  if (Result.isOk(result)) {
    assertEquals(result.data, "async value");
  }
});

Deno.test("Result.fromPromise handles rejected promise with default mapper", async () => {
  const promise = Promise.reject(new Error("async error"));
  const result = await Result.fromPromise(promise);
  
  assertEquals(Result.isErr(result), true);
  if (Result.isErr(result)) {
    assertEquals(result.error.kind, "UNKNOWN_ERROR");
    assertEquals(result.error.message, "async error");
  }
});

Deno.test("Result.fromPromise uses custom error mapper", async () => {
  const promise = Promise.reject(new Error("network timeout"));
  
  const result = await Result.fromPromise(promise, (err) => {
    const message = err instanceof Error ? err.message : String(err);
    return ErrorFactories.fileSystemError(
      "read",
      "network_path",
      message
    );
  });
  
  assertEquals(Result.isErr(result), true);
  if (Result.isErr(result)) {
    assertEquals(result.error.kind, "FILE_SYSTEM_ERROR");
    assertEquals((result.error as any).systemError, "network timeout");
  }
});

Deno.test("Result type with プロファイル prefix validation", () => {
  const validateプロファイルPrefix = (prefix: string): Result<string, UnifiedError> => {
    if (!prefix || prefix.trim() === "") {
      return Result.err(
        ErrorFactories.configValidationError("profile_prefix", [{
          field: "prefix",
          value: prefix,
          expectedType: "non-empty string",
          actualType: "string",
          constraint: "プロファイルプレフィックスは空にできません",
        }])
      );
    }
    
    if (!/^[a-zA-Z0-9-]+$/.test(prefix)) {
      return Result.err(
        ErrorFactories.configValidationError("profile_prefix", [{
          field: "prefix",
          value: prefix,
          expectedType: "alphanumeric with hyphens",
          actualType: "string",
          constraint: "プロファイルプレフィックスは英数字とハイフンのみ使用可能です",
        }])
      );
    }
    
    return Result.ok(prefix);
  };
  
  // Valid cases
  const valid1 = validateプロファイルPrefix("production");
  assertEquals(Result.isOk(valid1), true);
  
  const valid2 = validateプロファイルPrefix("prod-v2");
  assertEquals(Result.isOk(valid2), true);
  
  // Invalid cases
  const invalid1 = validateプロファイルPrefix("");
  assertEquals(Result.isErr(invalid1), true);
  if (Result.isErr(invalid1)) {
    assertEquals((invalid1.error as any).violations[0].constraint, "プロファイルプレフィックスは空にできません");
  }
  
  const invalid2 = validateプロファイルPrefix("prod@123");
  assertEquals(Result.isErr(invalid2), true);
  if (Result.isErr(invalid2)) {
    assertEquals((invalid2.error as any).violations[0].constraint, "プロファイルプレフィックスは英数字とハイフンのみ使用可能です");
  }
});

Deno.test("Result operations are type-safe", () => {
  interface User {
    id: number;
    name: string;
  }
  
  interface UserProfile {
    userId: number;
    displayName: string;
    プロファイル設定: {
      theme: string;
      language: string;
    };
  }
  
  const getUser = (id: number): Result<User, UnifiedError> => {
    if (id <= 0) {
      return Result.err(
        ErrorFactories.configValidationError("user_id", [{
          field: "id",
          value: id,
          expectedType: "positive integer",
          actualType: "number",
          constraint: "must be greater than 0",
        }])
      );
    }
    return Result.ok({ id, name: `User${id}` });
  };
  
  const createProfile = (user: User): Result<UserProfile, UnifiedError> => {
    return Result.ok({
      userId: user.id,
      displayName: user.name.toUpperCase(),
      プロファイル設定: {
        theme: "default",
        language: "ja",
      },
    });
  };
  
  // Chain operations
  const result = Result.flatMap(getUser(123), createProfile);
  
  assertEquals(Result.isOk(result), true);
  if (Result.isOk(result)) {
    assertEquals(result.data.userId, 123);
    assertEquals(result.data.displayName, "USER123");
    assertEquals(result.data.プロファイル設定.language, "ja");
  }
  
  // Error case
  const errorResult = Result.flatMap(getUser(-1), createProfile);
  assertEquals(Result.isErr(errorResult), true);
});

Deno.test("Result helper methods work correctly", () => {
  // Testing success alias
  const success = Result.success("data");
  assertEquals(success.success, true);
  assertEquals(success.data, "data");
  
  // Testing failure alias
  const error = ErrorFactories.unknown(new Error("test"));
  const failure = Result.failure(error);
  assertEquals(failure.success, false);
  assertEquals(failure.error.kind, "UNKNOWN_ERROR");
});

Deno.test("Result type narrowing works with type guards", () => {
  const processResult = (result: Result<string, UnifiedError>): string => {
    if (Result.isOk(result)) {
      // TypeScript knows result.data exists here
      return `Success: ${result.data}`;
    } else {
      // TypeScript knows result.error exists here
      return `Error: ${result.error.message}`;
    }
  };
  
  const successResult = Result.ok("test");
  assertEquals(processResult(successResult), "Success: test");
  
  const errorResult = Result.err(
    ErrorFactories.configNotLoaded("test operation")
  );
  assertEquals(processResult(errorResult).startsWith("Error:"), true);
});