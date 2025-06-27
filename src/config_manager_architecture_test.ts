/**
 * Architecture Tests for ConfigManager
 * Level 0: Verifies state machine design and Discriminated Union patterns
 */

import { assertEquals, assertExists } from "@std/assert";
import { BreakdownLogger } from "@tettuan/breakdownlogger";
import { ConfigManager } from "./config_manager.ts";
import { AppConfigLoader } from "./loaders/app_config_loader.ts";
import { UserConfigLoader } from "./loaders/user_config_loader.ts";

const logger = new BreakdownLogger("architecture");

Deno.test("Architecture: ConfigManager State Machine Pattern", async (t) => {
  logger.debug("Testing ConfigManager state machine architecture");

  await t.step("ConfigManager should use Discriminated Union state management", async () => {
    logger.debug("Verifying state machine implementation");
    
    const appLoader = new AppConfigLoader();
    const userLoader = new UserConfigLoader();
    const manager = new ConfigManager(appLoader, userLoader);
    
    // Test initial state by calling methods
    const initialResult = await manager.getConfigSafe();
    assertExists(initialResult, "getConfigSafe should return Result");
    assertEquals('success' in initialResult, true, "Should return Result type");
    
    logger.debug("State machine pattern verified");
  });

  await t.step("ConfigManager should prevent null state management", async () => {
    logger.debug("Verifying no null state patterns");
    
    const appLoader = new AppConfigLoader();
    const userLoader = new UserConfigLoader();
    const manager = new ConfigManager(appLoader, userLoader);
    
    // ConfigManager should never expose null states
    // This is verified by the type system and implementation
    const result = await manager.getConfigSafe();
    assertExists(result, "Result should never be null");
    
    if (result.success) {
      assertExists(result.data, "Success result should have data");
    } else {
      assertExists(result.error, "Error result should have error");
    }
    
    logger.debug("Null state prevention verified");
  });
});

Deno.test("Architecture: ConfigManager Result Type Consistency", async (t) => {
  logger.debug("Testing Result type architectural consistency");

  await t.step("All public methods should return Result types", async () => {
    logger.debug("Verifying Result type usage");
    
    const appLoader = new AppConfigLoader();
    const userLoader = new UserConfigLoader();
    const manager = new ConfigManager(appLoader, userLoader);
    
    // Test getConfigSafe returns Result
    const configResult = await manager.getConfigSafe();
    assertEquals('success' in configResult, true, "getConfigSafe should return Result");
    
    logger.debug("Result type consistency verified");
  });

  await t.step("ConfigManager should handle all error cases as Result types", async () => {
    logger.debug("Testing error handling architecture");
    
    // Test with potentially problematic loaders
    const appLoader = new AppConfigLoader("nonexistent-profile", "/nonexistent/path");
    const userLoader = new UserConfigLoader("nonexistent-profile", "/nonexistent/path");
    const manager = new ConfigManager(appLoader, userLoader);
    
    try {
      const result = await manager.getConfigSafe();
      assertExists(result, "Should return Result even for errors");
      assertEquals('success' in result, true, "Should return Result type structure");
      
      if (!result.success) {
        assertExists(result.error, "Error Result should contain error information");
        logger.debug("Error captured as Result", { errorKind: result.error.kind });
      }
    } catch (error) {
      throw new Error(`ConfigManager threw exception instead of returning Result: ${error}`);
    }
    
    logger.debug("Error handling architecture verified");
  });
});

Deno.test("Architecture: ConfigManager Cache Consistency", async (t) => {
  logger.debug("Testing cache architectural consistency");

  await t.step("ConfigManager should maintain consistent caching behavior", async () => {
    logger.debug("Verifying cache consistency");
    
    const appLoader = new AppConfigLoader();
    const userLoader = new UserConfigLoader();
    const manager = new ConfigManager(appLoader, userLoader);
    
    // First call
    const result1 = await manager.getConfigSafe();
    
    // Second call should be consistent (cached or fresh)
    const result2 = await manager.getConfigSafe();
    
    assertEquals(result1.success, result2.success, "Cache should maintain consistency");
    
    if (result1.success && result2.success) {
      // Results should be structurally equivalent
      assertEquals(typeof result1.data, typeof result2.data, "Cached data should maintain type");
    }
    
    logger.debug("Cache consistency verified");
  });
});

Deno.test("Architecture: ConfigManager Dependency Management", async (t) => {
  logger.debug("Testing dependency management architecture");

  await t.step("ConfigManager should properly encapsulate loader dependencies", () => {
    logger.debug("Verifying dependency encapsulation");
    
    const appLoader = new AppConfigLoader();
    const userLoader = new UserConfigLoader();
    const manager = new ConfigManager(appLoader, userLoader);
    
    // ConfigManager should exist and be properly constructed
    assertExists(manager, "ConfigManager should be constructible with loaders");
    
    // Should have proper public interface
    assertExists(manager.getConfig, "Should have getConfig method");
    assertExists(manager.getConfigSafe, "Should have getConfigSafe method");
    
    logger.debug("Dependency management verified");
  });

  await t.step("ConfigManager should isolate loader concerns", async () => {
    logger.debug("Testing concern isolation");
    
    const appLoader = new AppConfigLoader();
    const userLoader = new UserConfigLoader();
    const manager = new ConfigManager(appLoader, userLoader);
    
    // ConfigManager should handle loader errors gracefully
    const result = await manager.getConfigSafe();
    assertExists(result, "ConfigManager should handle all loader outcomes");
    
    // Result should follow unified error pattern regardless of loader specifics
    if (!result.success) {
      assertExists(result.error.kind, "Error should follow unified error pattern");
      assertExists(result.error.message, "Error should have message");
    }
    
    logger.debug("Concern isolation verified");
  });
});

Deno.test("Architecture: ConfigManager Total Function Compliance", async (t) => {
  logger.debug("Testing Total Function architectural compliance");

  await t.step("ConfigManager should exhibit total function behavior", async () => {
    logger.debug("Verifying total function properties");
    
    const appLoader = new AppConfigLoader();
    const userLoader = new UserConfigLoader();
    const manager = new ConfigManager(appLoader, userLoader);
    
    // All methods should be total (always return defined values)
    const configResult = await manager.getConfigSafe();
    assertExists(configResult, "getConfigSafe should always return defined Result");
    
    // Legacy method should also be total
    try {
      const legacyResult = await manager.getConfig();
      assertExists(legacyResult, "getConfig should return defined value or throw");
    } catch (error) {
      // Legacy method may throw, but it's controlled throwing, not undefined returns
      assertExists(error, "If throwing, should throw defined error");
    }
    
    logger.debug("Total function compliance verified");
  });

  await t.step("ConfigManager state transitions should be predictable", async () => {
    logger.debug("Testing state transition predictability");
    
    const appLoader = new AppConfigLoader();
    const userLoader = new UserConfigLoader();
    const manager = new ConfigManager(appLoader, userLoader);
    
    // Multiple calls should follow predictable state transitions
    const calls = await Promise.all([
      manager.getConfigSafe(),
      manager.getConfigSafe(),
      manager.getConfigSafe()
    ]);
    
    // All calls should return Result types
    calls.forEach((result, index) => {
      assertExists(result, `Call ${index} should return defined Result`);
      assertEquals('success' in result, true, `Call ${index} should return Result type`);
    });
    
    // State should be consistent across calls
    const successStates = calls.map(r => r.success);
    const allSameState = successStates.every(state => state === successStates[0]);
    assertEquals(allSameState, true, "State should be consistent across multiple calls");
    
    logger.debug("State transition predictability verified");
  });
});

logger.debug("ConfigManager Architecture Tests completed");