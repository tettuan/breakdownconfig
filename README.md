# BreakdownConfig

A Deno library for managing application and user configurations. This library provides a simple way to load and merge configuration files from both application and user-specific locations.

## Features

- Load application configuration from a fixed location
- Load optional user configuration from a working directory
- Validate configuration structure
- Merge user settings with application defaults
- Type-safe configuration handling

## Installation

```typescript
import { BreakdownConfig } from "https://deno.land/x/breakdownconfig/mod.ts";
```

## Usage

```typescript
// Create a new configuration instance
const config = new BreakdownConfig();

// Load both application and user configurations
await config.loadConfig();

// Get the merged configuration
const settings = config.getConfig();
```

## Configuration Structure

### Application Configuration

The application configuration must be located at `/breakdown/config/app.json` and have the following structure:

```json
{
  "working_dir": "./.agent/breakdown",
  "app_prompt": {
    "base_dir": "./prompts"
  },
  "app_schema": {
    "base_dir": "./schemas"
  }
}
```

All fields in the application configuration are required.

### User Configuration

The user configuration is optional and should be located at `$working_dir/config/user.json`. It can override the following settings:

```json
{
  "app_prompt": {
    "base_dir": "./custom/prompts"
  },
  "app_schema": {
    "base_dir": "./custom/schemas"
  }
}
```

All fields in the user configuration are optional.

## Error Handling

The library throws errors in the following cases:

- Application configuration file is missing
- Application configuration is missing required fields
- Configuration files contain invalid JSON
- Configuration files have invalid structure

## Development

### Running Tests

```bash
deno test tests/
```

### Type Checking

```bash
deno check src/mod.ts
```

## License

MIT
