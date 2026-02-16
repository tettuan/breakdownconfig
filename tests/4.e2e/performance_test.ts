import { assert, assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import { stringify } from "@std/yaml";
import { BreakdownConfig } from "../../src/breakdown_config.ts";
import { BreakdownLogger } from "@tettuan/breakdownlogger";

const logger = new BreakdownLogger("performance_test");

const RECURSIVE_OPTIONS = { recursive: true };

interface PerformanceMetrics {
  configSize: string;
  itemCount: number;
  loadTime: number;
  parseTime: number;
  memoryUsed: number;
  throughput: number;
}

async function measurePerformance(
  configPath: string,
  expectedItemCount: number,
): Promise<PerformanceMetrics> {
  const startMemory = Deno.memoryUsage();
  const startTime = performance.now();

  // Create a temporary directory structure for the test
  const tempDir = await Deno.makeTempDir();
  // App config goes in the "working_dir" location
  const appConfigDir = join(tempDir, ".agent", "climpt", "config");
  await Deno.mkdir(appConfigDir, RECURSIVE_OPTIONS);

  // Read JSON test fixture and convert to YAML
  const jsonContent = await Deno.readTextFile(configPath);
  const jsonData = JSON.parse(jsonContent);
  const yamlContent = stringify(jsonData);

  // Write YAML to expected location
  const appConfigPath = join(appConfigDir, "performance-test-app.yml");
  await Deno.writeTextFile(appConfigPath, yamlContent);

  // Debug: log first few lines of YAML
  const yamlLines = yamlContent.split("\n").slice(0, 5).join("\n");
  logger.debug(`YAML content preview:\n${yamlLines}`);

  // Create config instance with the temp directory
  const configResult = BreakdownConfig.create("performance-test", tempDir);
  if (!configResult.success) {
    throw new Error(`Failed to create config: ${JSON.stringify(configResult.error)}`);
  }
  const config = configResult.data;

  // Measure load time
  const loadStartTime = performance.now();
  const loadResult = await config.loadConfigSafe();
  const loadEndTime = performance.now();

  if (!loadResult.success) {
    throw new Error(`Failed to load config: ${JSON.stringify(loadResult.error)}`);
  }

  // Measure parse/access time
  const parseStartTime = performance.now();
  const configDataResult = await config.getConfigSafe();
  const parseEndTime = performance.now();

  if (!configDataResult.success) {
    throw new Error(`Failed to get config: ${configDataResult.error}`);
  }

  const endTime = performance.now();
  const endMemory = Deno.memoryUsage();

  // Clean up temp directory
  await Deno.remove(tempDir, RECURSIVE_OPTIONS);

  // Calculate metrics
  const fileInfo = await Deno.stat(configPath);
  const loadTime = loadEndTime - loadStartTime;
  const parseTime = parseEndTime - parseStartTime;
  const totalTime = endTime - startTime;
  const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
  const throughput = expectedItemCount / (totalTime / 1000); // items per second

  return {
    configSize: formatFileSize(fileInfo.size),
    itemCount: expectedItemCount,
    loadTime: Math.round(loadTime * 100) / 100,
    parseTime: Math.round(parseTime * 100) / 100,
    memoryUsed: Math.round(memoryUsed / 1024 / 1024 * 100) / 100, // MB
    throughput: Math.round(throughput),
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

Deno.test("E2E Performance Tests - Total Function Design", async (t) => {
  const baseDir = join(Deno.cwd(), "tests", "test_fixtures", "performance");
  const testConfigs = [
    { file: "config_small.json", items: 10 },
    { file: "config_medium.json", items: 100 },
    { file: "config_large.json", items: 1000 },
    { file: "config_xlarge.json", items: 10000 },
  ];

  const results: PerformanceMetrics[] = [];

  for (const testConfig of testConfigs) {
    // deno-lint-ignore no-await-in-loop
    await t.step(`Performance test with ${testConfig.file}`, async () => {
      const configPath = join(baseDir, testConfig.file);
      logger.info(`Testing with ${testConfig.file} (${testConfig.items} items)`);

      // Run performance test
      const metrics = await measurePerformance(configPath, testConfig.items);
      results.push(metrics);

      // Log results
      logger.info(`Results for ${testConfig.file}:`);
      logger.info(`  File size: ${metrics.configSize}`);
      logger.info(`  Load time: ${metrics.loadTime}ms`);
      logger.info(`  Parse time: ${metrics.parseTime}ms`);
      logger.info(`  Memory used: ${metrics.memoryUsed}MB`);
      logger.info(`  Throughput: ${metrics.throughput} items/sec`);

      // Verify performance characteristics
      assertExists(metrics.loadTime);
      assertExists(metrics.parseTime);
      assertExists(metrics.memoryUsed);
      assertExists(metrics.throughput);

      // Performance assertions
      assertEquals(metrics.itemCount, testConfig.items);

      // Ensure reasonable performance (adjust thresholds as needed)
      const totalTime = metrics.loadTime + metrics.parseTime;
      if (testConfig.items <= 100) {
        // Small/medium configs should load in under 100ms
        assert(totalTime < 100, `Expected total time < 100ms, got ${totalTime}ms`);
      } else if (testConfig.items <= 1000) {
        // Large configs should load in under 500ms
        assert(totalTime < 500, `Expected total time < 500ms, got ${totalTime}ms`);
      } else {
        // XLarge configs should load in under 2000ms
        assert(totalTime < 2000, `Expected total time < 2000ms, got ${totalTime}ms`);
      }
    });
  }

  await t.step("Performance scaling analysis", () => {
    logger.info("\n=== Performance Scaling Analysis ===");
    logger.info("Config Size | Items | Load Time | Parse Time | Memory | Throughput");
    logger.info("------------|-------|-----------|------------|--------|------------");

    for (const result of results) {
      logger.info(
        `${result.configSize.padEnd(11)} | ${result.itemCount.toString().padEnd(5)} | ` +
          `${result.loadTime.toString().padEnd(9)}ms | ${
            result.parseTime.toString().padEnd(10)
          }ms | ` +
          `${result.memoryUsed.toString().padEnd(6)}MB | ${result.throughput} items/s`,
      );
    }

    // Verify scaling characteristics
    if (results.length >= 2) {
      // Check that performance scales reasonably
      const smallMetrics = results[0];
      const largeMetrics = results[results.length - 1];

      const itemRatio = largeMetrics.itemCount / smallMetrics.itemCount;
      const timeRatio = (largeMetrics.loadTime + largeMetrics.parseTime) /
        (smallMetrics.loadTime + smallMetrics.parseTime);

      logger.info(`\nScaling Analysis:`);
      logger.info(`  Item count increased by: ${itemRatio}x`);
      logger.info(`  Processing time increased by: ${Math.round(timeRatio * 10) / 10}x`);
      logger.info(`  Scaling efficiency: ${Math.round((itemRatio / timeRatio) * 100)}%`);

      // Assert reasonable scaling (sub-linear is good)
      assert(
        timeRatio < itemRatio,
        `Expected sub-linear scaling, but time increased ${timeRatio}x for ${itemRatio}x items`,
      );
    }
  });

  await t.step("Total Function design performance verification", async () => {
    logger.info("\n=== Total Function Design Performance ===");

    // Test error handling performance
    const errorStartTime = performance.now();
    const invalidConfig = BreakdownConfig.create("invalid@profile");
    const errorEndTime = performance.now();

    assert(!invalidConfig.success);
    const errorHandlingTime = errorEndTime - errorStartTime;
    logger.info(`Error handling time: ${Math.round(errorHandlingTime * 100) / 100}ms`);

    // Verify error handling is fast
    assert(
      errorHandlingTime < 10,
      `Error handling should be fast (<10ms), got ${errorHandlingTime}ms`,
    );

    // Test Result type chaining performance
    const chainStartTime = performance.now();
    const testConfigPath = join(baseDir, "config_small.json");

    // Create temp setup for chain test
    const tempDir = await Deno.makeTempDir();
    const configDir = join(tempDir, ".agent", "climpt", "config");
    await Deno.mkdir(configDir, RECURSIVE_OPTIONS);
    const jsonContent = await Deno.readTextFile(testConfigPath);
    const jsonData = JSON.parse(jsonContent);
    const yamlContent = stringify(jsonData);
    await Deno.writeTextFile(join(configDir, "perf-chain-app.yml"), yamlContent);

    const chainResult = await (async () => {
      const createResult = BreakdownConfig.create("perf-chain", tempDir);
      if (!createResult.success) return createResult;

      const config = createResult.data;
      const loadResult = await config.loadConfigSafe();
      if (!loadResult.success) return loadResult;

      return config.getConfigSafe();
    })();

    const chainEndTime = performance.now();
    const chainTime = chainEndTime - chainStartTime;

    // Clean up
    await Deno.remove(tempDir, RECURSIVE_OPTIONS);

    assert(chainResult.success);
    logger.info(`Result chain time: ${Math.round(chainTime * 100) / 100}ms`);

    // Verify chaining doesn't add significant overhead
    assert(
      chainTime < 50,
      `Result chaining should have minimal overhead (<50ms), got ${chainTime}ms`,
    );
  });

  await t.step("Memory efficiency verification", async () => {
    logger.info("\n=== Memory Efficiency Test ===");

    // Test memory cleanup after multiple operations
    const initialMemory = Deno.memoryUsage().heapUsed;

    // Perform multiple config operations
    const testConfigPath = join(baseDir, "config_medium.json");

    for (let i = 0; i < 10; i++) {
      // deno-lint-ignore no-await-in-loop
      const tempDir = await Deno.makeTempDir();
      const configDir = join(tempDir, ".agent", "climpt", "config");
      // deno-lint-ignore no-await-in-loop
      await Deno.mkdir(configDir, RECURSIVE_OPTIONS);
      // deno-lint-ignore no-await-in-loop
      const jsonContent = await Deno.readTextFile(testConfigPath);
      const jsonData = JSON.parse(jsonContent);
      const yamlContent = stringify(jsonData);
      // deno-lint-ignore no-await-in-loop
      await Deno.writeTextFile(join(configDir, "app.yml"), yamlContent);

      const config = BreakdownConfig.create(`mem-test-${i}`, tempDir);
      if (config.success) {
        // deno-lint-ignore no-await-in-loop
        await config.data.loadConfigSafe();
        // deno-lint-ignore no-await-in-loop
        await config.data.getConfigSafe();
      }

      // deno-lint-ignore no-await-in-loop
      await Deno.remove(tempDir, RECURSIVE_OPTIONS);
    }

    // Force garbage collection if available
    const global = globalThis as { gc?: () => void };
    if (typeof global.gc === "function") {
      global.gc();
    }

    const finalMemory = Deno.memoryUsage().heapUsed;
    const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024;

    logger.info(`Memory growth after 10 operations: ${Math.round(memoryGrowth * 100) / 100}MB`);

    // Verify no significant memory leaks
    assert(
      memoryGrowth < 50,
      `Expected minimal memory growth (<50MB), got ${memoryGrowth}MB`,
    );
  });
});

logger.info("Performance E2E test implementation complete");
