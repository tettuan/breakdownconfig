# Multi-Environment Configuration Example

This example demonstrates how to use BreakdownConfig with different environment-specific configurations.

## Files Structure

```
examples/multi-environment/
├── production-app.yml    # Production environment settings
├── staging-app.yml       # Staging environment settings
├── development-app.yml   # Development environment settings
├── main.ts              # Example implementation
└── README.md           # This file
```

## Environment Configurations

### Production
- Logging: Error level only, file output
- Cache: Enabled with 1-hour TTL
- Database: Production server with 20 connections
- API: Strict rate limiting (1000 req/hr)

### Staging
- Logging: Warning level, console output
- Cache: Enabled with 30-minute TTL
- Database: Staging server with 10 connections
- API: Moderate rate limiting (500 req/hr)

### Development
- Logging: Debug level, console output
- Cache: Disabled for immediate changes
- Database: Local server with 5 connections
- API: Relaxed rate limiting (100 req/hr)

## Usage

```typescript
import { BreakdownConfig } from "../../src/breakdown_config.ts";

// Load production config
const prodConfig = new BreakdownConfig("production", ".");
await prodConfig.loadConfig();

// Load development config
const devConfig = new BreakdownConfig("development", ".");
await devConfig.loadConfig();
```

## Running the Example

```bash
deno run --allow-read examples/multi-environment/main.ts
```

This will demonstrate loading and comparing configurations across all three environments.