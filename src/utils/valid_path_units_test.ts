/**
 * Units Tests for ValidPath and ValidProfilePrefix
 * Level 2: Verifies individual function behavior and business logic
 */

import { assert, assertEquals } from "@std/assert";
import { BreakdownLogger } from "@tettuan/breakdownlogger";
import { ValidPath, ValidProfilePrefix } from "./valid_path.ts";
import {
  isValidProfilePrefix,
  ValidProfilePrefix as StandaloneValidProfilePrefix,
} from "../types/valid_profile_prefix.ts";
import {
  assertPathValidationError,
  assertResultErrorKind,
  assertResultOk,
} from "../../tests/test_helpers/result_test_helpers.ts";

const logger = new BreakdownLogger();

// ============================================================
// ValidPath.create() success cases
// ============================================================
Deno.test("Units: ValidPath.create() success cases", async (t) => {
  await t.step("accepts relative path 'config/app.yml'", (): void => {
    logger.debug("path", "Testing ValidPath.create with 'config/app.yml'");
    const result = ValidPath.create("config/app.yml");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    const path = assertResultOk(result);
    assertEquals(path.getValue(), "config/app.yml");
  });

  await t.step("accepts subdirectory path 'a/b/c/d.txt'", (): void => {
    logger.debug("path", "Testing ValidPath.create with 'a/b/c/d.txt'");
    const result = ValidPath.create("a/b/c/d.txt");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    const path = assertResultOk(result);
    assertEquals(path.getValue(), "a/b/c/d.txt");
  });

  await t.step("accepts dot-prefixed '.hidden/file'", (): void => {
    logger.debug("path", "Testing ValidPath.create with '.hidden/file'");
    const result = ValidPath.create(".hidden/file");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    const path = assertResultOk(result);
    assertEquals(path.getValue(), ".hidden/file");
  });

  await t.step("trims trailing spaces from path", (): void => {
    logger.debug("path", "Testing ValidPath.create with ' config/app.yml '");
    const result = ValidPath.create(" config/app.yml ");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    const path = assertResultOk(result);
    assertEquals(path.getValue(), "config/app.yml");
  });

  await t.step("accepts simple filename 'file.txt'", (): void => {
    logger.debug("path", "Testing ValidPath.create with 'file.txt'");
    const result = ValidPath.create("file.txt");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    const path = assertResultOk(result);
    assertEquals(path.getValue(), "file.txt");
  });
});

// ============================================================
// ValidPath.create() error cases - EMPTY_PATH
// ============================================================
Deno.test("Units: ValidPath.create() EMPTY_PATH errors", async (t) => {
  await t.step("rejects empty string", (): void => {
    logger.debug("path", "Testing ValidPath.create with empty string");
    const result = ValidPath.create("");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "EMPTY_PATH");
  });

  await t.step("rejects whitespace only string", (): void => {
    logger.debug("path", "Testing ValidPath.create with whitespace only");
    const result = ValidPath.create("   ");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "EMPTY_PATH");
  });
});

// ============================================================
// ValidPath.create() error cases - PATH_TRAVERSAL
// ============================================================
Deno.test("Units: ValidPath.create() PATH_TRAVERSAL errors", async (t) => {
  await t.step("rejects '../secret'", (): void => {
    logger.debug("path", "Testing ValidPath.create with '../secret'");
    const result = ValidPath.create("../secret");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "PATH_TRAVERSAL");
  });

  await t.step("rejects 'a/../b'", (): void => {
    logger.debug("path", "Testing ValidPath.create with 'a/../b'");
    const result = ValidPath.create("a/../b");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "PATH_TRAVERSAL");
  });

  await t.step("rejects 'a/b/..'", (): void => {
    logger.debug("path", "Testing ValidPath.create with 'a/b/..'");
    const result = ValidPath.create("a/b/..");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "PATH_TRAVERSAL");
  });

  await t.step("rejects backslash traversal 'a\\\\..\\\\b'", (): void => {
    logger.debug("path", "Testing ValidPath.create with backslash traversal");
    const result = ValidPath.create("a\\..\\b");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "PATH_TRAVERSAL");
  });

  await t.step("rejects '..' alone", (): void => {
    logger.debug("path", "Testing ValidPath.create with '..'");
    const result = ValidPath.create("..");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "PATH_TRAVERSAL");
  });

  // Note: '/../etc' is both absolute (starts with '/') and contains path traversal ('/../').
  // It is classified as PATH_TRAVERSAL because traversal checks run before absolute-path checks.
  await t.step("rejects '/../etc' (traversal checked before absolute)", (): void => {
    logger.debug("path", "Testing ValidPath.create with '/../etc'");
    const result = ValidPath.create("/../etc");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "PATH_TRAVERSAL");
  });
});

// ============================================================
// ValidPath.create() error cases - ABSOLUTE_PATH_NOT_ALLOWED
// ============================================================
Deno.test("Units: ValidPath.create() ABSOLUTE_PATH_NOT_ALLOWED errors", async (t) => {
  await t.step("rejects '/'", (): void => {
    logger.debug("path", "Testing ValidPath.create with '/'");
    const result = ValidPath.create("/");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "ABSOLUTE_PATH_NOT_ALLOWED");
  });

  await t.step("rejects '/etc/passwd'", (): void => {
    logger.debug("path", "Testing ValidPath.create with '/etc/passwd'");
    const result = ValidPath.create("/etc/passwd");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "ABSOLUTE_PATH_NOT_ALLOWED");
  });

  await t.step("rejects Windows absolute path 'C:\\\\'", (): void => {
    logger.debug("path", "Testing ValidPath.create with Windows path");
    const result = ValidPath.create("C:\\");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "ABSOLUTE_PATH_NOT_ALLOWED");
  });

  await t.step("rejects UNC path '\\\\\\\\\\\\\\\\'", (): void => {
    logger.debug("path", "Testing ValidPath.create with UNC path");
    const result = ValidPath.create("\\\\");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "ABSOLUTE_PATH_NOT_ALLOWED");
  });

  await t.step("rejects '//'", (): void => {
    logger.debug("path", "Testing ValidPath.create with '//'");
    const result = ValidPath.create("//");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "ABSOLUTE_PATH_NOT_ALLOWED");
  });
});

// ============================================================
// ValidPath.create() error cases - INVALID_CHARACTERS
// ============================================================
Deno.test("Units: ValidPath.create() INVALID_CHARACTERS errors", async (t) => {
  await t.step("rejects null character", (): void => {
    logger.debug("path", "Testing ValidPath.create with null char");
    const result = ValidPath.create("file\0name");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "INVALID_CHARACTERS");
  });

  await t.step("rejects '<' character", (): void => {
    logger.debug("path", "Testing ValidPath.create with '<'");
    const result = ValidPath.create("file<name");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "INVALID_CHARACTERS");
  });

  await t.step("rejects '>' character", (): void => {
    logger.debug("path", "Testing ValidPath.create with '>'");
    const result = ValidPath.create("file>name");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "INVALID_CHARACTERS");
  });

  await t.step("rejects '|' character", (): void => {
    logger.debug("path", "Testing ValidPath.create with '|'");
    const result = ValidPath.create("file|name");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "INVALID_CHARACTERS");
  });

  await t.step("rejects '?' character", (): void => {
    logger.debug("path", "Testing ValidPath.create with '?'");
    const result = ValidPath.create("file?name");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "INVALID_CHARACTERS");
  });

  await t.step("rejects '*' character", (): void => {
    logger.debug("path", "Testing ValidPath.create with '*'");
    const result = ValidPath.create("file*name");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "INVALID_CHARACTERS");
  });

  await t.step("rejects ':' character", (): void => {
    logger.debug("path", "Testing ValidPath.create with ':'");
    const result = ValidPath.create("file:name");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "INVALID_CHARACTERS");
  });

  await t.step("rejects control character \\x01", (): void => {
    logger.debug("path", "Testing ValidPath.create with control char");
    const result = ValidPath.create("file\x01name");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "INVALID_CHARACTERS");
  });

  // Note: 'C:file' does not match the absolute-path pattern /^[a-zA-Z]:[\\\/]/ (no trailing separator),
  // so it falls through to INVALID_CHARACTERS due to the ':' character.
  await t.step("rejects 'C:file' (colon is invalid character)", (): void => {
    logger.debug("path", "Testing ValidPath.create with 'C:file'");
    const result = ValidPath.create("C:file");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertPathValidationError(result, "INVALID_CHARACTERS");
  });
});

// ============================================================
// ValidPath instance methods
// ============================================================
Deno.test("Units: ValidPath instance methods", async (t) => {
  await t.step("getValue() returns the path string", (): void => {
    logger.debug("path", "Testing ValidPath.getValue()");
    const result = ValidPath.create("config/app.yml");
    const path = assertResultOk(result);
    logger.debug("path", "getValue() returned: " + path.getValue());
    assertEquals(path.getValue(), "config/app.yml");
  });

  await t.step("toString() returns the path string", (): void => {
    logger.debug("path", "Testing ValidPath.toString()");
    const result = ValidPath.create("config/app.yml");
    const path = assertResultOk(result);
    logger.debug("path", "toString() returned: " + path.toString());
    assertEquals(path.toString(), "config/app.yml");
  });

  await t.step("equals() returns true for same path", (): void => {
    logger.debug("path", "Testing ValidPath.equals() with same path");
    const result1 = ValidPath.create("config/app.yml");
    const result2 = ValidPath.create("config/app.yml");
    const path1 = assertResultOk(result1);
    const path2 = assertResultOk(result2);
    logger.debug("path", "equals result: " + String(path1.equals(path2)));
    assert(path1.equals(path2), "Same paths should be equal");
  });

  await t.step("equals() returns false for different paths", (): void => {
    logger.debug("path", "Testing ValidPath.equals() with different paths");
    const result1 = ValidPath.create("config/app.yml");
    const result2 = ValidPath.create("config/other.yml");
    const path1 = assertResultOk(result1);
    const path2 = assertResultOk(result2);
    logger.debug("path", "equals result: " + String(path1.equals(path2)));
    assert(!path1.equals(path2), "Different paths should not be equal");
  });

  await t.step("isValidPath() returns true for ValidPath instance", (): void => {
    logger.debug("path", "Testing ValidPath.isValidPath() with ValidPath");
    const result = ValidPath.create("config/app.yml");
    const path = assertResultOk(result);
    logger.debug("path", "isValidPath result: " + String(ValidPath.isValidPath(path)));
    assert(ValidPath.isValidPath(path), "Should return true for ValidPath instance");
  });

  await t.step("isValidPath() returns false for non-ValidPath values", (): void => {
    logger.debug("path", "Testing ValidPath.isValidPath() with non-ValidPath");
    assert(!ValidPath.isValidPath("string"), "String should not be ValidPath");
    assert(!ValidPath.isValidPath(42), "Number should not be ValidPath");
    assert(!ValidPath.isValidPath(null), "Null should not be ValidPath");
    assert(!ValidPath.isValidPath(undefined), "Undefined should not be ValidPath");
    assert(!ValidPath.isValidPath({}), "Object should not be ValidPath");
    logger.debug("path", "All non-ValidPath values correctly rejected");
  });
});

// ============================================================
// ValidProfilePrefix.create() success cases (from valid_path.ts)
// ============================================================
Deno.test("Units: ValidProfilePrefix.create() success cases", async (t) => {
  await t.step("accepts alphanumeric 'production'", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.create with 'production'");
    const result = ValidProfilePrefix.create("production");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    const prefix = assertResultOk(result);
    assertEquals(prefix.getValue(), "production");
  });

  await t.step("accepts hyphenated 'staging-v2'", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.create with 'staging-v2'");
    const result = ValidProfilePrefix.create("staging-v2");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    const prefix = assertResultOk(result);
    assertEquals(prefix.getValue(), "staging-v2");
  });

  await t.step("accepts single character 'a'", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.create with 'a'");
    const result = ValidProfilePrefix.create("a");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    const prefix = assertResultOk(result);
    assertEquals(prefix.getValue(), "a");
  });

  await t.step("accepts numeric '123'", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.create with '123'");
    const result = ValidProfilePrefix.create("123");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    const prefix = assertResultOk(result);
    assertEquals(prefix.getValue(), "123");
  });
});

// ============================================================
// ValidProfilePrefix.create() error cases (from valid_path.ts)
// ============================================================
Deno.test("Units: ValidProfilePrefix.create() error cases", async (t) => {
  await t.step("rejects empty string", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.create with empty string");
    const result = ValidProfilePrefix.create("");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
  });

  await t.step("rejects whitespace only", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.create with whitespace");
    const result = ValidProfilePrefix.create(" ");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
  });

  await t.step("rejects string with space 'hello world'", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.create with 'hello world'");
    const result = ValidProfilePrefix.create("hello world");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
  });

  await t.step("rejects '!' character", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.create with '!'");
    const result = ValidProfilePrefix.create("!");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
  });

  await t.step("rejects '@' character", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.create with '@'");
    const result = ValidProfilePrefix.create("@");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
  });

  await t.step("rejects '#' character", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.create with '#'");
    const result = ValidProfilePrefix.create("#");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
  });

  await t.step("rejects unicode characters", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.create with unicode");
    const result = ValidProfilePrefix.create("\u540D\u524D");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
  });
});

// ============================================================
// ValidProfilePrefix instance methods (from valid_path.ts)
// ============================================================
Deno.test("Units: ValidProfilePrefix instance methods", async (t) => {
  await t.step("getValue() returns the prefix string", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.getValue()");
    const result = ValidProfilePrefix.create("production");
    const prefix = assertResultOk(result);
    logger.debug("path", "getValue() returned: " + prefix.getValue());
    assertEquals(prefix.getValue(), "production");
  });

  await t.step("toString() returns the prefix string", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.toString()");
    const result = ValidProfilePrefix.create("production");
    const prefix = assertResultOk(result);
    logger.debug("path", "toString() returned: " + prefix.toString());
    assertEquals(prefix.toString(), "production");
  });

  await t.step("equals() returns true for same prefix", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.equals() same");
    const r1 = ValidProfilePrefix.create("staging");
    const r2 = ValidProfilePrefix.create("staging");
    const p1 = assertResultOk(r1);
    const p2 = assertResultOk(r2);
    logger.debug("path", "equals result: " + String(p1.equals(p2)));
    assert(p1.equals(p2), "Same prefixes should be equal");
  });

  await t.step("equals() returns false for different prefixes", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.equals() different");
    const r1 = ValidProfilePrefix.create("staging");
    const r2 = ValidProfilePrefix.create("production");
    const p1 = assertResultOk(r1);
    const p2 = assertResultOk(r2);
    logger.debug("path", "equals result: " + String(p1.equals(p2)));
    assert(!p1.equals(p2), "Different prefixes should not be equal");
  });

  await t.step("isValidProfilePrefix() returns true for instance", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.isValidProfilePrefix()");
    const result = ValidProfilePrefix.create("test");
    const prefix = assertResultOk(result);
    logger.debug(
      "path",
      "isValidProfilePrefix result: " + String(ValidProfilePrefix.isValidProfilePrefix(prefix)),
    );
    assert(
      ValidProfilePrefix.isValidProfilePrefix(prefix),
      "Should return true for ValidProfilePrefix instance",
    );
  });

  await t.step("isValidProfilePrefix() returns false for non-instance", (): void => {
    logger.debug("path", "Testing ValidProfilePrefix.isValidProfilePrefix() with non-instance");
    assert(!ValidProfilePrefix.isValidProfilePrefix("string"), "String should not pass");
    assert(!ValidProfilePrefix.isValidProfilePrefix(null), "Null should not pass");
    logger.debug("path", "Non-instance values correctly rejected");
  });
});

// ============================================================
// Standalone ValidProfilePrefix (src/types/valid_profile_prefix.ts)
// ============================================================
Deno.test("Units: Standalone ValidProfilePrefix from types", async (t) => {
  await t.step("create() succeeds for valid input 'test'", (): void => {
    logger.debug("path", "Testing standalone ValidProfilePrefix.create('test')");
    const result = StandaloneValidProfilePrefix.create("test");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    const prefix = assertResultOk(result);
    assertEquals(prefix.getValue(), "test");
  });

  await t.step("create() succeeds for hyphenated input 'staging-v2'", (): void => {
    logger.debug("path", "Testing standalone ValidProfilePrefix.create('staging-v2')");
    const result = StandaloneValidProfilePrefix.create("staging-v2");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    const prefix = assertResultOk(result);
    assertEquals(prefix.getValue(), "staging-v2");
  });

  await t.step("create() succeeds for numeric input '123'", (): void => {
    logger.debug("path", "Testing standalone ValidProfilePrefix.create('123')");
    const result = StandaloneValidProfilePrefix.create("123");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    const prefix = assertResultOk(result);
    assertEquals(prefix.getValue(), "123");
  });

  await t.step("create() fails for empty string", (): void => {
    logger.debug("path", "Testing standalone ValidProfilePrefix.create('')");
    const result = StandaloneValidProfilePrefix.create("");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
  });

  await t.step("create() fails for whitespace-only input", (): void => {
    logger.debug("path", "Testing standalone ValidProfilePrefix.create('   ')");
    const result = StandaloneValidProfilePrefix.create("   ");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
  });

  await t.step("create() fails for '!' character", (): void => {
    logger.debug("path", "Testing standalone ValidProfilePrefix.create('!')");
    const result = StandaloneValidProfilePrefix.create("!");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
  });

  await t.step("create() fails for '@' character", (): void => {
    logger.debug("path", "Testing standalone ValidProfilePrefix.create('@')");
    const result = StandaloneValidProfilePrefix.create("@");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
  });

  await t.step("create() fails for '#' character", (): void => {
    logger.debug("path", "Testing standalone ValidProfilePrefix.create('#')");
    const result = StandaloneValidProfilePrefix.create("#");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
  });

  await t.step("create() fails for unicode characters", (): void => {
    logger.debug("path", "Testing standalone ValidProfilePrefix.create with unicode");
    const result = StandaloneValidProfilePrefix.create("\u540D\u524D");
    logger.debug("path", "Result: " + JSON.stringify(result.success));
    assertResultErrorKind(result, "CONFIG_VALIDATION_ERROR");
  });

  await t.step("getValue() returns the prefix string", (): void => {
    logger.debug("path", "Testing standalone ValidProfilePrefix.getValue()");
    const result = StandaloneValidProfilePrefix.create("myprefix");
    const prefix = assertResultOk(result);
    logger.debug("path", "getValue() returned: " + prefix.getValue());
    assertEquals(prefix.getValue(), "myprefix");
  });

  await t.step("toString() returns the prefix string", (): void => {
    logger.debug("path", "Testing standalone ValidProfilePrefix.toString()");
    const result = StandaloneValidProfilePrefix.create("myprefix");
    const prefix = assertResultOk(result);
    logger.debug("path", "toString() returned: " + prefix.toString());
    assertEquals(prefix.toString(), "myprefix");
  });

  await t.step("equals() returns true for same prefix", (): void => {
    logger.debug("path", "Testing standalone ValidProfilePrefix.equals() same");
    const r1 = StandaloneValidProfilePrefix.create("abc");
    const r2 = StandaloneValidProfilePrefix.create("abc");
    const p1 = assertResultOk(r1);
    const p2 = assertResultOk(r2);
    logger.debug("path", "equals result: " + String(p1.equals(p2)));
    assert(p1.equals(p2), "Same prefixes should be equal");
  });

  await t.step("equals() returns false for different prefixes", (): void => {
    logger.debug("path", "Testing standalone ValidProfilePrefix.equals() different");
    const r1 = StandaloneValidProfilePrefix.create("abc");
    const r2 = StandaloneValidProfilePrefix.create("xyz");
    const p1 = assertResultOk(r1);
    const p2 = assertResultOk(r2);
    logger.debug("path", "equals result: " + String(p1.equals(p2)));
    assert(!p1.equals(p2), "Different prefixes should not be equal");
  });

  await t.step("isValidProfilePrefix type guard returns true for instance", (): void => {
    logger.debug("path", "Testing standalone isValidProfilePrefix type guard");
    const result = StandaloneValidProfilePrefix.create("test");
    const prefix = assertResultOk(result);
    logger.debug(
      "path",
      "isValidProfilePrefix result: " + String(isValidProfilePrefix(prefix)),
    );
    assert(isValidProfilePrefix(prefix), "Should return true for instance");
  });

  await t.step("isValidProfilePrefix type guard returns false for non-instance", (): void => {
    logger.debug("path", "Testing standalone isValidProfilePrefix with non-instance");
    assert(!isValidProfilePrefix("hello"), "String should not pass");
    assert(!isValidProfilePrefix(42), "Number should not pass");
    assert(!isValidProfilePrefix(null), "Null should not pass");
    logger.debug("path", "Non-instance values correctly rejected");
  });
});
