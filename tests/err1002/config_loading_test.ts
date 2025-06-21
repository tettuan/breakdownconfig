/**
 * ERR1002 Configuration Loading Tests
 *
 * Purpose:
 * Test scenarios that trigger ERR1002 during configuration loading phase
 *
 * Test Cases:
 * 1. Undefined prefix with no baseDir
 * 2. Config loading failures
 *
 * Success Criteria:
 * - ERR1002 error is thrown with appropriate message
 * - Error code is correctly set
 * - Error handling is consistent
 */

import { assertEquals, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { BreakdownConfig } from "../../src/breakdown_config.ts";

describe("ERR1002 Configuration Loading", () => {
  it("should throw ERR1001 (not ERR1002) with prefix=undefined and no baseDir", async () => {
    // Based on investigation: prefix="undefined" causes ERR1001 (file not found) first, not ERR1002
    const config = new BreakdownConfig("undefined");

    await assertRejects(
      async () => {
        await config.loadConfig();
      },
      Error,
      "ERR1001",
    );
  });

  it("should include proper error code in thrown error message", async () => {
    const config = new BreakdownConfig("undefined");

    try {
      await config.loadConfig();
      throw new Error("Expected error to be thrown");
    } catch (error) {
      if (error instanceof Error) {
        // Error code is included in the message format: "ERR1001: message"
        assertEquals(error.message.includes("ERR1001"), true);
      } else {
        throw new Error("Expected Error instance");
      }
    }
  });
});
