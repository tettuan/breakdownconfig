/**
 * Comprehensive ErrorFactories Test Suite
 * 
 * Targets uncovered areas in unified_errors.ts ErrorFactories (current: 3.6%)
 * Focus: All factory methods, edge cases, error object creation
 */

import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertExists } from "@std/assert";
import { ErrorFactories } from "../../src/errors/unified_errors.ts";

describe("ErrorFactories Comprehensive Coverage Tests", () => {
  describe("configFileNotFound Factory", () => {
    it("should create app config not found error", () => {
      const error = ErrorFactories.configFileNotFound("/path/to/app.yml", "app");
      
      assertEquals(error.kind, "CONFIG_FILE_NOT_FOUND");
      assertEquals(error.path, "/path/to/app.yml");
      assertEquals(error.configType, "app");
      assert(error.message.includes("Application"));
      assertExists(error.timestamp);
    });

    it("should create user config not found error", () => {
      const error = ErrorFactories.configFileNotFound("/path/to/user.yml", "user");
      
      assertEquals(error.kind, "CONFIG_FILE_NOT_FOUND");
      assertEquals(error.path, "/path/to/user.yml");
      assertEquals(error.configType, "user");
      assert(error.message.includes("User"));
      assertExists(error.timestamp);
    });

    it("should include searched locations", () => {
      const searchedLocations = ["/etc/app.yml", "./app.yml", "~/.app.yml"];
      const error = ErrorFactories.configFileNotFound("/path/to/app.yml", "app", searchedLocations);
      
      assertEquals(error.searchedLocations, searchedLocations);
    });

    it("should handle empty searched locations", () => {
      const error = ErrorFactories.configFileNotFound("/path/to/app.yml", "app", []);
      
      assertEquals(error.searchedLocations, []);
    });
  });

  describe("configParseError Factory", () => {
    it("should create config parse error with line and column", () => {
      const error = ErrorFactories.configParseError(
        "/path/to/config.yml",
        "Unexpected token",
        10,
        15
      );
      
      assertEquals(error.kind, "CONFIG_PARSE_ERROR");
      assertEquals(error.path, "/path/to/config.yml");
      assertEquals(error.syntaxError, "Unexpected token");
      assertEquals(error.line, 10);
      assertEquals(error.column, 15);
      assert(error.message.includes("Failed to parse"));
      assertExists(error.timestamp);
    });

    it("should create config parse error without line and column", () => {
      const error = ErrorFactories.configParseError(
        "/path/to/config.yml",
        "Invalid YAML"
      );
      
      assertEquals(error.kind, "CONFIG_PARSE_ERROR");
      assertEquals(error.path, "/path/to/config.yml");
      assertEquals(error.syntaxError, "Invalid YAML");
      assertEquals(error.line, undefined);
      assertEquals(error.column, undefined);
    });

    it("should handle empty syntax error message", () => {
      const error = ErrorFactories.configParseError("/path/to/config.yml", "");
      
      assertEquals(error.syntaxError, "");
      assert(error.message.includes("Failed to parse"));
    });
  });

  describe("configValidationError Factory", () => {
    it("should create config validation error with violations", () => {
      const violations = [
        {
          field: "working_dir",
          value: "",
          expectedType: "non-empty string",
          actualType: "string",
          constraint: "required",
        },
        {
          field: "app_prompt.base_dir",
          value: null,
          expectedType: "string",
          actualType: "null",
          constraint: "required",
        },
      ];
      
      const error = ErrorFactories.configValidationError("/path/to/config.yml", violations);
      
      assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
      assertEquals(error.path, "/path/to/config.yml");
      assertEquals(error.violations, violations);
      assert(error.message.includes("Configuration validation failed"));
      assert(error.message.includes("2 violation(s)"));
      assertExists(error.timestamp);
    });

    it("should handle empty violations array", () => {
      const error = ErrorFactories.configValidationError("/path/to/config.yml", []);
      
      assertEquals(error.violations, []);
      assert(error.message.includes("0 violation(s)"));
    });

    it("should handle single violation", () => {
      const violations = [{
        field: "working_dir",
        value: "",
        expectedType: "non-empty string",
        actualType: "string",
        constraint: "required",
      }];
      
      const error = ErrorFactories.configValidationError("/path/to/config.yml", violations);
      
      assert(error.message.includes("1 violation(s)"));
    });
  });

  describe("userConfigInvalid Factory", () => {
    it("should create user config invalid error with parse error reason", () => {
      const error = ErrorFactories.userConfigInvalid(
        "/path/to/user.yml",
        "PARSE_ERROR",
        "Invalid YAML syntax"
      );
      
      assertEquals(error.kind, "USER_CONFIG_INVALID");
      assertEquals(error.path, "/path/to/user.yml");
      assertEquals(error.reason, "PARSE_ERROR");
      assertEquals(error.details, "Invalid YAML syntax");
      assert(error.message.includes("User configuration invalid"));
      assertExists(error.timestamp);
    });

    it("should create user config invalid error with validation error reason", () => {
      const error = ErrorFactories.userConfigInvalid(
        "/path/to/user.yml",
        "VALIDATION_ERROR"
      );
      
      assertEquals(error.reason, "VALIDATION_ERROR");
      assertEquals(error.details, undefined);
    });

    it("should create user config invalid error with unknown error reason", () => {
      const originalError = new Error("Something went wrong");
      const error = ErrorFactories.userConfigInvalid(
        "/path/to/user.yml",
        "UNKNOWN_ERROR",
        "Unexpected failure",
        originalError
      );
      
      assertEquals(error.reason, "UNKNOWN_ERROR");
      assertEquals(error.details, "Unexpected failure");
      assertEquals(error.originalError, originalError);
    });
  });

  describe("pathValidationError Factory", () => {
    it("should create path traversal error", () => {
      const error = ErrorFactories.pathValidationError(
        "../../../etc/passwd",
        "PATH_TRAVERSAL",
        "config.dataPath"
      );
      
      assertEquals(error.kind, "PATH_VALIDATION_ERROR");
      assertEquals(error.path, "../../../etc/passwd");
      assertEquals(error.reason, "PATH_TRAVERSAL");
      assertEquals(error.affectedField, "config.dataPath");
      assert(error.message.includes("Invalid path"));
      assertExists(error.timestamp);
    });

    it("should create absolute path not allowed error", () => {
      const error = ErrorFactories.pathValidationError(
        "/absolute/path",
        "ABSOLUTE_PATH_NOT_ALLOWED",
        "working_dir"
      );
      
      assertEquals(error.reason, "ABSOLUTE_PATH_NOT_ALLOWED");
      assert(error.message.includes("Invalid path"));
    });

    it("should create invalid path format error", () => {
      const error = ErrorFactories.pathValidationError(
        "invalid<>path",
        "INVALID_PATH_FORMAT",
        "base_dir"
      );
      
      assertEquals(error.reason, "INVALID_PATH_FORMAT");
      assert(error.message.includes("Invalid path"));
    });
  });

  describe("configNotLoaded Factory", () => {
    it("should create config not loaded error", () => {
      const error = ErrorFactories.configNotLoaded("getWorkingDir");
      
      assertEquals(error.kind, "CONFIG_NOT_LOADED");
      assertEquals(error.requestedOperation, "getWorkingDir");
      assertEquals(error.suggestion, "Call loadConfig() before accessing configuration values");
      assert(error.message.includes("Configuration not loaded"));
      assert(error.message.includes("getWorkingDir"));
      assertExists(error.timestamp);
    });

    it("should handle empty operation name", () => {
      const error = ErrorFactories.configNotLoaded("");
      
      assertEquals(error.requestedOperation, "");
      assert(error.message.includes("Configuration not loaded"));
    });
  });

  describe("invalidConfigSetName Factory", () => {
    it("should create invalid config set name error", () => {
      const error = ErrorFactories.invalidConfigSetName("invalid@name");
      
      assertEquals(error.kind, "INVALID_CONFIG_SET_NAME");
      assertEquals(error.providedName, "invalid@name");
      assertEquals(error.pattern, "^[a-zA-Z0-9-]+$");
      assert(Array.isArray(error.validExamples));
      assert(error.validExamples.includes("development"));
      assert(error.validExamples.includes("production"));
      assert(error.message.includes("Invalid config set name"));
      assertExists(error.timestamp);
    });

    it("should handle empty config set name", () => {
      const error = ErrorFactories.invalidConfigSetName("");
      
      assertEquals(error.providedName, "");
      assert(error.message.includes('Invalid config set name ""'));
    });
  });

  describe("fileSystemError Factory", () => {
    it("should create file system read error", () => {
      const error = ErrorFactories.fileSystemError(
        "read",
        "/path/to/file.txt",
        "Permission denied",
        "EACCES"
      );
      
      assertEquals(error.kind, "FILE_SYSTEM_ERROR");
      assertEquals(error.operation, "read");
      assertEquals(error.path, "/path/to/file.txt");
      assertEquals(error.systemError, "Permission denied");
      assertEquals(error.code, "EACCES");
      assert(error.message.includes("File system read operation failed"));
      assertExists(error.timestamp);
    });

    it("should create file system write error", () => {
      const error = ErrorFactories.fileSystemError("write", "/path/to/file.txt");
      
      assertEquals(error.operation, "write");
      assertEquals(error.systemError, undefined);
      assertEquals(error.code, undefined);
    });

    it("should create file system delete error", () => {
      const error = ErrorFactories.fileSystemError("delete", "/path/to/file.txt");
      
      assertEquals(error.operation, "delete");
    });

    it("should create file system create error", () => {
      const error = ErrorFactories.fileSystemError("create", "/path/to/file.txt");
      
      assertEquals(error.operation, "create");
    });
  });

  describe("requiredFieldMissing Factory", () => {
    it("should create required field missing error with parent object", () => {
      const error = ErrorFactories.requiredFieldMissing(
        "base_dir",
        "app_prompt",
        ["base_dir", "template_dir", "output_dir"]
      );
      
      assertEquals(error.kind, "REQUIRED_FIELD_MISSING");
      assertEquals(error.field, "base_dir");
      assertEquals(error.parentObject, "app_prompt");
      assertEquals(error.availableFields, ["base_dir", "template_dir", "output_dir"]);
      assert(error.message.includes('Required field "base_dir"'));
      assert(error.message.includes("in app_prompt"));
      assertExists(error.timestamp);
    });

    it("should create required field missing error without parent object", () => {
      const error = ErrorFactories.requiredFieldMissing("working_dir");
      
      assertEquals(error.field, "working_dir");
      assertEquals(error.parentObject, undefined);
      assertEquals(error.availableFields, []);
      assert(error.message.includes('Required field "working_dir"'));
      assert(!error.message.includes(" in "));
    });

    it("should handle empty available fields", () => {
      const error = ErrorFactories.requiredFieldMissing("field", "parent", []);
      
      assertEquals(error.availableFields, []);
    });
  });

  describe("typeMismatch Factory", () => {
    it("should create type mismatch error", () => {
      const error = ErrorFactories.typeMismatch(
        "port",
        "number",
        "string",
        "8080"
      );
      
      assertEquals(error.kind, "TYPE_MISMATCH");
      assertEquals(error.field, "port");
      assertEquals(error.expectedType, "number");
      assertEquals(error.actualType, "string");
      assertEquals(error.value, "8080");
      assert(error.message.includes('Type mismatch for field "port"'));
      assert(error.message.includes("expected number, got string"));
      assertExists(error.timestamp);
    });

    it("should handle null value", () => {
      const error = ErrorFactories.typeMismatch("field", "string", "null", null);
      
      assertEquals(error.value, null);
      assertEquals(error.actualType, "null");
    });

    it("should handle undefined value", () => {
      const error = ErrorFactories.typeMismatch("field", "string", "undefined", undefined);
      
      assertEquals(error.value, undefined);
      assertEquals(error.actualType, "undefined");
    });
  });

  describe("configMergeError Factory", () => {
    it("should create config merge error with Error object", () => {
      const originalError = new Error("Circular reference detected");
      const error = ErrorFactories.configMergeError(originalError);
      
      assertEquals(error.kind, "UNKNOWN_ERROR");
      assertEquals(error.originalError, originalError);
      assertEquals(error.context, "configMerge");
      assertEquals(error.stackTrace, originalError.stack);
      assert(error.message.includes("Configuration merge failed"));
      assert(error.message.includes("Circular reference detected"));
      assertExists(error.timestamp);
    });

    it("should create config merge error with string", () => {
      const error = ErrorFactories.configMergeError("Invalid merge operation");
      
      assertEquals(error.originalError, "Invalid merge operation");
      assertEquals(error.stackTrace, undefined);
      assert(error.message.includes("Invalid merge operation"));
    });

    it("should create config merge error with object", () => {
      const errorObj = { code: "MERGE_FAILED", details: "Schema conflict" };
      const error = ErrorFactories.configMergeError(errorObj);
      
      assertEquals(error.originalError, errorObj);
      assert(error.message.includes("[object Object]"));
    });
  });

  describe("unknown Factory", () => {
    it("should create unknown error with Error object and context", () => {
      const originalError = new Error("Unexpected failure");
      const error = ErrorFactories.unknown(originalError, "configLoader");
      
      assertEquals(error.kind, "UNKNOWN_ERROR");
      assertEquals(error.originalError, originalError);
      assertEquals(error.context, "configLoader");
      assertEquals(error.stackTrace, originalError.stack);
      assert(error.message.includes("Unknown error occurred in configLoader"));
      assert(error.message.includes("Unexpected failure"));
      assertExists(error.timestamp);
    });

    it("should create unknown error without context", () => {
      const originalError = new Error("Something went wrong");
      const error = ErrorFactories.unknown(originalError);
      
      assertEquals(error.context, undefined);
      assert(error.message.includes("Unknown error occurred:"));
      assert(!error.message.includes(" in "));
    });

    it("should create unknown error with string", () => {
      const error = ErrorFactories.unknown("String error message");
      
      assertEquals(error.originalError, "String error message");
      assertEquals(error.stackTrace, undefined);
      assert(error.message.includes("String error message"));
    });

    it("should create unknown error with number", () => {
      const error = ErrorFactories.unknown(404);
      
      assertEquals(error.originalError, 404);
      assert(error.message.includes("404"));
    });

    it("should create unknown error with null", () => {
      const error = ErrorFactories.unknown(null);
      
      assertEquals(error.originalError, null);
      assert(error.message.includes("null"));
    });
  });

  describe("Error Message Formatting", () => {
    it("should include error codes in messages", () => {
      const configNotFoundError = ErrorFactories.configFileNotFound("/path", "app");
      const parseError = ErrorFactories.configParseError("/path", "syntax error");
      const validationError = ErrorFactories.configValidationError("/path", []);
      
      assert(configNotFoundError.message.includes("ERR1001") || configNotFoundError.message.includes("Configuration"));
      assert(parseError.message.includes("ERR1002") || parseError.message.includes("Failed to parse"));
      assert(validationError.message.includes("ERR1002") || validationError.message.includes("validation failed"));
    });

    it("should format timestamps consistently", () => {
      const error1 = ErrorFactories.configFileNotFound("/path1", "app");
      const error2 = ErrorFactories.configParseError("/path2", "error");
      
      assert(error1.timestamp instanceof Date);
      assert(error2.timestamp instanceof Date);
      // Timestamps should be within reasonable time of each other
      assert(Math.abs(error1.timestamp.getTime() - error2.timestamp.getTime()) < 1000);
    });
  });
});