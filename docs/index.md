# Overview

This application is a Deno library.
It is published to https://jsr.io/@tettuan/breakdownconfig.

## Purpose 1: Providing an Integrated Configuration File Management System

Provides an environment where third-party applications can easily integrate and use multiple configuration files (app configuration and user configuration).

### Purpose 2: Providing Two-Tier Configuration (Standard and User Settings)

Users can manage application default settings and per-user custom settings separately, and the system provides integrated configuration with user settings taking priority.

#### Purpose 3: Eliminating the Need for Configuration File Management Development

Users only need to prepare configuration files and use BreakdownConfig to safely retrieve configuration. There is no need to develop configuration file loading processes.

##### Purpose 4: Implementing Robust Error Handling and Validation

Makes configuration file management itself robust.
Clearly defines error types for each category, creating a state where users can understand errors.
User configuration files are not pre-defined and allow flexibility. Instead, validation functionality for configuration is provided to ensure robustness.

For users:
- [A] Applications that use BreakdownConfig
- [B] Actual users who use A

For A, we provide: A-a. Tolerance for flexible configuration, A-b. Validation functionality.
We receive type definitions from A and validate configuration.
B benefits from A-a by having easier configuration setup, and notices errors through A-b.

## Usage

When a third-party application imports breakdownconfig, it can perform configuration file loading processes.

### Usage for Application Users

- Default configuration uses app configuration
- When switching configuration per user, set up user configuration
- User configuration exists in the directory set by the `working_dir` item in app configuration

### Loading from Applications

```typescript
import { BreakdownConfig } from "@tettuan/breakdownconfig";
```

### Application Usage Examples

```typescript
// Using default profile
let config = new BreakdownConfig();

// Using named profile
let prodConfig = new BreakdownConfig("production");

// Specifying custom base directory
let customConfig = new BreakdownConfig(undefined, "/path/to/project");

// Combination of named profile + custom base directory
let envConfig = new BreakdownConfig("staging", "/path/to/project");
```

### Class Name

**BreakdownConfig**

## Configuration File Loading Flow

BreakdownConfig executes configuration file loading processes in the following order:

1. **Profile identification during initialization**: Determines configuration profile name (default or named) in constructor
2. **Base directory determination**: Identifies the base directory specified in the constructor's second argument, or the current working directory
3. **Application configuration file loading**: Loads `{baseDirectory}/.agent/climpt/config/app.yml` or `{baseDirectory}/.agent/climpt/config/{profilePrefix}-app.yml` as a required file
4. **working_dir identification**: Gets the `working_dir` value from the application configuration file to determine the reference path for user configuration files
5. **User configuration file loading**: Loads `{working_dir}/.agent/climpt/config/user.yml` or `{working_dir}/.agent/climpt/config/{profilePrefix}-user.yml` as an optional file
6. **Configuration value integration**: Based on the application configuration file, overwrites and integrates with values from the user configuration file for the same keys
7. **Providing integration results**: Returns the final configuration object to the application

## Types of Configuration Files

The types of configuration files are as follows:

### Default Profile

1. **Application configuration file (app.yml)**: Application's default configuration
2. **User configuration file (user.yml)**: User customization configuration

### Named Profile

1. **Application configuration file ({profilePrefix}-app.yml)**: Application configuration for named profile
2. **User configuration file ({profilePrefix}-user.yml)**: User configuration for named profile

BreakdownConfig loads and integrates the corresponding combination of application configuration file and user configuration file based on the specified configuration profile name.

### Named Profile Requirements and Specifications

#### Purpose

- Managing multiple configuration profiles within the same application
- Implementing environment-specific configuration (development, staging, production)
- Separate management of feature-specific configuration

#### How to Load Named Profiles

**Basic usage**:

```typescript
// Loading default profile (as before)
let config = new BreakdownConfig();
// → Loads {baseDirectory}/.agent/climpt/config/app.yml and {working_dir}/.agent/climpt/config/user.yml

// Loading named profile
let devConfig = new BreakdownConfig("development");
// → Loads {baseDirectory}/.agent/climpt/config/development-app.yml and {working_dir}/.agent/climpt/config/development-user.yml

let prodConfig = new BreakdownConfig("production");
// → Loads {baseDirectory}/.agent/climpt/config/production-app.yml and {working_dir}/.agent/climpt/config/production-user.yml
```

#### File Naming Rules

| Configuration Profile Name | Application Configuration File | User Configuration File |
| -------------------------- | ------------------------------ | ----------------------- |
| Unspecified (Default Profile) | `{baseDirectory}/.agent/climpt/config/app.yml` | `{working_dir}/.agent/climpt/config/user.yml` |
| "development" | `{baseDirectory}/.agent/climpt/config/development-app.yml` | `{working_dir}/.agent/climpt/config/development-user.yml` |
| "production" | `{baseDirectory}/.agent/climpt/config/production-app.yml` | `{working_dir}/.agent/climpt/config/production-user.yml` |
| "{arbitrary name}" | `{baseDirectory}/.agent/climpt/config/{arbitrary name}-app.yml` | `{working_dir}/.agent/climpt/config/{arbitrary name}-user.yml` |

#### Interpretation at Abstraction Level

**Configuration Profile Identifier Concept**:

- **When unspecified**: Treated as default profile (no profile prefix)
- **When specified**: Treated as named profile (specified string becomes profile prefix)
- **Profile prefix application rule**: Consistently applied to both files in the format `{profilePrefix}-{type}.yml`

This design allows unified management of configuration file naming and loading logic, making it easy to add new configuration profiles.

BreakdownConfig loads and integrates two types of configuration files.

For example:

```typescript
// For default profile
let config = new BreakdownConfig();
// → Loads {baseDirectory}/.agent/climpt/config/app.yml and {working_dir}/.agent/climpt/config/user.yml

// For named profile
let devConfig = new BreakdownConfig("development");
// → Loads {baseDirectory}/.agent/climpt/config/development-app.yml and {working_dir}/.agent/climpt/config/development-user.yml
```

The declared config loads the application configuration file for the specified configuration profile, then loads the corresponding user configuration file.
Configuration values prioritize user configuration file over application configuration file. (User configuration values overwrite application configuration values)

### Specification Details for Each Configuration

Described in the following files:

- `./app.md` : Describes application configuration files.
- `./user.md` : Describes user configuration files.

# Configuration File Loading

## Default Profile Loading

1. **Application configuration file (app.yml)**

- Loaded from path `{baseDirectory}/.agent/climpt/config/app.yml`
- Required. Cannot be omitted.
- If configuration file does not exist, terminates with error.
- The `working_dir` setting becomes the base directory for user configuration files.

2. **User configuration file (user.yml)**

- Loaded from path `{working_dir}/.agent/climpt/config/user.yml`
- Normal processing even if it doesn't exist. (Only outputs warning)
- Loads configuration values and overwrites application configuration values with the same keys.
  - User configuration files can describe only necessary settings. All items are optional.

## Named Profile Loading

1. **Application configuration file ({profilePrefix}-app.yml)**

- Loaded from path `{baseDirectory}/.agent/climpt/config/{profilePrefix}-app.yml`
- Required. Cannot be omitted.
- If configuration file does not exist, terminates with error.
- The `working_dir` setting becomes the base directory for user configuration files.
- Profile prefix uses the configuration profile name specified in the constructor.

2. **User configuration file ({profilePrefix}-user.yml)**

- Loaded from path `{working_dir}/.agent/climpt/config/{profilePrefix}-user.yml`
- Normal processing even if it doesn't exist. (Only outputs warning)
- Loads configuration values and overwrites application configuration values with the same keys.
  - User configuration files can describe only necessary settings. All items are optional.

## Configuration Profile Selection Rules

- **When unspecified**: Uses default profile ({baseDirectory}/.agent/climpt/config/app.yml, {working_dir}/.agent/climpt/config/user.yml)
- **When specified**: Uses named profile with specified profile prefix ({baseDirectory}/.agent/climpt/config/{profilePrefix}-app.yml, {working_dir}/.agent/climpt/config/{profilePrefix}-user.yml)
- **Profile prefix constraints**: Only alphanumeric characters and hyphens allowed (e.g., development, prod-v2)

## Configuration File Creation Responsibility

- Applications that use `new BreakdownConfig()` or `new BreakdownConfig("{profile name}")` are responsible for creating initial files.
  - To know the necessary configuration values, BreakdownConfig can return default values (does not create files).
  - For named profiles, the application side is also responsible for creating corresponding configuration files.

## Configuration Value Integration Responsibility

- This library handles it.
- Loads multiple configuration files in order and integrates values through overwriting.

# Testing

Refer to `./tests.md`.

# Error Handling

- Error messages are centralized for sharing between system and tests through unified error message management.

# Validation

Validates configuration files during loading.

- Directory existence verification
- Path format checking

After loading configuration files, validates configuration file values.
(Only for items whose configuration value types are known in advance.)

- Existence verification of configured directories
- Path format checking

## Providing Validation Interface to Application Side

- Directory (PATH) validation interface
  - Is the configuration value correct as a directory description?
- File existence validation interface
  - Does the file based on the configuration value exist?

# BreakdownLogger

- Debug only test code.
- Published library code is debugged through tests.
  - When debugging published code is necessary, add test code for necessary debugging.

## Log Output Specifications

- Log output is performed by Error Manager (ErrorManager)
- Log levels (higher value = higher severity):
  - DEBUG (0): Debug information (test environment only)
  - INFO (1): Normal information (default)
  - WARN (2): Warning information
  - ERROR (3): Error information (always shown, stderr)
- Log output is output as structured data (LogEntry with timestamp, key, level, message, data)
- Environment variable controls:
  - `LOG_LEVEL`: Severity threshold (`debug`, `info`, `warn`, `error`)
  - `LOG_KEY`: Filter by logger key (comma-separated, e.g. `dataflow,security`)
  - `LOG_LENGTH`: Output length (`S`=160, `L`=300, `W`=unlimited, default=80)