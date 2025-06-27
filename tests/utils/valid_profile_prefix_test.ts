import { assertEquals } from "@std/assert";
import { ValidProfilePrefix } from "../../src/utils/valid_path.ts";

Deno.test("ValidProfilePrefix - Valid cases", () => {
  const testCases = [
    "production",
    "development",
    "staging",
    "test",
    "staging-v2",
    "test-env",
    "prod-2024",
    "dev-feature-123",
    "a",
    "1",
    "a-b-c-d",
    "123-456-789",
  ];

  for (const testCase of testCases) {
    const result = ValidProfilePrefix.create(testCase);
    assertEquals(result.success, true, `Should accept valid prefix: ${testCase}`);
    
    if (result.success) {
      assertEquals(ValidProfilePrefix.isValidProfilePrefix(result.data), true);
      assertEquals(result.data.getValue(), testCase);
      assertEquals(result.data.toString(), testCase);
    }
  }
});

Deno.test("ValidProfilePrefix - Invalid cases", () => {
  const testCases = [
    { value: "", expectedError: "Profile prefix cannot be empty" },
    { value: " ", expectedError: "Profile prefix cannot be empty" },
    { value: "   ", expectedError: "Profile prefix cannot be empty" },
    { value: "prod@123", expectedError: "Only alphanumeric characters and hyphens are allowed" },
    { value: "prod_123", expectedError: "Only alphanumeric characters and hyphens are allowed" },
    { value: "prod.123", expectedError: "Only alphanumeric characters and hyphens are allowed" },
    { value: "prod/123", expectedError: "Only alphanumeric characters and hyphens are allowed" },
    { value: "prod\\123", expectedError: "Only alphanumeric characters and hyphens are allowed" },
    { value: "prod:123", expectedError: "Only alphanumeric characters and hyphens are allowed" },
    { value: "prod*123", expectedError: "Only alphanumeric characters and hyphens are allowed" },
    { value: "prod?123", expectedError: "Only alphanumeric characters and hyphens are allowed" },
    { value: "prod|123", expectedError: "Only alphanumeric characters and hyphens are allowed" },
    { value: "プロダクション", expectedError: "Only alphanumeric characters and hyphens are allowed" },
    { value: "prod 123", expectedError: "Only alphanumeric characters and hyphens are allowed" },
    { value: "prod\t123", expectedError: "Only alphanumeric characters and hyphens are allowed" },
    { value: "prod\n123", expectedError: "Only alphanumeric characters and hyphens are allowed" },
  ];

  for (const { value, expectedError } of testCases) {
    const result = ValidProfilePrefix.create(value);
    assertEquals(result.success, false, `Should reject invalid prefix: "${value}"`);
    
    if (!result.success) {
      assertEquals(result.error.kind, "CONFIG_VALIDATION_ERROR");
      const errorMessage = result.error.message;
      assertEquals(errorMessage.includes(expectedError), true,
        `Error message should contain "${expectedError}" for value "${value}"`);
    }
  }
});

Deno.test("ValidProfilePrefix - Type guard", () => {
  const validResult = ValidProfilePrefix.create("production");
  if (validResult.success) {
    assertEquals(ValidProfilePrefix.isValidProfilePrefix(validResult.data), true);
  }
  
  assertEquals(ValidProfilePrefix.isValidProfilePrefix("production"), false);
  assertEquals(ValidProfilePrefix.isValidProfilePrefix(123), false);
  assertEquals(ValidProfilePrefix.isValidProfilePrefix(null), false);
  assertEquals(ValidProfilePrefix.isValidProfilePrefix(undefined), false);
  assertEquals(ValidProfilePrefix.isValidProfilePrefix({}), false);
});

Deno.test("ValidProfilePrefix - Equality", () => {
  const result1 = ValidProfilePrefix.create("production");
  const result2 = ValidProfilePrefix.create("production");
  const result3 = ValidProfilePrefix.create("development");
  
  if (result1.success && result2.success && result3.success) {
    assertEquals(result1.data.equals(result2.data), true, "Same values should be equal");
    assertEquals(result1.data.equals(result3.data), false, "Different values should not be equal");
  }
});