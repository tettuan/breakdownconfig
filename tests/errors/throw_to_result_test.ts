/**
 * Tests for throw_to_result.ts - ErrorCode to UnifiedError conversion
 *
 * This test suite aims to improve coverage from 30.9% to 80%+
 * by testing all error code conversion paths
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  errorCodeToUnifiedError,
  userConfigErrorToResult,
} from "../../src/errors/throw_to_result.ts";
import { ErrorCode } from "../../src/error_manager.ts";
import { Result } from "../../src/types/unified_result.ts";

describe("throw_to_result conversion functions", () => {
  describe("userConfigErrorToResult", () => {
    it("should convert parseError to USER_CONFIG_INVALID with PARSE_ERROR reason", () => {
      const result = userConfigErrorToResult(
        "/path/to/config.yml",
        "parseError",
        "Invalid YAML syntax",
        new Error("YAML parse failed"),
      );

      assertEquals(result.success, false);
      if (!result.success) {
        assertEquals(result.error.kind, "USER_CONFIG_INVALID");
        assertEquals(result.error.reason, "PARSE_ERROR");
        assertEquals(result.error.path, "/path/to/config.yml");
        assertEquals(result.error.details, "Invalid YAML syntax");
        assertExists(result.error.originalError);
      }
    });

    it("should convert validationError to USER_CONFIG_INVALID with VALIDATION_ERROR reason", () => {
      const result = userConfigErrorToResult(
        "/path/to/config.yml",
        "validationError",
        "Missing required field",
      );

      assertEquals(result.success, false);
      if (!result.success) {
        assertEquals(result.error.kind, "USER_CONFIG_INVALID");
        assertEquals(result.error.reason, "VALIDATION_ERROR");
        assertEquals(result.error.path, "/path/to/config.yml");
      }
    });

    it("should convert unknownError to USER_CONFIG_INVALID with UNKNOWN_ERROR reason", () => {
      const result = userConfigErrorToResult(
        "/path/to/config.yml",
        "unknownError",
        "Something went wrong",
      );

      assertEquals(result.success, false);
      if (!result.success) {
        assertEquals(result.error.kind, "USER_CONFIG_INVALID");
        assertEquals(result.error.reason, "UNKNOWN_ERROR");
        assertEquals(result.error.details, "Something went wrong");
      }
    });

    it("should handle unknown error kinds", () => {
      // @ts-ignore - Testing invalid input
      const result = userConfigErrorToResult(
        "/path/to/config.yml",
        "invalidKind",
        "Test message",
      );

      assertEquals(result.success, false);
      if (!result.success) {
        assertEquals(result.error.kind, "UNKNOWN_ERROR");
        assertEquals(result.error.message.includes("Unknown error kind"), true);
      }
    });
  });

  describe("errorCodeToUnifiedError", () => {
    it("should convert USER_CONFIG_INVALID correctly", () => {
      const error = errorCodeToUnifiedError(
        ErrorCode.USER_CONFIG_INVALID,
        "Invalid user configuration",
        {
          path: "/user/config.yml",
          reason: "PARSE_ERROR",
          originalError: new Error("Parse failed"),
        },
      );

      assertEquals(error.kind, "USER_CONFIG_INVALID");
      assertEquals(error.path, "/user/config.yml");
      assertEquals(error.reason, "PARSE_ERROR");
    });

    it("should convert APP_CONFIG_NOT_FOUND correctly", () => {
      const error = errorCodeToUnifiedError(
        ErrorCode.APP_CONFIG_NOT_FOUND,
        "App config not found",
        { path: "/app/config.yml" },
      );

      assertEquals(error.kind, "CONFIG_FILE_NOT_FOUND");
      assertEquals(error.path, "/app/config.yml");
      assertEquals(error.configType, "app");
    });

    it("should convert USER_CONFIG_NOT_FOUND correctly", () => {
      const error = errorCodeToUnifiedError(
        ErrorCode.USER_CONFIG_NOT_FOUND,
        "User config not found",
        { path: "/user/config.yml" },
      );

      assertEquals(error.kind, "CONFIG_FILE_NOT_FOUND");
      assertEquals(error.path, "/user/config.yml");
      assertEquals(error.configType, "user");
    });

    it("should convert APP_CONFIG_INVALID correctly", () => {
      const error = errorCodeToUnifiedError(
        ErrorCode.APP_CONFIG_INVALID,
        "Invalid app configuration format",
        { path: "/app/config.yml" },
      );

      assertEquals(error.kind, "CONFIG_PARSE_ERROR");
      assertEquals(error.path, "/app/config.yml");
      assertEquals(error.syntaxError, "Invalid app configuration format");
    });

    it("should convert REQUIRED_FIELD_MISSING correctly", () => {
      const error = errorCodeToUnifiedError(
        ErrorCode.REQUIRED_FIELD_MISSING,
        "Field is required",
        { field: "working_dir" },
      );

      assertEquals(error.kind, "REQUIRED_FIELD_MISSING");
      assertEquals(error.field, "working_dir");
    });

    it("should convert INVALID_FIELD_TYPE correctly", () => {
      const error = errorCodeToUnifiedError(
        ErrorCode.INVALID_FIELD_TYPE,
        "Type mismatch",
        { field: "port" },
      );

      assertEquals(error.kind, "TYPE_MISMATCH");
      assertEquals(error.field, "port");
      assertEquals(error.expectedType, "expected");
      assertEquals(error.actualType, "actual");
    });

    it("should convert INVALID_PATH_FORMAT correctly", () => {
      const error = errorCodeToUnifiedError(
        ErrorCode.INVALID_PATH_FORMAT,
        "Path contains invalid characters",
        {
          path: "path/with/../../traversal",
          field: "base_dir",
        },
      );

      assertEquals(error.kind, "PATH_VALIDATION_ERROR");
      assertEquals(error.path, "path/with/../../traversal");
      assertEquals(error.reason, "INVALID_CHARACTERS");
      assertEquals(error.affectedField, "base_dir");
    });

    it("should convert PATH_TRAVERSAL_DETECTED correctly", () => {
      const error = errorCodeToUnifiedError(
        ErrorCode.PATH_TRAVERSAL_DETECTED,
        "Path traversal attempt detected",
        {
          path: "../../../etc/passwd",
          field: "config_path",
        },
      );

      assertEquals(error.kind, "PATH_VALIDATION_ERROR");
      assertEquals(error.path, "../../../etc/passwd");
      assertEquals(error.reason, "PATH_TRAVERSAL");
      assertEquals(error.affectedField, "config_path");
    });

    it("should convert ABSOLUTE_PATH_NOT_ALLOWED correctly", () => {
      const error = errorCodeToUnifiedError(
        ErrorCode.ABSOLUTE_PATH_NOT_ALLOWED,
        "Absolute paths are not allowed",
        {
          path: "/absolute/path",
          field: "relative_path",
        },
      );

      assertEquals(error.kind, "PATH_VALIDATION_ERROR");
      assertEquals(error.path, "/absolute/path");
      assertEquals(error.reason, "ABSOLUTE_PATH_NOT_ALLOWED");
      assertEquals(error.affectedField, "relative_path");
    });

    it("should convert INVALID_CONFIG_SET_NAME correctly", () => {
      const error = errorCodeToUnifiedError(
        ErrorCode.INVALID_CONFIG_SET_NAME,
        "Invalid config set name",
        { path: "invalid name!" },
      );

      assertEquals(error.kind, "INVALID_CONFIG_SET_NAME");
      assertEquals(error.providedName, "invalid name!");
    });

    it("should convert CONFIG_NOT_LOADED correctly", () => {
      const error = errorCodeToUnifiedError(
        ErrorCode.CONFIG_NOT_LOADED,
        "Cannot access config before loading",
      );

      assertEquals(error.kind, "CONFIG_NOT_LOADED");
      assertEquals(error.requestedOperation, "Cannot access config before loading");
    });

    it("should convert UNKNOWN_ERROR correctly", () => {
      const originalError = new Error("Something unexpected");
      const error = errorCodeToUnifiedError(
        ErrorCode.UNKNOWN_ERROR,
        "Unknown error occurred",
        { originalError },
      );

      assertEquals(error.kind, "UNKNOWN_ERROR");
      assertEquals(error.originalError, originalError);
      assertEquals(error.context, "errorCodeToUnifiedError");
    });

    it("should handle missing context gracefully", () => {
      const error = errorCodeToUnifiedError(
        ErrorCode.APP_CONFIG_NOT_FOUND,
        "Config not found",
        // No context provided
      );

      assertEquals(error.kind, "CONFIG_FILE_NOT_FOUND");
      assertEquals(error.path, "unknown");
      assertEquals(error.configType, "app");
    });

    it("should handle invalid reason values", () => {
      const error = errorCodeToUnifiedError(
        ErrorCode.USER_CONFIG_INVALID,
        "Invalid config",
        {
          path: "/test.yml",
          reason: "INVALID_REASON", // Invalid reason
        },
      );

      assertEquals(error.kind, "USER_CONFIG_INVALID");
      assertEquals(error.reason, "UNKNOWN_ERROR"); // Should default to UNKNOWN_ERROR
    });
  });

  describe("edge cases and error boundaries", () => {
    it("should handle null and undefined in context", () => {
      const error = errorCodeToUnifiedError(
        ErrorCode.REQUIRED_FIELD_MISSING,
        "Field missing",
        {
          field: undefined, // undefined field
        },
      );

      assertEquals(error.kind, "REQUIRED_FIELD_MISSING");
      assertEquals(error.field, "unknown");
    });

    it("should handle circular references in originalError", () => {
      const circularError: any = { message: "circular" };
      circularError.self = circularError;

      const error = errorCodeToUnifiedError(
        ErrorCode.UNKNOWN_ERROR,
        "Circular error",
        { originalError: circularError },
      );

      assertEquals(error.kind, "UNKNOWN_ERROR");
      assertExists(error.originalError);
    });
  });
});
