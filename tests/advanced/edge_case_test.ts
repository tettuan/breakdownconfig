import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Result } from "../../src/types/unified_result.ts";
import { ErrorFactories, UnifiedError } from "../../src/errors/unified_errors.ts";

Deno.test("Result handles null and undefined boundaries", () => {
  // Test with null values
  const nullResult = Result.ok(null);
  assertEquals(Result.isOk(nullResult), true);
  assertEquals(nullResult.data, null);
  
  // Test with undefined values
  const undefinedResult = Result.ok(undefined);
  assertEquals(Result.isOk(undefinedResult), true);
  assertEquals(undefinedResult.data, undefined);
  
  // Test mapping over null/undefined
  const mappedNull = Result.map(nullResult, (x) => x ?? "default");
  assertEquals(Result.isOk(mappedNull), true);
  if (Result.isOk(mappedNull)) {
    assertEquals(mappedNull.data, "default");
  }
  
  // Test unwrapOr with null
  const unwrappedNull = Result.unwrapOr(nullResult, "fallback");
  assertEquals(unwrappedNull, null); // Returns the actual null, not fallback
});

Deno.test("Result handles empty collections and edge values", () => {
  // Empty array
  const emptyArrayResult = Result.all([]);
  assertEquals(Result.isOk(emptyArrayResult), true);
  if (Result.isOk(emptyArrayResult)) {
    assertEquals(emptyArrayResult.data, []);
  }
  
  // Single element array
  const singleResult = Result.all([Result.ok(42)]);
  assertEquals(Result.isOk(singleResult), true);
  if (Result.isOk(singleResult)) {
    assertEquals(singleResult.data, [42]);
  }
  
  // Large numbers
  const largeNumber = Result.ok(Number.MAX_SAFE_INTEGER);
  const doubled = Result.map(largeNumber, (n) => n + 1);
  assertEquals(Result.isOk(doubled), true);
  if (Result.isOk(doubled)) {
    assertEquals(doubled.data, Number.MAX_SAFE_INTEGER + 1);
  }
  
  // Empty strings
  const emptyString = Result.ok("");
  const validated = Result.flatMap(emptyString, (s) => 
    s.length > 0 
      ? Result.ok(s) 
      : Result.err(ErrorFactories.requiredFieldMissing("value"))
  );
  assertEquals(Result.isErr(validated), true);
});

Deno.test("Result with nested error propagation", () => {
  interface NestedConfig {
    level1: {
      level2: {
        level3: {
          value: string;
        };
      };
    };
  }
  
  const validateNested = (config: unknown): Result<NestedConfig, UnifiedError> => {
    if (!config || typeof config !== "object") {
      return Result.err(
        ErrorFactories.typeMismatch("config", "object", typeof config, config)
      );
    }
    
    const c = config as any;
    
    // Check level1
    if (!c.level1 || typeof c.level1 !== "object") {
      return Result.err(ErrorFactories.requiredFieldMissing("level1", "config"));
    }
    
    // Check level2
    if (!c.level1.level2 || typeof c.level1.level2 !== "object") {
      return Result.err(ErrorFactories.requiredFieldMissing("level2", "config.level1"));
    }
    
    // Check level3
    if (!c.level1.level2.level3 || typeof c.level1.level2.level3 !== "object") {
      return Result.err(ErrorFactories.requiredFieldMissing("level3", "config.level1.level2"));
    }
    
    // Check value
    if (!c.level1.level2.level3.value || typeof c.level1.level2.level3.value !== "string") {
      return Result.err(
        ErrorFactories.typeMismatch(
          "value",
          "string",
          typeof c.level1.level2.level3.value,
          c.level1.level2.level3.value
        )
      );
    }
    
    return Result.ok(c as NestedConfig);
  };
  
  // Test missing nested fields
  const missingLevel2 = validateNested({ level1: {} });
  assertEquals(Result.isErr(missingLevel2), true);
  if (Result.isErr(missingLevel2)) {
    assertEquals(missingLevel2.error.kind, "REQUIRED_FIELD_MISSING");
    assertEquals((missingLevel2.error as any).field, "level2");
    assertEquals((missingLevel2.error as any).parentObject, "config.level1");
  }
  
  // Test valid nested structure
  const valid = validateNested({
    level1: {
      level2: {
        level3: {
          value: "deep value"
        }
      }
    }
  });
  assertEquals(Result.isOk(valid), true);
});

Deno.test("Result with complex type inference patterns", () => {
  // Function overloading simulation
  function processValue<T extends string | number>(
    value: T
  ): Result<T extends string ? string[] : number[], UnifiedError> {
    if (typeof value === "string") {
      return Result.ok(value.split("") as any);
    } else if (typeof value === "number") {
      return Result.ok([value, value * 2, value * 3] as any);
    }
    return Result.err(
      ErrorFactories.typeMismatch("value", "string | number", typeof value, value)
    );
  }
  
  // Test with string
  const stringResult = processValue("abc");
  if (Result.isOk(stringResult)) {
    assertEquals(stringResult.data, ["a", "b", "c"]);
  }
  
  // Test with number
  const numberResult = processValue(5);
  if (Result.isOk(numberResult)) {
    assertEquals(numberResult.data, [5, 10, 15]);
  }
});

Deno.test("Result error boundaries with async iterators", async () => {
  async function* riskyGenerator(): AsyncGenerator<number, void, unknown> {
    yield 1;
    yield 2;
    throw new Error("Generator error");
  }
  
  const collectResults = async (): Promise<Result<number[], UnifiedError>> => {
    const results: number[] = [];
    
    try {
      for await (const value of riskyGenerator()) {
        results.push(value);
      }
      return Result.ok(results);
    } catch (error) {
      return Result.err(
        ErrorFactories.unknown(error, "async_generator")
      );
    }
  };
  
  const result = await collectResults();
  assertEquals(Result.isErr(result), true);
  if (Result.isErr(result)) {
    assertEquals(result.error.kind, "UNKNOWN_ERROR");
    assertEquals((result.error as any).context, "async_generator");
  }
});

Deno.test("Result with recursive data structures", () => {
  interface TreeNode {
    value: string;
    children?: TreeNode[];
  }
  
  const validateTree = (
    node: unknown,
    depth: number = 0
  ): Result<TreeNode, UnifiedError> => {
    if (depth > 10) {
      return Result.err(
        ErrorFactories.configValidationError("tree", [{
          field: "depth",
          value: depth,
          expectedType: "number <= 10",
          actualType: "number",
          constraint: "Maximum depth exceeded",
        }])
      );
    }
    
    if (!node || typeof node !== "object") {
      return Result.err(
        ErrorFactories.typeMismatch("node", "object", typeof node, node)
      );
    }
    
    const n = node as any;
    
    if (typeof n.value !== "string") {
      return Result.err(
        ErrorFactories.typeMismatch("value", "string", typeof n.value, n.value)
      );
    }
    
    if (n.children && Array.isArray(n.children)) {
      for (const child of n.children) {
        const childResult = validateTree(child, depth + 1);
        if (Result.isErr(childResult)) {
          return childResult;
        }
      }
    }
    
    return Result.ok(n as TreeNode);
  };
  
  // Test valid tree
  const validTree = {
    value: "root",
    children: [
      { value: "child1" },
      {
        value: "child2",
        children: [
          { value: "grandchild" }
        ]
      }
    ]
  };
  
  const result = validateTree(validTree);
  assertEquals(Result.isOk(result), true);
  
  // Test invalid nested value
  const invalidTree = {
    value: "root",
    children: [
      { value: 123 } // Invalid type
    ]
  };
  
  const invalidResult = validateTree(invalidTree);
  assertEquals(Result.isErr(invalidResult), true);
  if (Result.isErr(invalidResult)) {
    assertEquals(invalidResult.error.kind, "TYPE_MISMATCH");
  }
});

Deno.test("Result with プロファイル edge cases", () => {
  // Edge case: プロファイル名 with maximum length
  const longプロファイル = "a".repeat(100) + "-valid";
  const longResult = Result.ok(longプロファイル);
  
  const validated = Result.flatMap(longResult, (name) => {
    if (name.length > 255) {
      return Result.err(
        ErrorFactories.configValidationError("profile", [{
          field: "name",
          value: name,
          expectedType: "string <= 255 chars",
          actualType: "string",
          constraint: "プロファイル名が長すぎます",
        }])
      );
    }
    return Result.ok(name);
  });
  
  assertEquals(Result.isOk(validated), true);
  
  // Edge case: Special characters in error messages
  const specialCharsError = ErrorFactories.configValidationError(
    "path/with/<special>&'\"chars",
    [{
      field: "special",
      value: "value with\nnewlines\tand\ttabs",
      expectedType: "clean string",
      actualType: "string",
      constraint: "特殊文字（改行・タブ）は使用できません",
    }]
  );
  
  const errorResult = Result.err(specialCharsError);
  assertEquals(Result.isErr(errorResult), true);
  assertEquals(errorResult.error.path.includes("<special>&"), true);
});

Deno.test("Result performance with large data sets", () => {
  const sizes = [100, 1000, 10000];
  const performanceResults: Record<number, number> = {};
  
  for (const size of sizes) {
    const results: Result<number, UnifiedError>[] = [];
    
    // Create test data
    for (let i = 0; i < size; i++) {
      if (i % 100 === 99) {
        results.push(Result.err(
          ErrorFactories.configValidationError(`item-${i}`, [{
            field: "index",
            value: i,
            expectedType: "not divisible by 100",
            actualType: "number",
            constraint: "test error",
          }])
        ));
      } else {
        results.push(Result.ok(i));
      }
    }
    
    const start = performance.now();
    const combined = Result.all(results);
    const duration = performance.now() - start;
    
    performanceResults[size] = duration;
    
    // Should fail fast on first error
    assertEquals(Result.isErr(combined), true);
    if (Result.isErr(combined)) {
      assertEquals((combined.error as any).path, "item-99");
    }
  }
  
  // Performance should scale linearly or better
  const ratio1000to100 = performanceResults[1000] / performanceResults[100];
  const ratio10000to1000 = performanceResults[10000] / performanceResults[1000];
  
  // Allow some variance but ensure not exponential
  assertEquals(ratio1000to100 < 15, true, 
    `Performance degraded: 1000/100 ratio = ${ratio1000to100}`);
  assertEquals(ratio10000to1000 < 15, true,
    `Performance degraded: 10000/1000 ratio = ${ratio10000to1000}`);
});