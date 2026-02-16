# Test Strategy

## Test Hierarchy Structure

Tests are defined in the following hierarchical layers and executed progressively:

### 0. Architecture Tests
- **Location**: Corresponding `*_test.ts` files in the same hierarchy as implementation
- **Purpose**: Validation of architecture-level design principles and constraints
- **Scope**: Module dependencies, layer separation, design pattern compliance

### 1. Structure Tests  
- **Location**: Corresponding `*_test.ts` files in the same hierarchy as implementation
- **Purpose**: Validation of data structure and interface consistency
- **Scope**: Type definitions, configuration schemas, API contracts

### 2. Units Tests
- **Location**: Corresponding `*_test.ts` files in the same hierarchy as implementation
- **Purpose**: Validation of individual function/method behavior
- **Scope**: Basic functionality, edge cases, error handling

### 3. Integrated Tests
- **Location**: Under `tests/3.integrated/` directory
- **Purpose**: Validation of coordination between multiple components
- **Scope**: Inter-module coupling, integrated configuration processing

### 4. E2E Tests
- **Location**: Under `tests/4.e2e/` directory  
- **Purpose**: Validation of overall behavior in end-user scenarios
- **Scope**: Actual use cases, complete workflows

## Test Execution Principles

- No dedicated working directory needed for tests
- Fixtures should use production-like configurations
  - No risk: This library alone cannot operate. It doesn't override application configurations
  - Production-focused: Since it handles critical configuration values, production behavior must be guaranteed
- Hierarchical test execution enables early problem detection and efficient debugging

## Log Output in Tests

- Test code uses BreakdownLogger to output debug information
- Test environment can output DEBUG level logs
- Log output during test setup and cleanup
- Error case tests also validate error messages

### BreakdownLogger Debugging

#### Basic Format
```typescript
import { BreakdownLogger } from "@tettuan/breakdownlogger";
const logger = new BreakdownLogger();

// Test phases: setup → execution → verification → cleanup
logger.debug("Test started", { testName, context });
logger.error("Test failed", { error, expectedValue, actualValue });
```

#### Debug Purpose Classification by KEY Setting
To clarify debugging purposes in log output, specify KEY in constructor:

```typescript
// Data flow tracking
const dataflowLogger = new BreakdownLogger("dataflow");
dataflowLogger.debug("Config loading started", { workingDir });
dataflowLogger.debug("Values transformed", { before, after });

// Security verification
const securityLogger = new BreakdownLogger("security");
securityLogger.debug("File permissions checked", { path, mode });
securityLogger.debug("Access validation", { user, resource });

// Step-by-step processing
const stepLogger = new BreakdownLogger("stepbystep");
stepLogger.debug("Phase 1 completed", { phase: "initialization" });
stepLogger.debug("Processing item", { index, total });

// Error details
const errorLogger = new BreakdownLogger("error");
errorLogger.error("Validation failed", { field, expected, actual });
```

#### Execution Control
```bash
# Basic: LOG_LEVEL={debug|info|warn|error}
LOG_LEVEL=debug deno test --allow-env --allow-write --allow-read

# Purpose-specific filter: LOG_KEY="purpose1,purpose2"
LOG_LEVEL=debug LOG_KEY="dataflow" deno test          # Data flow tracking
LOG_LEVEL=debug LOG_KEY="security" deno test          # Security verification
LOG_LEVEL=debug LOG_KEY="stepbystep" deno test        # Step tracking
LOG_LEVEL=debug LOG_KEY="dataflow,security" deno test # Multiple purposes

# Output length: LOG_LENGTH={S|L|W} (Short=160, Long=300, Whole=unlimited, default=80)
LOG_LEVEL=debug LOG_LENGTH=L deno test

# CI: DEBUG=true
DEBUG=true LOG_KEY="error" scripts/local_ci.sh
```

#### Troubleshooting Formula
```
1. scripts/local_ci.sh (overview)
2. DEBUG=true scripts/local_ci.sh (detailed check)  
3. LOG_LEVEL=debug deno test {file} (individual execution)
4. Identify problems from log output
```