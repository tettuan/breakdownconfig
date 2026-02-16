/**
 * Units Tests for SafeConfigLoader
 * Level 2: Verifies individual function behavior and business logic
 */

import { assertEquals } from "@std/assert";
import { BreakdownLogger } from "@tettuan/breakdownlogger";
import { SafeConfigLoader } from "./safe_config_loader.ts";
import {
  assertConfigFileNotFoundError,
  assertConfigParseError,
  assertConfigValidationError,
  assertResultErr,
  assertResultOk,
} from "../../tests/test_helpers/result_test_helpers.ts";

const logger = new BreakdownLogger();

interface SimpleConfig {
  key: string;
}

function isSimpleConfig(config: unknown): config is SimpleConfig {
  return typeof config === "object" && config !== null && "key" in config &&
    typeof (config as SimpleConfig).key === "string";
}

Deno.test("Units: SafeConfigLoader.readFile()", async (t) => {
  await t.step("reads existing file content successfully", async () => {
    const tmpFile = await Deno.makeTempFile({ suffix: ".yaml" });
    try {
      await Deno.writeTextFile(tmpFile, "key: value");
      const loader = new SafeConfigLoader(tmpFile);

      logger.debug("readFile: before reading existing file");
      const result = await loader.readFile();
      logger.debug("readFile: after reading existing file");

      const data = assertResultOk(result);
      assertEquals(data, "key: value");
    } finally {
      await Deno.remove(tmpFile);
    }
  });

  await t.step("returns CONFIG_FILE_NOT_FOUND for non-existent path", async () => {
    const loader = new SafeConfigLoader("/tmp/nonexistent_test_file_12345.yaml");

    logger.debug("readFile: before reading non-existent file");
    const result = await loader.readFile();
    logger.debug("readFile: after reading non-existent file");

    assertConfigFileNotFoundError(result, "/tmp/nonexistent_test_file_12345.yaml");
  });

  await t.step("preserves configType 'app' in error", async () => {
    const loader = new SafeConfigLoader("/tmp/no_such_file.yaml", "app");

    logger.debug("readFile: before reading with configType app");
    const result = await loader.readFile();
    logger.debug("readFile: after reading with configType app");

    assertConfigFileNotFoundError(result, "/tmp/no_such_file.yaml", "app");
  });

  await t.step("preserves configType 'user' in error", async () => {
    const loader = new SafeConfigLoader("/tmp/no_such_file.yaml", "user");

    logger.debug("readFile: before reading with configType user");
    const result = await loader.readFile();
    logger.debug("readFile: after reading with configType user");

    assertConfigFileNotFoundError(result, "/tmp/no_such_file.yaml", "user");
  });
});

Deno.test("Units: SafeConfigLoader.parseYaml()", async (t) => {
  await t.step("parses valid YAML string", () => {
    const loader = new SafeConfigLoader("dummy.yaml");

    logger.debug("parseYaml: before parsing simple YAML");
    const result = loader.parseYaml("key: value");
    logger.debug("parseYaml: after parsing simple YAML");

    const data = assertResultOk(result);
    assertEquals(data, { key: "value" });
  });

  await t.step("parses complex nested YAML correctly", () => {
    const loader = new SafeConfigLoader("dummy.yaml");
    const yaml = `
parent:
  child: hello
  list:
    - one
    - two
`;

    logger.debug("parseYaml: before parsing nested YAML");
    const result = loader.parseYaml(yaml);
    logger.debug("parseYaml: after parsing nested YAML");

    const data = assertResultOk(result);
    assertEquals(data, { parent: { child: "hello", list: ["one", "two"] } });
  });

  await t.step("returns null for empty string (valid YAML)", () => {
    const loader = new SafeConfigLoader("dummy.yaml");

    logger.debug("parseYaml: before parsing empty string");
    const result = loader.parseYaml("");
    logger.debug("parseYaml: after parsing empty string");

    const data = assertResultOk(result);
    assertEquals(data, null);
  });

  await t.step("returns CONFIG_PARSE_ERROR for invalid YAML with line/column info", () => {
    const loader = new SafeConfigLoader("dummy.yaml");

    logger.debug("parseYaml: before parsing invalid YAML");
    const result = loader.parseYaml("{{{{");
    logger.debug("parseYaml: after parsing invalid YAML");

    const error = assertConfigParseError(result, "dummy.yaml");
    assertEquals(error.kind, "CONFIG_PARSE_ERROR");
    if (error.kind === "CONFIG_PARSE_ERROR") {
      assertEquals(typeof error.line, "number", "line should be a number");
      assertEquals(typeof error.column, "number", "column should be a number");
    }
  });
});

Deno.test("Units: SafeConfigLoader.validate()", async (t) => {
  await t.step("returns success when type guard passes", () => {
    const loader = new SafeConfigLoader("dummy.yaml");
    const config = { key: "hello" };

    logger.debug("validate: before validating with passing guard");
    const result = loader.validate<SimpleConfig>(config, isSimpleConfig);
    logger.debug("validate: after validating with passing guard");

    const data = assertResultOk(result);
    assertEquals(data, { key: "hello" });
  });

  await t.step("returns CONFIG_VALIDATION_ERROR when type guard fails", () => {
    const loader = new SafeConfigLoader("dummy.yaml");
    const config = { wrong: 123 };

    logger.debug("validate: before validating with failing guard");
    const result = loader.validate<SimpleConfig>(config, isSimpleConfig);
    logger.debug("validate: after validating with failing guard");

    assertConfigValidationError(result, "dummy.yaml", 1);
  });
});

Deno.test("Units: SafeConfigLoader.load()", async (t) => {
  await t.step("full pipeline succeeds with valid YAML file", async () => {
    const tmpFile = await Deno.makeTempFile({ suffix: ".yaml" });
    try {
      await Deno.writeTextFile(tmpFile, "key: hello");
      const loader = new SafeConfigLoader(tmpFile);

      logger.debug("load: before full pipeline with valid file");
      const result = await loader.load<SimpleConfig>(isSimpleConfig);
      logger.debug("load: after full pipeline with valid file");

      const data = assertResultOk(result);
      assertEquals(data, { key: "hello" });
    } finally {
      await Deno.remove(tmpFile);
    }
  });

  await t.step("returns CONFIG_FILE_NOT_FOUND for missing file", async () => {
    const loader = new SafeConfigLoader("/tmp/nonexistent_load_test.yaml");

    logger.debug("load: before loading missing file");
    const result = await loader.load<SimpleConfig>(isSimpleConfig);
    logger.debug("load: after loading missing file");

    assertConfigFileNotFoundError(result, "/tmp/nonexistent_load_test.yaml");
  });

  await t.step("returns CONFIG_PARSE_ERROR for invalid YAML in file", async () => {
    const tmpFile = await Deno.makeTempFile({ suffix: ".yaml" });
    try {
      await Deno.writeTextFile(tmpFile, "{{{{");
      const loader = new SafeConfigLoader(tmpFile);

      logger.debug("load: before loading file with invalid YAML");
      const result = await loader.load<SimpleConfig>(isSimpleConfig);
      logger.debug("load: after loading file with invalid YAML");

      assertConfigParseError(result, tmpFile);
    } finally {
      await Deno.remove(tmpFile);
    }
  });

  await t.step("returns CONFIG_VALIDATION_ERROR when validator fails", async () => {
    const tmpFile = await Deno.makeTempFile({ suffix: ".yaml" });
    try {
      await Deno.writeTextFile(tmpFile, "wrong: 123");
      const loader = new SafeConfigLoader(tmpFile);

      logger.debug("load: before loading with failing validator");
      const result = await loader.load<SimpleConfig>(isSimpleConfig);
      logger.debug("load: after loading with failing validator");

      const error = assertResultErr(result);
      assertEquals(error.kind, "CONFIG_VALIDATION_ERROR");
    } finally {
      await Deno.remove(tmpFile);
    }
  });
});
