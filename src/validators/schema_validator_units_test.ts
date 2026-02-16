/**
 * Units Tests for SchemaValidator
 * Level 2: Verifies validate(), createAppConfigSchema(), createUserConfigSchema()
 */

import { assert, assertEquals } from "@std/assert";
import { BreakdownLogger } from "@tettuan/breakdownlogger";
import {
  assertConfigValidationError,
  assertResultErr,
  assertResultOk,
} from "../../tests/test_helpers/result_test_helpers.ts";
import { Result } from "../types/unified_result.ts";
import type { UnifiedError } from "../errors/unified_errors.ts";
import { ErrorFactories } from "../errors/unified_errors.ts";
import { SchemaValidator } from "./schema_validator.ts";
import type { Schema } from "./schema_validator.ts";

const logger = new BreakdownLogger("validator");

// ---------------------------------------------------------------------------
// Helper schemas used across multiple test groups
// ---------------------------------------------------------------------------

function flatStringSchema(): Schema {
  return {
    fields: [
      { name: "name", type: "string", required: true },
      { name: "title", type: "string", required: true },
    ],
  };
}

function nestedSchema(): Schema {
  return {
    fields: [
      { name: "id", type: "string", required: true },
      {
        name: "address",
        type: "object",
        required: true,
        schema: {
          fields: [
            { name: "city", type: "string", required: true },
          ],
        },
      },
    ],
  };
}

function mixedRequiredOptionalSchema(): Schema {
  return {
    fields: [
      { name: "required_field", type: "string", required: true },
      { name: "optional_field", type: "string", required: false },
    ],
  };
}

// ===== validate() with valid data =====

Deno.test("Units: SchemaValidator.validate() with valid data", async (t) => {
  await t.step("valid flat object with string fields passes", (): void => {
    logger.debug("Before: validate flat object with two string fields");
    const result = SchemaValidator.validate(
      { name: "Alice", title: "Engineer" },
      flatStringSchema(),
    );
    logger.debug("After: validate flat object", result);
    assertResultOk(result, "Flat valid object should pass");
  });

  await t.step("valid nested object matching schema passes", (): void => {
    logger.debug("Before: validate nested object");
    const result = SchemaValidator.validate(
      { id: "1", address: { city: "Tokyo" } },
      nestedSchema(),
    );
    logger.debug("After: validate nested object", result);
    assertResultOk(result, "Nested valid object should pass");
  });

  await t.step("object with extra fields not in schema passes", (): void => {
    logger.debug("Before: validate object with extra fields");
    const result = SchemaValidator.validate(
      { name: "Bob", title: "Manager", extra: "ignored" },
      flatStringSchema(),
    );
    logger.debug("After: validate object with extra fields", result);
    assertResultOk(result, "Extra fields should be ignored");
  });
});

// ===== validate() with null/undefined/non-object =====

Deno.test("Units: SchemaValidator.validate() rejects non-object inputs", async (t) => {
  await t.step("null returns CONFIG_VALIDATION_ERROR with root field", (): void => {
    logger.debug("Before: validate null");
    const result = SchemaValidator.validate(null, flatStringSchema());
    logger.debug("After: validate null", result);
    const error = assertConfigValidationError(result, undefined, 1);
    assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
    if (error.kind === "CONFIG_VALIDATION_ERROR") {
      assertEquals(error.violations[0].field, "root");
    }
  });

  await t.step("undefined returns CONFIG_VALIDATION_ERROR", (): void => {
    logger.debug("Before: validate undefined");
    const result = SchemaValidator.validate(undefined, flatStringSchema());
    logger.debug("After: validate undefined", result);
    assertConfigValidationError(result);
  });

  await t.step("string 'not an object' returns CONFIG_VALIDATION_ERROR", (): void => {
    logger.debug("Before: validate string");
    const result = SchemaValidator.validate("not an object", flatStringSchema());
    logger.debug("After: validate string", result);
    assertConfigValidationError(result);
  });

  await t.step("number 42 returns CONFIG_VALIDATION_ERROR", (): void => {
    logger.debug("Before: validate number");
    const result = SchemaValidator.validate(42, flatStringSchema());
    logger.debug("After: validate number", result);
    assertConfigValidationError(result);
  });
});

// ===== Required field missing =====

Deno.test("Units: SchemaValidator.validate() required field missing", async (t) => {
  await t.step("object missing required field returns error with field name", (): void => {
    logger.debug("Before: validate missing required field");
    const result = SchemaValidator.validate({ title: "Dev" }, flatStringSchema());
    logger.debug("After: validate missing required field", result);
    const error = assertConfigValidationError(result);
    assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
    if (error.kind === "CONFIG_VALIDATION_ERROR") {
      assertEquals(error.violations[0].field, "name");
    }
  });

  await t.step("required field set to undefined returns error", (): void => {
    logger.debug("Before: validate required field = undefined");
    const result = SchemaValidator.validate(
      { name: undefined, title: "Dev" },
      flatStringSchema(),
    );
    logger.debug("After: validate required field = undefined", result);
    const error = assertConfigValidationError(result);
    assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
    if (error.kind === "CONFIG_VALIDATION_ERROR") {
      assertEquals(error.violations[0].field, "name");
    }
  });

  await t.step("required field set to null returns error", (): void => {
    logger.debug("Before: validate required field = null");
    const result = SchemaValidator.validate(
      { name: null, title: "Dev" },
      flatStringSchema(),
    );
    logger.debug("After: validate required field = null", result);
    const error = assertConfigValidationError(result);
    assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
    if (error.kind === "CONFIG_VALIDATION_ERROR") {
      assertEquals(error.violations[0].field, "name");
    }
  });
});

// ===== Early-return behavior =====

Deno.test("Units: SchemaValidator.validate() early-return behavior", async (t) => {
  await t.step(
    "returns only first violation on early-return (2 missing required fields)",
    (): void => {
      logger.debug("Before: validate 2 missing required fields");
      const schema: Schema = {
        fields: [
          { name: "a", type: "string", required: true },
          { name: "b", type: "string", required: true },
        ],
      };
      const result = SchemaValidator.validate({}, schema);
      logger.debug("After: validate 2 missing required fields", result);
      const error = assertConfigValidationError(result, undefined, 1);
      assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
      if (error.kind === "CONFIG_VALIDATION_ERROR") {
        assertEquals(
          error.violations.length,
          1,
          "Early-return: only first violation reported",
        );
        assertEquals(error.violations[0].field, "a");
      }
    },
  );
});

// ===== Wrong type =====

Deno.test("Units: SchemaValidator.validate() wrong type errors", async (t) => {
  await t.step("string field with number value returns error", (): void => {
    logger.debug("Before: validate string field with number");
    const schema: Schema = {
      fields: [{ name: "name", type: "string", required: true }],
    };
    const result = SchemaValidator.validate({ name: 123 }, schema);
    logger.debug("After: validate string field with number", result);
    const error = assertConfigValidationError(result);
    assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
    if (error.kind === "CONFIG_VALIDATION_ERROR") {
      assertEquals(error.violations[0].field, "name");
      assertEquals(error.violations[0].expectedType, "string");
      assertEquals(error.violations[0].actualType, "number");
    }
  });

  await t.step("number field with string value returns error", (): void => {
    logger.debug("Before: validate number field with string");
    const schema: Schema = {
      fields: [{ name: "age", type: "number", required: true }],
    };
    const result = SchemaValidator.validate({ age: "twenty" }, schema);
    logger.debug("After: validate number field with string", result);
    const error = assertConfigValidationError(result);
    assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
    if (error.kind === "CONFIG_VALIDATION_ERROR") {
      assertEquals(error.violations[0].expectedType, "number");
      assertEquals(error.violations[0].actualType, "string");
    }
  });

  await t.step("boolean field with string value returns error", (): void => {
    logger.debug("Before: validate boolean field with string");
    const schema: Schema = {
      fields: [{ name: "active", type: "boolean", required: true }],
    };
    const result = SchemaValidator.validate({ active: "yes" }, schema);
    logger.debug("After: validate boolean field with string", result);
    const error = assertConfigValidationError(result);
    assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
    if (error.kind === "CONFIG_VALIDATION_ERROR") {
      assertEquals(error.violations[0].expectedType, "boolean");
      assertEquals(error.violations[0].actualType, "string");
    }
  });

  await t.step("object field with string value returns error", (): void => {
    logger.debug("Before: validate object field with string");
    const schema: Schema = {
      fields: [{ name: "data", type: "object", required: true }],
    };
    const result = SchemaValidator.validate({ data: "not_an_object" }, schema);
    logger.debug("After: validate object field with string", result);
    const error = assertConfigValidationError(result);
    assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
    if (error.kind === "CONFIG_VALIDATION_ERROR") {
      assertEquals(error.violations[0].expectedType, "object");
      assertEquals(error.violations[0].actualType, "string");
    }
  });

  await t.step("array field with object value returns error", (): void => {
    logger.debug("Before: validate array field with object");
    const schema: Schema = {
      fields: [{ name: "items", type: "array", required: true }],
    };
    const result = SchemaValidator.validate({ items: { a: 1 } }, schema);
    logger.debug("After: validate array field with object", result);
    const error = assertConfigValidationError(result);
    assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
    if (error.kind === "CONFIG_VALIDATION_ERROR") {
      assertEquals(error.violations[0].expectedType, "array");
      assertEquals(error.violations[0].actualType, "object");
    }
  });
});

// ===== Valid type for each field type =====

Deno.test("Units: SchemaValidator.validate() valid type for each field type", async (t) => {
  await t.step("number field with valid number passes", (): void => {
    logger.debug("Before: validate number field with valid number");
    const schema: Schema = {
      fields: [{ name: "count", type: "number", required: true }],
    };
    const result = SchemaValidator.validate({ count: 42 }, schema);
    logger.debug("After: validate number field with valid number", result);
    assertResultOk(result, "Number field with number value should pass");
  });

  await t.step("boolean field with valid boolean passes", (): void => {
    logger.debug("Before: validate boolean field with valid boolean");
    const schema: Schema = {
      fields: [{ name: "active", type: "boolean", required: true }],
    };
    const result = SchemaValidator.validate({ active: true }, schema);
    logger.debug("After: validate boolean field with valid boolean", result);
    assertResultOk(result, "Boolean field with boolean value should pass");
  });

  await t.step("array field with valid array passes", (): void => {
    logger.debug("Before: validate array field with valid array");
    const schema: Schema = {
      fields: [{ name: "items", type: "array", required: true }],
    };
    const result = SchemaValidator.validate({ items: [1, 2] }, schema);
    logger.debug("After: validate array field with valid array", result);
    assertResultOk(result, "Array field with array value should pass");
  });
});

// ===== Optional fields =====

Deno.test("Units: SchemaValidator.validate() optional field handling", async (t) => {
  await t.step("missing optional field passes validation", (): void => {
    logger.debug("Before: validate missing optional field");
    const result = SchemaValidator.validate(
      { required_field: "present" },
      mixedRequiredOptionalSchema(),
    );
    logger.debug("After: validate missing optional field", result);
    assertResultOk(result, "Missing optional field should pass");
  });

  await t.step("present optional field with wrong type returns error", (): void => {
    logger.debug("Before: validate optional field with wrong type");
    const result = SchemaValidator.validate(
      { required_field: "present", optional_field: 42 },
      mixedRequiredOptionalSchema(),
    );
    logger.debug("After: validate optional field with wrong type", result);
    const error = assertConfigValidationError(result);
    assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
    if (error.kind === "CONFIG_VALIDATION_ERROR") {
      assertEquals(error.violations[0].field, "optional_field");
    }
  });

  await t.step("present optional field with correct type passes", (): void => {
    logger.debug("Before: validate optional field with correct type");
    const result = SchemaValidator.validate(
      { required_field: "present", optional_field: "also_present" },
      mixedRequiredOptionalSchema(),
    );
    logger.debug("After: validate optional field with correct type", result);
    assertResultOk(result, "Correct optional field should pass");
  });
});

// ===== Nested schema validation =====

Deno.test("Units: SchemaValidator.validate() nested schema validation", async (t) => {
  await t.step("valid nested object passes", (): void => {
    logger.debug("Before: validate valid nested object");
    const result = SchemaValidator.validate(
      { id: "1", address: { city: "Osaka" } },
      nestedSchema(),
    );
    logger.debug("After: validate valid nested object", result);
    assertResultOk(result, "Valid nested object should pass");
  });

  await t.step(
    "nested object missing required subfield returns prefixed field name",
    (): void => {
      logger.debug("Before: validate nested missing subfield");
      const result = SchemaValidator.validate(
        { id: "1", address: {} },
        nestedSchema(),
      );
      logger.debug("After: validate nested missing subfield", result);
      const error = assertConfigValidationError(result);
      assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
      if (error.kind === "CONFIG_VALIDATION_ERROR") {
        assertEquals(
          error.violations[0].field,
          "address.city",
          "Nested field name should be prefixed with parent",
        );
      }
    },
  );

  await t.step("nested object with wrong type subfield returns error", (): void => {
    logger.debug("Before: validate nested wrong type subfield");
    const result = SchemaValidator.validate(
      { id: "1", address: { city: 123 } },
      nestedSchema(),
    );
    logger.debug("After: validate nested wrong type subfield", result);
    const error = assertConfigValidationError(result);
    assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
    if (error.kind === "CONFIG_VALIDATION_ERROR") {
      assertEquals(error.violations[0].field, "address.city");
      assertEquals(error.violations[0].expectedType, "string");
      assertEquals(error.violations[0].actualType, "number");
    }
  });

  await t.step(
    "2-level nested schema produces correct prefixed field name",
    (): void => {
      logger.debug("Before: validate 2-level nested schema");
      const deepSchema: Schema = {
        fields: [{
          name: "level1",
          type: "object",
          required: true,
          schema: {
            fields: [{
              name: "level2",
              type: "object",
              required: true,
              schema: {
                fields: [{
                  name: "value",
                  type: "string",
                  required: true,
                }],
              },
            }],
          },
        }],
      };
      const result = SchemaValidator.validate(
        { level1: { level2: {} } },
        deepSchema,
      );
      logger.debug("After: validate 2-level nested schema", result);
      const error = assertConfigValidationError(result);
      assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
      if (error.kind === "CONFIG_VALIDATION_ERROR") {
        assertEquals(error.violations[0].field, "level1.level2.value");
      }
    },
  );
});

// ===== Custom validator =====

Deno.test("Units: SchemaValidator.validate() custom validator handling", async (t) => {
  const passingValidator = (_value: unknown): Result<true, UnifiedError> => {
    return Result.ok(true as const);
  };

  const failingValidator = (_value: unknown): Result<true, UnifiedError> => {
    return Result.err(ErrorFactories.configValidationError("custom_validation", [{
      field: "custom_field",
      value: _value,
      expectedType: "string",
      actualType: typeof _value,
      constraint: "Custom validation failed",
    }]));
  };

  await t.step("field passes custom validator -> overall passes", (): void => {
    logger.debug("Before: validate with passing custom validator");
    const schema: Schema = {
      fields: [{
        name: "value",
        type: "string",
        required: true,
        validator: passingValidator,
      }],
    };
    const result = SchemaValidator.validate({ value: "hello" }, schema);
    logger.debug("After: validate with passing custom validator", result);
    assertResultOk(result, "Passing custom validator should succeed");
  });

  await t.step("field fails custom validator -> returns custom error", (): void => {
    logger.debug("Before: validate with failing custom validator");
    const schema: Schema = {
      fields: [{
        name: "value",
        type: "string",
        required: true,
        validator: failingValidator,
      }],
    };
    const result = SchemaValidator.validate({ value: "hello" }, schema);
    logger.debug("After: validate with failing custom validator", result);
    assertResultErr(result, "Failing custom validator should return error");
  });

  await t.step("optional missing field -> custom validator not called", (): void => {
    logger.debug("Before: validate optional missing with custom validator");
    let validatorCalled = false;
    const trackingValidator = (_value: unknown): Result<true, UnifiedError> => {
      validatorCalled = true;
      return Result.ok(true as const);
    };
    const schema: Schema = {
      fields: [{
        name: "opt",
        type: "string",
        required: false,
        validator: trackingValidator,
      }],
    };
    const result = SchemaValidator.validate({}, schema);
    logger.debug("After: validate optional missing with custom validator", result);
    assertResultOk(result, "Optional missing should pass without calling validator");
    const EXPECTED_NOT_CALLED = false;
    assertEquals(
      validatorCalled,
      EXPECTED_NOT_CALLED,
      "Validator should not be called for missing optional",
    );
  });
});

// ===== createAppConfigSchema() =====

Deno.test("Units: SchemaValidator.createAppConfigSchema()", async (t) => {
  await t.step("schema has 3 fields", (): void => {
    logger.debug("Before: createAppConfigSchema field count");
    const schema = SchemaValidator.createAppConfigSchema();
    logger.debug("After: createAppConfigSchema", schema.fields.map((f) => f.name));
    assertEquals(schema.fields.length, 3, "Should have 3 fields");
  });

  await t.step("all fields are required", (): void => {
    logger.debug("Before: check app config fields required");
    const schema = SchemaValidator.createAppConfigSchema();
    for (const field of schema.fields) {
      const EXPECTED_REQUIRED = true;
      assertEquals(
        field.required,
        EXPECTED_REQUIRED,
        `Field '${field.name}' should be required`,
      );
    }
    logger.debug("After: all app config fields are required");
  });

  await t.step("app_prompt has nested schema with base_dir", (): void => {
    logger.debug("Before: check app_prompt nested schema");
    const schema = SchemaValidator.createAppConfigSchema();
    const appPrompt = schema.fields.find((f) => f.name === "app_prompt");
    assert(appPrompt !== undefined, "app_prompt field should exist");
    assert(appPrompt.schema !== undefined, "app_prompt should have nested schema");
    const baseDir = appPrompt.schema.fields.find((f) => f.name === "base_dir");
    assert(baseDir !== undefined, "app_prompt should have base_dir subfield");
    logger.debug("After: app_prompt nested schema verified");
  });

  await t.step("app_schema has nested schema with base_dir", (): void => {
    logger.debug("Before: check app_schema nested schema");
    const schema = SchemaValidator.createAppConfigSchema();
    const appSchema = schema.fields.find((f) => f.name === "app_schema");
    assert(appSchema !== undefined, "app_schema field should exist");
    assert(appSchema.schema !== undefined, "app_schema should have nested schema");
    const baseDir = appSchema.schema.fields.find((f) => f.name === "base_dir");
    assert(baseDir !== undefined, "app_schema should have base_dir subfield");
    logger.debug("After: app_schema nested schema verified");
  });

  await t.step("validates a complete valid app config", (): void => {
    logger.debug("Before: validate complete valid app config");
    const schema = SchemaValidator.createAppConfigSchema();
    const result = SchemaValidator.validate({
      working_dir: "./work",
      app_prompt: { base_dir: "./prompts" },
      app_schema: { base_dir: "./schemas" },
    }, schema);
    logger.debug("After: validate complete valid app config", result);
    assertResultOk(result, "Complete valid app config should pass");
  });

  await t.step("empty string working_dir fails non-empty validator", (): void => {
    logger.debug("Before: validate empty working_dir");
    const schema = SchemaValidator.createAppConfigSchema();
    const result = SchemaValidator.validate({
      working_dir: "",
      app_prompt: { base_dir: "./prompts" },
      app_schema: { base_dir: "./schemas" },
    }, schema);
    logger.debug("After: validate empty working_dir", result);
    assertResultErr(result, "Empty working_dir should fail");
  });

  await t.step("missing required field in app config fails", (): void => {
    logger.debug("Before: validate app config missing working_dir");
    const schema = SchemaValidator.createAppConfigSchema();
    const result = SchemaValidator.validate({
      app_prompt: { base_dir: "./prompts" },
      app_schema: { base_dir: "./schemas" },
    }, schema);
    logger.debug("After: validate app config missing working_dir", result);
    const error = assertConfigValidationError(result);
    assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
    if (error.kind === "CONFIG_VALIDATION_ERROR") {
      assertEquals(error.violations[0].field, "working_dir");
    }
  });
});

// ===== createUserConfigSchema() =====

Deno.test("Units: SchemaValidator.createUserConfigSchema()", async (t) => {
  await t.step("schema has 3 fields", (): void => {
    logger.debug("Before: createUserConfigSchema field count");
    const schema = SchemaValidator.createUserConfigSchema();
    logger.debug("After: createUserConfigSchema", schema.fields.map((f) => f.name));
    assertEquals(schema.fields.length, 3, "Should have 3 fields");
  });

  await t.step("all fields are optional", (): void => {
    logger.debug("Before: check user config fields optional");
    const schema = SchemaValidator.createUserConfigSchema();
    for (const field of schema.fields) {
      const EXPECTED_OPTIONAL = false;
      assertEquals(
        field.required,
        EXPECTED_OPTIONAL,
        `Field '${field.name}' should be optional`,
      );
    }
    logger.debug("After: all user config fields are optional");
  });

  await t.step("valid partial object passes", (): void => {
    logger.debug("Before: validate partial user config");
    const schema = SchemaValidator.createUserConfigSchema();
    const result = SchemaValidator.validate({ working_dir: "./custom" }, schema);
    logger.debug("After: validate partial user config", result);
    assertResultOk(result, "Partial user config with only working_dir should pass");
  });

  await t.step("empty object passes since all fields optional", (): void => {
    logger.debug("Before: validate empty user config");
    const schema = SchemaValidator.createUserConfigSchema();
    const result = SchemaValidator.validate({}, schema);
    logger.debug("After: validate empty user config", result);
    assertResultOk(result, "Empty object should pass for user config");
  });

  await t.step("user config with wrong type fails", (): void => {
    logger.debug("Before: validate user config wrong type");
    const schema = SchemaValidator.createUserConfigSchema();
    const result = SchemaValidator.validate({ working_dir: 123 }, schema);
    logger.debug("After: validate user config wrong type", result);
    assertConfigValidationError(result);
  });

  await t.step("user config nested empty base_dir fails validator", (): void => {
    logger.debug("Before: validate user config empty nested base_dir");
    const schema = SchemaValidator.createUserConfigSchema();
    const result = SchemaValidator.validate({
      app_prompt: { base_dir: "" },
    }, schema);
    logger.debug("After: validate user config empty nested base_dir", result);
    assertResultErr(result, "Empty base_dir in nested schema should fail");
  });
});
