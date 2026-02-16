/**
 * Units Tests for Result type utilities
 * Level 2: Verifies individual function behavior for Result creation, type guards,
 * transformations, unwrapping, aggregation, pattern matching, and async conversion.
 */

import { assert, assertEquals, assertThrows } from "@std/assert";
import { BreakdownLogger } from "@tettuan/breakdownlogger";
import { Result } from "./unified_result.ts";
import type { UnifiedError } from "../errors/unified_errors.ts";
import {
  assertResultErr,
  assertResultOk,
  assertSuccessfulFlatMap,
  assertSuccessfulMap,
} from "../../tests/test_helpers/result_test_helpers.ts";

const logger = new BreakdownLogger();

function makeError(msg: string): UnifiedError {
  return {
    kind: "UNKNOWN_ERROR",
    message: msg,
    timestamp: new Date(),
    originalError: new Error(msg),
  };
}

Deno.test("Units: Result.ok and Result.err creation", async (t) => {
  await t.step("Result.ok(42) creates success with data 42", (): void => {
    logger.debug("error", "Before Result.ok(42)");
    const result = Result.ok(42);
    logger.debug("error", `After Result.ok(42): ${JSON.stringify(result)}`);
    const data = assertResultOk(result);
    assertEquals(data, 42);
  });

  await t.step("Result.err creates failure with error value", (): void => {
    const err = makeError("test error");
    logger.debug("error", "Before Result.err");
    const result = Result.err(err);
    logger.debug("error", `After Result.err: ${JSON.stringify(result)}`);
    const error = assertResultErr(result);
    assertEquals(error.message, "test error");
  });

  await t.step("Result.success(42) is alias for ok", (): void => {
    logger.debug("error", "Before Result.success(42)");
    const result = Result.success(42);
    logger.debug("error", `After Result.success(42): ${JSON.stringify(result)}`);
    const data = assertResultOk(result);
    assertEquals(data, 42);
  });

  await t.step("Result.failure is alias for err", (): void => {
    const err = makeError("fail");
    logger.debug("error", "Before Result.failure");
    const result = Result.failure(err);
    logger.debug("error", `After Result.failure: ${JSON.stringify(result)}`);
    const error = assertResultErr(result);
    assertEquals(error.message, "fail");
  });
});

Deno.test("Units: Result.isOk and Result.isErr type guards", async (t) => {
  await t.step("isOk on success returns true", (): void => {
    const result = Result.ok("hello");
    logger.debug("error", "Before isOk on success");
    const check = Result.isOk(result);
    logger.debug("error", `After isOk on success: ${String(check)}`);
    assert(check);
  });

  await t.step("isOk on failure returns false", (): void => {
    const result = Result.err(makeError("e"));
    logger.debug("error", "Before isOk on failure");
    const check = Result.isOk(result);
    logger.debug("error", `After isOk on failure: ${String(check)}`);
    assert(!check);
  });

  await t.step("isErr on success returns false", (): void => {
    const result = Result.ok(1);
    logger.debug("error", "Before isErr on success");
    const check = Result.isErr(result);
    logger.debug("error", `After isErr on success: ${String(check)}`);
    assert(!check);
  });

  await t.step("isErr on failure returns true", (): void => {
    const result = Result.err(makeError("e"));
    logger.debug("error", "Before isErr on failure");
    const check = Result.isErr(result);
    logger.debug("error", `After isErr on failure: ${String(check)}`);
    assert(check);
  });
});

Deno.test("Units: Result.map transforms success data", async (t) => {
  await t.step("map on success transforms data", (): void => {
    const result = Result.ok(21);
    logger.debug("error", "Before map on success");
    assertSuccessfulMap(result, (x: number): number => x * 2, 42);
    logger.debug("error", "After map on success");
  });

  await t.step("map on error passes through error unchanged", (): void => {
    const err = makeError("original");
    const result: Result<number, UnifiedError> = Result.err(err);
    logger.debug("error", "Before map on error");
    const mapped = Result.map(result, (x: number): number => x * 2);
    logger.debug("error", `After map on error: ${JSON.stringify(mapped)}`);
    const error = assertResultErr(mapped);
    assertEquals(error.message, "original");
  });
});

Deno.test("Units: Result.mapErr transforms error", async (t) => {
  await t.step("mapErr on error transforms the error", (): void => {
    const err = makeError("original");
    const result: Result<number, UnifiedError> = Result.err(err);
    logger.debug("error", "Before mapErr on error");
    const mapped = Result.mapErr(result, (e: UnifiedError): string => e.message);
    logger.debug("error", `After mapErr on error: ${JSON.stringify(mapped)}`);
    const error = assertResultErr(mapped);
    assertEquals(error, "original");
  });

  await t.step("mapErr on success passes through success unchanged", (): void => {
    const result: Result<number, UnifiedError> = Result.ok(42);
    logger.debug("error", "Before mapErr on success");
    const mapped = Result.mapErr(result, (e: UnifiedError): string => e.message);
    logger.debug("error", `After mapErr on success: ${JSON.stringify(mapped)}`);
    const data = assertResultOk(mapped);
    assertEquals(data, 42);
  });
});

Deno.test("Units: Result.flatMap and Result.andThen chaining", async (t) => {
  await t.step("flatMap on success chains to new success", (): void => {
    const result = Result.ok(10);
    logger.debug("error", "Before flatMap success->success");
    assertSuccessfulFlatMap(
      result,
      (x: number): Result<number, UnifiedError> => Result.ok(x + 5),
      15,
    );
    logger.debug("error", "After flatMap success->success");
  });

  await t.step("flatMap on success chains to error (short circuit)", (): void => {
    const result = Result.ok(10);
    const err = makeError("chain error");
    logger.debug("error", "Before flatMap success->error");
    const chained = Result.flatMap(
      result,
      (_x: number): Result<number, UnifiedError> => Result.err(err),
    );
    logger.debug("error", `After flatMap success->error: ${JSON.stringify(chained)}`);
    const error = assertResultErr(chained);
    assertEquals(error.message, "chain error");
  });

  await t.step("flatMap on error short-circuits without calling fn", (): void => {
    const err = makeError("skip");
    const result: Result<number, UnifiedError> = Result.err(err);
    let called = false;
    logger.debug("error", "Before flatMap on error");
    const chained = Result.flatMap(result, (_x: number): Result<number, UnifiedError> => {
      called = true;
      return Result.ok(999);
    });
    logger.debug("error", `After flatMap on error, called: ${String(called)}`);
    assert(!called, "flatMap fn should not be called on error");
    const error = assertResultErr(chained);
    assertEquals(error.message, "skip");
  });

  await t.step("andThen behaves same as flatMap", (): void => {
    const result = Result.ok(5);
    logger.debug("error", "Before andThen");
    const chained = Result.andThen(
      result,
      (x: number): Result<number, UnifiedError> => Result.ok(x * 3),
    );
    logger.debug("error", `After andThen: ${JSON.stringify(chained)}`);
    const data = assertResultOk(chained);
    assertEquals(data, 15);
  });
});

Deno.test("Units: Result.unwrapOr returns data or default", async (t) => {
  await t.step("unwrapOr on success returns data", (): void => {
    const result = Result.ok(42);
    logger.debug("error", "Before unwrapOr on success");
    const value = Result.unwrapOr(result, 0);
    logger.debug("error", `After unwrapOr on success: ${String(value)}`);
    assertEquals(value, 42);
  });

  await t.step("unwrapOr on error returns default", (): void => {
    const result: Result<number, UnifiedError> = Result.err(makeError("e"));
    logger.debug("error", "Before unwrapOr on error");
    const value = Result.unwrapOr(result, 0);
    logger.debug("error", `After unwrapOr on error: ${String(value)}`);
    assertEquals(value, 0);
  });
});

Deno.test("Units: Result.unwrap throws on error", async (t) => {
  await t.step("unwrap on success returns data", (): void => {
    const result = Result.ok("hello");
    logger.debug("error", "Before unwrap on success");
    const value = Result.unwrap(result);
    logger.debug("error", `After unwrap on success: ${value}`);
    assertEquals(value, "hello");
  });

  await t.step("unwrap on error throws Error", (): void => {
    const result: Result<number, UnifiedError> = Result.err(makeError("boom"));
    logger.debug("error", "Before unwrap on error (expecting throw)");
    assertThrows(
      (): void => {
        Result.unwrap(result);
      },
      Error,
      "Unwrap called on error result",
    );
    logger.debug("error", "After unwrap on error threw as expected");
  });
});

Deno.test("Units: Result.unwrapErr throws on success", async (t) => {
  await t.step("unwrapErr on error returns error", (): void => {
    const err = makeError("the error");
    const result: Result<number, UnifiedError> = Result.err(err);
    logger.debug("error", "Before unwrapErr on error");
    const error = Result.unwrapErr(result);
    logger.debug("error", `After unwrapErr on error: ${error.message}`);
    assertEquals(error.message, "the error");
  });

  await t.step("unwrapErr on success throws Error", (): void => {
    const result = Result.ok(42);
    logger.debug("error", "Before unwrapErr on success (expecting throw)");
    assertThrows(
      (): void => {
        Result.unwrapErr(result);
      },
      Error,
      "UnwrapErr called on success result",
    );
    logger.debug("error", "After unwrapErr on success threw as expected");
  });
});

Deno.test("Units: Result.all aggregates results", async (t) => {
  await t.step("all with all successes returns array of values", (): void => {
    const results = [Result.ok(1), Result.ok(2), Result.ok(3)];
    logger.debug("error", "Before all with all successes");
    const combined = Result.all(results);
    logger.debug("error", `After all with all successes: ${JSON.stringify(combined)}`);
    const data = assertResultOk(combined);
    assertEquals(data, [1, 2, 3]);
  });

  await t.step("all with first failure stops and returns error", (): void => {
    const err = makeError("first fail");
    const results: Result<number, UnifiedError>[] = [
      Result.ok(1),
      Result.err(err),
      Result.ok(3),
    ];
    logger.debug("error", "Before all with failure");
    const combined = Result.all(results);
    logger.debug("error", `After all with failure: ${JSON.stringify(combined)}`);
    const error = assertResultErr(combined);
    assertEquals(error.message, "first fail");
  });

  await t.step("all with empty array returns success with empty array", (): void => {
    const results: Result<number, UnifiedError>[] = [];
    logger.debug("error", "Before all with empty array");
    const combined = Result.all(results);
    logger.debug("error", `After all with empty array: ${JSON.stringify(combined)}`);
    const data = assertResultOk(combined);
    assertEquals(data, []);
  });
});

Deno.test("Units: Result.allSettled returns all results", async (t) => {
  await t.step("all successes returns same array", (): void => {
    const results = [Result.ok(1), Result.ok(2), Result.ok(3)];
    logger.debug("error", "Before allSettled with all successes");
    const settled = Result.allSettled(results);
    logger.debug("error", `After allSettled all successes: ${JSON.stringify(settled)}`);
    assertEquals(settled.length, 3);
    assertEquals(assertResultOk(settled[0]), 1);
    assertEquals(assertResultOk(settled[1]), 2);
    assertEquals(assertResultOk(settled[2]), 3);
  });

  await t.step("mixed success/failure returns all elements", (): void => {
    const err = makeError("mixed fail");
    const results: Result<number, UnifiedError>[] = [
      Result.ok(1),
      Result.err(err),
      Result.ok(3),
    ];
    logger.debug("error", "Before allSettled with mixed results");
    const settled = Result.allSettled(results);
    logger.debug("error", `After allSettled mixed: ${JSON.stringify(settled)}`);
    assertEquals(settled.length, 3);
    assertEquals(assertResultOk(settled[0]), 1);
    assertEquals(assertResultErr(settled[1]).message, "mixed fail");
    assertEquals(assertResultOk(settled[2]), 3);
  });

  await t.step("empty array returns empty array", (): void => {
    const results: Result<number, UnifiedError>[] = [];
    logger.debug("error", "Before allSettled with empty array");
    const settled = Result.allSettled(results);
    logger.debug("error", `After allSettled empty: ${JSON.stringify(settled)}`);
    assertEquals(settled.length, 0);
  });
});

Deno.test("Units: Result.match pattern matching", async (t) => {
  await t.step("match on success calls onOk", (): void => {
    const result = Result.ok(10);
    logger.debug("error", "Before match on success");
    const matched = Result.match(
      result,
      (data: number): string => `ok:${String(data)}`,
      (_err: UnifiedError): string => "err",
    );
    logger.debug("error", `After match on success: ${matched}`);
    assertEquals(matched, "ok:10");
  });

  await t.step("match on error calls onErr", (): void => {
    const err = makeError("bad");
    const result: Result<number, UnifiedError> = Result.err(err);
    logger.debug("error", "Before match on error");
    const matched = Result.match(
      result,
      (_data: number): string => "ok",
      (e: UnifiedError): string => `err:${e.message}`,
    );
    logger.debug("error", `After match on error: ${matched}`);
    assertEquals(matched, "err:bad");
  });
});

Deno.test("Units: Result.orElse recovers from error", async (t) => {
  await t.step("orElse on success passes through", (): void => {
    const result: Result<number, UnifiedError> = Result.ok(42);
    logger.debug("error", "Before orElse on success");
    const recovered = Result.orElse(
      result,
      (_e: UnifiedError): Result<number, string> => Result.ok(0),
    );
    logger.debug("error", `After orElse on success: ${JSON.stringify(recovered)}`);
    const data = assertResultOk(recovered);
    assertEquals(data, 42);
  });

  await t.step("orElse on error recovers to success", (): void => {
    const err = makeError("recoverable");
    const result: Result<number, UnifiedError> = Result.err(err);
    logger.debug("error", "Before orElse on error");
    const recovered = Result.orElse(
      result,
      (_e: UnifiedError): Result<number, string> => Result.ok(99),
    );
    logger.debug("error", `After orElse on error: ${JSON.stringify(recovered)}`);
    const data = assertResultOk(recovered);
    assertEquals(data, 99);
  });

  await t.step("orElse on error can return new error", (): void => {
    const err = makeError("original error");
    const result: Result<number, UnifiedError> = Result.err(err);
    logger.debug("error", "Before orElse error->error");
    const recovered = Result.orElse(
      result,
      (_e: UnifiedError): Result<number, string> => Result.err("new error"),
    );
    logger.debug("error", `After orElse error->error: ${JSON.stringify(recovered)}`);
    const error = assertResultErr(recovered);
    assertEquals(error, "new error");
  });
});

Deno.test("Units: Result.tap and Result.tapErr side effects", async (t) => {
  await t.step("tap on success calls fn and returns same result", (): void => {
    const result = Result.ok(42);
    let captured = 0;
    logger.debug("error", "Before tap on success");
    const returned = Result.tap(result, (data: number): void => {
      captured = data;
    });
    logger.debug("error", `After tap on success, captured: ${String(captured)}`);
    assertEquals(captured, 42);
    const data = assertResultOk(returned);
    assertEquals(data, 42);
  });

  await t.step("tap on error does not call fn", (): void => {
    const result: Result<number, UnifiedError> = Result.err(makeError("e"));
    let called = false;
    logger.debug("error", "Before tap on error");
    const returned = Result.tap(result, (_data: number): void => {
      called = true;
    });
    logger.debug("error", `After tap on error, called: ${String(called)}`);
    assert(!called, "tap fn should not be called on error");
    assertResultErr(returned);
  });

  await t.step("tapErr on error calls fn and returns same result", (): void => {
    const err = makeError("tapped");
    const result: Result<number, UnifiedError> = Result.err(err);
    let capturedMsg = "";
    logger.debug("error", "Before tapErr on error");
    const returned = Result.tapErr(result, (e: UnifiedError): void => {
      capturedMsg = e.message;
    });
    logger.debug("error", `After tapErr on error, capturedMsg: ${capturedMsg}`);
    assertEquals(capturedMsg, "tapped");
    const error = assertResultErr(returned);
    assertEquals(error.message, "tapped");
  });

  await t.step("tapErr on success does not call fn", (): void => {
    const result: Result<number, UnifiedError> = Result.ok(42);
    let called = false;
    logger.debug("error", "Before tapErr on success");
    const returned = Result.tapErr(result, (_e: UnifiedError): void => {
      called = true;
    });
    logger.debug("error", `After tapErr on success, called: ${String(called)}`);
    assert(!called, "tapErr fn should not be called on success");
    const data = assertResultOk(returned);
    assertEquals(data, 42);
  });
});

Deno.test("Units: Result.fromPromise converts promises", async (t) => {
  await t.step("resolved promise becomes success Result", async (): Promise<void> => {
    logger.debug("error", "Before fromPromise with resolved promise");
    const result = await Result.fromPromise(Promise.resolve(42));
    logger.debug("error", `After fromPromise resolved: ${JSON.stringify(result)}`);
    const data = assertResultOk(result);
    assertEquals(data, 42);
  });

  await t.step(
    "rejected promise becomes error Result with default mapping",
    async (): Promise<void> => {
      logger.debug("error", "Before fromPromise with rejected promise");
      const result = await Result.fromPromise(Promise.reject(new Error("async fail")));
      logger.debug("error", `After fromPromise rejected: ${JSON.stringify(result)}`);
      const error = assertResultErr(result);
      assertEquals(error.kind, "UNKNOWN_ERROR");
      assert(error.message.includes("async fail"));
    },
  );

  await t.step(
    "rejected promise with custom mapper uses mapped error",
    async (): Promise<void> => {
      const mapper = (_err: unknown): UnifiedError => ({
        kind: "UNKNOWN_ERROR",
        message: "custom mapped",
        timestamp: new Date(),
        originalError: _err,
      });
      logger.debug("error", "Before fromPromise with custom mapper");
      const result = await Result.fromPromise(
        Promise.reject(new Error("raw")),
        mapper,
      );
      logger.debug("error", `After fromPromise custom mapper: ${JSON.stringify(result)}`);
      const error = assertResultErr(result);
      assertEquals(error.kind, "UNKNOWN_ERROR");
      assertEquals(error.message, "custom mapped");
    },
  );

  await t.step(
    "rejected promise with non-Error value becomes error Result",
    async (): Promise<void> => {
      logger.debug("error", "Before fromPromise with non-Error rejection");
      const result = await Result.fromPromise(Promise.reject("string rejection"));
      logger.debug("error", `After fromPromise non-Error: ${JSON.stringify(result)}`);
      const error = assertResultErr(result);
      assertEquals(error.kind, "UNKNOWN_ERROR");
    },
  );
});
