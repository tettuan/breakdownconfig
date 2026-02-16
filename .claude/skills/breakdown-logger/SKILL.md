---
name: breakdown-logger
description: Guide for using BreakdownLogger in test code. Use when writing tests, debugging test failures, or when user mentions 'logger', 'BreakdownLogger', 'LOG_LEVEL', 'LOG_KEY', 'LOG_LENGTH'.
---

# BreakdownLogger Usage Guide

Package: `@tettuan/breakdownlogger@^1.1.2` (JSR)

## Rules

- BreakdownLogger is for **test files only**. Never use in production/library code (`src/`).
- Production code is debugged through tests. If debugging production code is needed, add test code.

## API Reference

### Constructor

```typescript
import { BreakdownLogger } from "@tettuan/breakdownlogger";
const logger = new BreakdownLogger(key?: string);
```

- `key`: Optional identifier for filtering logs (e.g. `"dataflow"`, `"security"`)

### Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `debug()` | `message: string, data?: unknown` | Shown when `LOG_LEVEL=debug` |
| `info()` | `message: string, data?: unknown` | Shown by default (level >= INFO) |
| `warn()` | `message: string, data?: unknown` | Shown when `LOG_LEVEL=warn` or lower |
| `error()` | `message: string, data?: unknown` | Always shown, output to stderr |

### LogLevel Enum

| Level | Value | Description |
|-------|-------|-------------|
| DEBUG | 0 | Detailed debug information (lowest) |
| INFO | 1 | General informational (default) |
| WARN | 2 | Potentially harmful situations |
| ERROR | 3 | Error messages (highest, always shown) |

### LogEntry Interface

```typescript
interface LogEntry {
  message: string;    // Primary log text
  level: LogLevel;    // Severity indicator
  key: string;        // Logger identifier for filtering
  data?: unknown;     // Structured contextual data
  timestamp: Date;    // ISO 8601 formatted
}
```

## Environment Variables

| Variable | Values | Description |
|----------|--------|-------------|
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` | Severity threshold |
| `LOG_KEY` | Comma-separated keys | Filter by logger key (e.g. `dataflow,security`) |
| `LOG_LENGTH` | `S`, `L`, `W` | Output length: S=160, L=300, W=unlimited (default=80) |

## Usage Patterns

### Basic Test Logging

```typescript
import { BreakdownLogger } from "@tettuan/breakdownlogger";
const logger = new BreakdownLogger();

logger.debug("Test started", { testName, context });
logger.error("Test failed", { error, expectedValue, actualValue });
```

### Purpose-Classified Loggers

```typescript
const dataflowLogger = new BreakdownLogger("dataflow");
dataflowLogger.debug("Config loading started", { workingDir });

const securityLogger = new BreakdownLogger("security");
securityLogger.debug("File permissions checked", { path, mode });

const stepLogger = new BreakdownLogger("stepbystep");
stepLogger.debug("Phase 1 completed", { phase: "initialization" });

const errorLogger = new BreakdownLogger("error");
errorLogger.error("Validation failed", { field, expected, actual });
```

### Execution Commands

```bash
# Basic debug output
LOG_LEVEL=debug deno test --allow-env --allow-write --allow-read

# Filter by key
LOG_LEVEL=debug LOG_KEY="dataflow" deno test --allow-env --allow-write --allow-read

# Multiple keys
LOG_LEVEL=debug LOG_KEY="dataflow,security" deno test --allow-env --allow-write --allow-read

# Long output (300 chars)
LOG_LEVEL=debug LOG_LENGTH=L deno test --allow-env --allow-write --allow-read

# Whole output (unlimited)
LOG_LEVEL=debug LOG_LENGTH=W deno test --allow-env --allow-write --allow-read

# CI with error key
DEBUG=true LOG_KEY="error" scripts/local_ci.sh
```

### Troubleshooting Formula

1. `scripts/local_ci.sh` (overview)
2. `DEBUG=true scripts/local_ci.sh` (detailed check)
3. `LOG_LEVEL=debug deno test {file} --allow-env --allow-write --allow-read` (individual)
4. `LOG_LEVEL=debug LOG_KEY="{key}" deno test {file} --allow-env --allow-write --allow-read` (filtered)
5. `LOG_LEVEL=debug LOG_LENGTH=W deno test {file} --allow-env --allow-write --allow-read` (full output)
