/**
 * Units Tests for throw_to_result conversion functions
 * Level 2: Verifies individual function behavior and business logic
 */

import { assertEquals } from "@std/assert";
import { BreakdownLogger } from "@tettuan/breakdownlogger";
import { errorCodeToUnifiedError, userConfigErrorToResult } from "./throw_to_result.ts";
import { ErrorCode } from "../error_manager.ts";
import {
  assertResultErr,
  assertUserConfigInvalidError,
} from "../../tests/test_helpers/result_test_helpers.ts";

const logger = new BreakdownLogger();

Deno.test("Units: userConfigErrorToResult()", async (t) => {
  await t.step("parseError maps to USER_CONFIG_INVALID with PARSE_ERROR reason", () => {
    logger.debug("userConfigErrorToResult: before parseError call");
    const result = userConfigErrorToResult("/path/user.yaml", "parseError", "bad yaml");
    logger.debug("userConfigErrorToResult: after parseError call");

    const error = assertUserConfigInvalidError(result, "PARSE_ERROR");
    assertEquals(error.kind, "USER_CONFIG_INVALID");
  });

  await t.step(
    "configValidationError maps to USER_CONFIG_INVALID with VALIDATION_ERROR reason",
    () => {
      logger.debug("userConfigErrorToResult: before configValidationError call");
      const result = userConfigErrorToResult(
        "/path/user.yaml",
        "configValidationError",
        "invalid structure",
      );
      logger.debug("userConfigErrorToResult: after configValidationError call");

      assertUserConfigInvalidError(result, "VALIDATION_ERROR");
    },
  );

  await t.step("unknownError maps to USER_CONFIG_INVALID with UNKNOWN_ERROR reason", () => {
    logger.debug("userConfigErrorToResult: before unknownError call");
    const result = userConfigErrorToResult("/path/user.yaml", "unknownError", "something failed");
    logger.debug("userConfigErrorToResult: after unknownError call");

    assertUserConfigInvalidError(result, "UNKNOWN_ERROR");
  });

  await t.step("preserves originalError when it is an Error instance", () => {
    const original = new Error("root cause");

    logger.debug("userConfigErrorToResult: before call with Error originalError");
    const result = userConfigErrorToResult("/path/user.yaml", "parseError", "bad yaml", original);
    logger.debug("userConfigErrorToResult: after call with Error originalError");

    const error = assertResultErr(result);
    assertEquals(error.kind, "USER_CONFIG_INVALID");
    if (error.kind === "USER_CONFIG_INVALID") {
      assertEquals(error.originalError, original);
    }
  });

  await t.step("preserves originalError when it is a string", () => {
    logger.debug("userConfigErrorToResult: before call with string originalError");
    const result = userConfigErrorToResult(
      "/path/user.yaml",
      "parseError",
      "bad yaml",
      "string error",
    );
    logger.debug("userConfigErrorToResult: after call with string originalError");

    const error = assertResultErr(result);
    assertEquals(error.kind, "USER_CONFIG_INVALID");
    if (error.kind === "USER_CONFIG_INVALID") {
      assertEquals(error.originalError, "string error");
    }
  });

  await t.step("includes message in the error details", () => {
    logger.debug("userConfigErrorToResult: before checking message");
    const result = userConfigErrorToResult(
      "/path/user.yaml",
      "parseError",
      "specific parse failure",
    );
    logger.debug("userConfigErrorToResult: after checking message");

    const error = assertResultErr(result);
    assertEquals(error.kind, "USER_CONFIG_INVALID");
    if (error.kind === "USER_CONFIG_INVALID") {
      assertEquals(error.details, "specific parse failure");
    }
  });

  await t.step("preserves path in the error", () => {
    logger.debug("userConfigErrorToResult: before checking path");
    const result = userConfigErrorToResult("/my/config.yaml", "parseError", "err");
    logger.debug("userConfigErrorToResult: after checking path");

    const error = assertResultErr(result);
    assertEquals(error.kind, "USER_CONFIG_INVALID");
    if (error.kind === "USER_CONFIG_INVALID") {
      assertEquals(error.path, "/my/config.yaml");
    }
  });
});

Deno.test("Units: errorCodeToUnifiedError()", async (t) => {
  await t.step("APP_CONFIG_NOT_FOUND maps to CONFIG_FILE_NOT_FOUND with app configType", () => {
    logger.debug("errorCodeToUnifiedError: before APP_CONFIG_NOT_FOUND");
    const error = errorCodeToUnifiedError(
      ErrorCode.APP_CONFIG_NOT_FOUND,
      "not found",
      { path: "/app.yaml" },
    );
    logger.debug("errorCodeToUnifiedError: after APP_CONFIG_NOT_FOUND");

    assertEquals(error.kind, "CONFIG_FILE_NOT_FOUND");
    if (error.kind === "CONFIG_FILE_NOT_FOUND") {
      assertEquals(error.configType, "app");
      assertEquals(error.path, "/app.yaml");
    }
  });

  await t.step("USER_CONFIG_NOT_FOUND maps to CONFIG_FILE_NOT_FOUND with user configType", () => {
    logger.debug("errorCodeToUnifiedError: before USER_CONFIG_NOT_FOUND");
    const error = errorCodeToUnifiedError(
      ErrorCode.USER_CONFIG_NOT_FOUND,
      "not found",
      { path: "/user.yaml" },
    );
    logger.debug("errorCodeToUnifiedError: after USER_CONFIG_NOT_FOUND");

    assertEquals(error.kind, "CONFIG_FILE_NOT_FOUND");
    if (error.kind === "CONFIG_FILE_NOT_FOUND") {
      assertEquals(error.configType, "user");
      assertEquals(error.path, "/user.yaml");
    }
  });

  await t.step("APP_CONFIG_INVALID maps to CONFIG_PARSE_ERROR", () => {
    logger.debug("errorCodeToUnifiedError: before APP_CONFIG_INVALID");
    const error = errorCodeToUnifiedError(
      ErrorCode.APP_CONFIG_INVALID,
      "invalid config",
      { path: "/app.yaml" },
    );
    logger.debug("errorCodeToUnifiedError: after APP_CONFIG_INVALID");

    assertEquals(error.kind, "CONFIG_PARSE_ERROR");
    if (error.kind === "CONFIG_PARSE_ERROR") {
      assertEquals(error.path, "/app.yaml");
      assertEquals(error.syntaxError, "invalid config");
    }
  });

  await t.step("USER_CONFIG_INVALID maps to USER_CONFIG_INVALID", () => {
    logger.debug("errorCodeToUnifiedError: before USER_CONFIG_INVALID");
    const error = errorCodeToUnifiedError(
      ErrorCode.USER_CONFIG_INVALID,
      "invalid user config",
      { path: "/user.yaml", reason: "PARSE_ERROR" },
    );
    logger.debug("errorCodeToUnifiedError: after USER_CONFIG_INVALID");

    assertEquals(error.kind, "USER_CONFIG_INVALID");
    if (error.kind === "USER_CONFIG_INVALID") {
      assertEquals(error.path, "/user.yaml");
      assertEquals(error.reason, "PARSE_ERROR");
    }
  });

  await t.step("REQUIRED_FIELD_MISSING maps to REQUIRED_FIELD_MISSING", () => {
    logger.debug("errorCodeToUnifiedError: before REQUIRED_FIELD_MISSING");
    const error = errorCodeToUnifiedError(
      ErrorCode.REQUIRED_FIELD_MISSING,
      "field missing",
      { field: "working_dir" },
    );
    logger.debug("errorCodeToUnifiedError: after REQUIRED_FIELD_MISSING");

    assertEquals(error.kind, "REQUIRED_FIELD_MISSING");
    if (error.kind === "REQUIRED_FIELD_MISSING") {
      assertEquals(error.field, "working_dir");
    }
  });

  await t.step("INVALID_FIELD_TYPE maps to TYPE_MISMATCH", () => {
    logger.debug("errorCodeToUnifiedError: before INVALID_FIELD_TYPE");
    const error = errorCodeToUnifiedError(
      ErrorCode.INVALID_FIELD_TYPE,
      "wrong type",
      { field: "port" },
    );
    logger.debug("errorCodeToUnifiedError: after INVALID_FIELD_TYPE");

    assertEquals(error.kind, "TYPE_MISMATCH");
    if (error.kind === "TYPE_MISMATCH") {
      assertEquals(error.field, "port");
      assertEquals(typeof error.expectedType, "string");
      assertEquals(typeof error.actualType, "string");
    }
  });

  await t.step(
    "INVALID_PATH_FORMAT maps to PATH_VALIDATION_ERROR with INVALID_CHARACTERS",
    () => {
      logger.debug("errorCodeToUnifiedError: before INVALID_PATH_FORMAT");
      const error = errorCodeToUnifiedError(
        ErrorCode.INVALID_PATH_FORMAT,
        "bad path",
        { path: "invalid<>path" },
      );
      logger.debug("errorCodeToUnifiedError: after INVALID_PATH_FORMAT");

      assertEquals(error.kind, "PATH_VALIDATION_ERROR");
      if (error.kind === "PATH_VALIDATION_ERROR") {
        assertEquals(error.reason, "INVALID_CHARACTERS");
        assertEquals(error.path, "invalid<>path");
      }
    },
  );

  await t.step(
    "PATH_TRAVERSAL_DETECTED maps to PATH_VALIDATION_ERROR with PATH_TRAVERSAL",
    () => {
      logger.debug("errorCodeToUnifiedError: before PATH_TRAVERSAL_DETECTED");
      const error = errorCodeToUnifiedError(
        ErrorCode.PATH_TRAVERSAL_DETECTED,
        "traversal detected",
        { path: "../etc/passwd" },
      );
      logger.debug("errorCodeToUnifiedError: after PATH_TRAVERSAL_DETECTED");

      assertEquals(error.kind, "PATH_VALIDATION_ERROR");
      if (error.kind === "PATH_VALIDATION_ERROR") {
        assertEquals(error.reason, "PATH_TRAVERSAL");
        assertEquals(error.path, "../etc/passwd");
      }
    },
  );

  await t.step(
    "ABSOLUTE_PATH_NOT_ALLOWED maps to PATH_VALIDATION_ERROR with ABSOLUTE_PATH_NOT_ALLOWED",
    () => {
      logger.debug("errorCodeToUnifiedError: before ABSOLUTE_PATH_NOT_ALLOWED");
      const error = errorCodeToUnifiedError(
        ErrorCode.ABSOLUTE_PATH_NOT_ALLOWED,
        "absolute path",
        { path: "/etc/config" },
      );
      logger.debug("errorCodeToUnifiedError: after ABSOLUTE_PATH_NOT_ALLOWED");

      assertEquals(error.kind, "PATH_VALIDATION_ERROR");
      if (error.kind === "PATH_VALIDATION_ERROR") {
        assertEquals(error.reason, "ABSOLUTE_PATH_NOT_ALLOWED");
        assertEquals(error.path, "/etc/config");
      }
    },
  );

  await t.step("INVALID_PROFILE_NAME maps to INVALID_PROFILE_NAME", () => {
    logger.debug("errorCodeToUnifiedError: before INVALID_PROFILE_NAME");
    const error = errorCodeToUnifiedError(
      ErrorCode.INVALID_PROFILE_NAME,
      "bad profile",
      { path: "invalid@name" },
    );
    logger.debug("errorCodeToUnifiedError: after INVALID_PROFILE_NAME");

    assertEquals(error.kind, "INVALID_PROFILE_NAME");
    if (error.kind === "INVALID_PROFILE_NAME") {
      assertEquals(error.providedName, "invalid@name");
    }
  });

  await t.step("CONFIG_NOT_LOADED maps to CONFIG_NOT_LOADED", () => {
    logger.debug("errorCodeToUnifiedError: before CONFIG_NOT_LOADED");
    const error = errorCodeToUnifiedError(
      ErrorCode.CONFIG_NOT_LOADED,
      "config not loaded yet",
    );
    logger.debug("errorCodeToUnifiedError: after CONFIG_NOT_LOADED");

    assertEquals(error.kind, "CONFIG_NOT_LOADED");
    if (error.kind === "CONFIG_NOT_LOADED") {
      assertEquals(error.requestedOperation, "config not loaded yet");
    }
  });

  await t.step("UNKNOWN_ERROR maps to UNKNOWN_ERROR", () => {
    const original = new Error("unexpected");

    logger.debug("errorCodeToUnifiedError: before UNKNOWN_ERROR");
    const error = errorCodeToUnifiedError(
      ErrorCode.UNKNOWN_ERROR,
      "unknown failure",
      { originalError: original },
    );
    logger.debug("errorCodeToUnifiedError: after UNKNOWN_ERROR");

    assertEquals(error.kind, "UNKNOWN_ERROR");
    if (error.kind === "UNKNOWN_ERROR") {
      assertEquals(error.originalError, original);
    }
  });

  await t.step("uses defaults when context is not provided", () => {
    logger.debug("errorCodeToUnifiedError: before call without context");
    const error = errorCodeToUnifiedError(
      ErrorCode.APP_CONFIG_NOT_FOUND,
      "not found",
    );
    logger.debug("errorCodeToUnifiedError: after call without context");

    assertEquals(error.kind, "CONFIG_FILE_NOT_FOUND");
    if (error.kind === "CONFIG_FILE_NOT_FOUND") {
      assertEquals(error.path, "unknown");
      assertEquals(error.configType, "app");
    }
  });
});
