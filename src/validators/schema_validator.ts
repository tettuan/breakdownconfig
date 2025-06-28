import { ConfigResult, Result, ValidationError } from "../types/config_result.ts";

/**
 * Schema definition for validating configuration objects
 */
export interface SchemaField {
  /** Field name */
  name: string;
  /** Expected type of the field */
  type: "string" | "number" | "boolean" | "object" | "array";
  /** Whether the field is required */
  required: boolean;
  /** Nested schema for object types */
  schema?: Schema;
  /** Custom validation function */
  validator?: (value: unknown) => ConfigResult<true, ValidationError>;
}

/**
 * Schema definition for configuration validation
 */
export interface Schema {
  /** List of fields to validate */
  fields: SchemaField[];
}

/**
 * Schema-based validator for configuration objects
 *
 * Provides flexible schema validation with detailed error reporting
 * using ConfigResult type for safe error handling.
 */
export class SchemaValidator {
  /**
   * Validates a value against a schema
   *
   * @param value - Value to validate
   * @param schema - Schema to validate against
   * @returns Validation result with detailed error information
   */
  static validate(
    value: unknown,
    schema: Schema,
  ): ConfigResult<true, ValidationError> {
    if (!value || typeof value !== "object") {
      return Result.err({
        field: "root",
        value,
        expectedType: "object",
        message: "Value must be an object",
      });
    }

    const obj = value as Record<string, unknown>;

    // Validate each field in the schema
    for (const field of schema.fields) {
      const fieldValue = obj[field.name];

      // Check required fields
      if (field.required && (fieldValue === undefined || fieldValue === null)) {
        return Result.err({
          field: field.name,
          value: fieldValue,
          expectedType: field.type,
          message: `Required field '${field.name}' is missing`,
        });
      }

      // Skip validation for optional fields that are not present
      if (!field.required && (fieldValue === undefined || fieldValue === null)) {
        continue;
      }

      // Validate field type
      const typeResult = this.validateType(fieldValue, field.type, field.name);
      if (!typeResult.success) {
        return typeResult;
      }

      // Validate nested object schema
      if (field.type === "object" && field.schema) {
        const nestedResult = this.validate(fieldValue, field.schema);
        if (!nestedResult.success) {
          // Type guard: nestedResult.error is ValidationError
          const error = nestedResult.error;
          return Result.err({
            field: `${field.name}.${error.field}`,
            value: error.value,
            expectedType: error.expectedType,
            message: error.message ?? `Validation failed for field '${field.name}'`,
          });
        }
      }

      // Run custom validator if provided
      if (field.validator) {
        const customResult = field.validator(fieldValue);
        if (!customResult.success) {
          return customResult;
        }
      }
    }

    return Result.ok(true);
  }

  /**
   * Validates the type of a value
   *
   * @param value - Value to check
   * @param expectedType - Expected type
   * @param fieldName - Name of the field being validated
   * @returns Validation result
   */
  private static validateType(
    value: unknown,
    expectedType: "string" | "number" | "boolean" | "object" | "array",
    fieldName: string,
  ): ConfigResult<true, ValidationError> {
    let actualType: string;

    if (value === null) {
      actualType = "null";
    } else if (Array.isArray(value)) {
      actualType = "array";
    } else {
      actualType = typeof value;
    }

    if (actualType !== expectedType) {
      return Result.err({
        field: fieldName,
        value,
        expectedType,
        message: `Expected ${expectedType} but got ${actualType}`,
      });
    }

    return Result.ok(true);
  }

  /**
   * Creates a schema for AppConfig validation
   */
  static createAppConfigSchema(): Schema {
    return {
      fields: [
        {
          name: "working_dir",
          type: "string",
          required: true,
          validator: (value) => this.validateNonEmptyString(value as string, "working_dir"),
        },
        {
          name: "app_prompt",
          type: "object",
          required: true,
          schema: {
            fields: [
              {
                name: "base_dir",
                type: "string",
                required: true,
                validator: (value) =>
                  this.validateNonEmptyString(value as string, "app_prompt.base_dir"),
              },
            ],
          },
        },
        {
          name: "app_schema",
          type: "object",
          required: true,
          schema: {
            fields: [
              {
                name: "base_dir",
                type: "string",
                required: true,
                validator: (value) =>
                  this.validateNonEmptyString(value as string, "app_schema.base_dir"),
              },
            ],
          },
        },
      ],
    };
  }

  /**
   * Creates a schema for UserConfig validation
   */
  static createUserConfigSchema(): Schema {
    return {
      fields: [
        {
          name: "working_dir",
          type: "string",
          required: false,
          validator: (value) => this.validateNonEmptyString(value as string, "working_dir"),
        },
        {
          name: "app_prompt",
          type: "object",
          required: false,
          schema: {
            fields: [
              {
                name: "base_dir",
                type: "string",
                required: false,
                validator: (value) =>
                  this.validateNonEmptyString(value as string, "app_prompt.base_dir"),
              },
            ],
          },
        },
        {
          name: "app_schema",
          type: "object",
          required: false,
          schema: {
            fields: [
              {
                name: "base_dir",
                type: "string",
                required: false,
                validator: (value) =>
                  this.validateNonEmptyString(value as string, "app_schema.base_dir"),
              },
            ],
          },
        },
      ],
    };
  }

  /**
   * Validates that a string is not empty
   */
  private static validateNonEmptyString(
    value: string,
    fieldName: string,
  ): ConfigResult<true, ValidationError> {
    if (!value || value.trim() === "") {
      return Result.err({
        field: fieldName,
        value,
        expectedType: "string",
        message: `Field '${fieldName}' must be a non-empty string`,
      });
    }
    return Result.ok(true);
  }
}
