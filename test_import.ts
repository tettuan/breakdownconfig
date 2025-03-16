import { BreakdownConfig } from "./src/mod.ts";

// Create test configuration directory and files
const testDir = "test_config";
await Deno.mkdir(testDir + "/breakdown/config", { recursive: true });

const appConfig = {
  working_dir: "workspace",
  app_prompt: {
    base_dir: "prompts"
  },
  app_schema: {
    base_dir: "schemas"
  }
};

await Deno.writeTextFile(
  testDir + "/breakdown/config/app.json",
  JSON.stringify(appConfig, null, 2)
);

// Create and test the configuration
const config = new BreakdownConfig(testDir);
await config.loadConfig();
console.log("Configuration:", config.getConfig()); 