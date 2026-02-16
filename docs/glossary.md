# Glossary

## Configuration Files

### Application Configuration File

- **Definition**: File that defines the default configuration of the application
- **Location**: `{baseDirectory}/.agent/climpt/config/app.yml` or `{baseDirectory}/.agent/climpt/config/{profilePrefix}-app.yml`
- **Characteristics**: Required file. Cannot be omitted. Items not defined are ignored
- **Purpose**: Define basic application behavior configuration, working_dir settings

### User Configuration File

- **Definition**: File that defines user-specific custom configuration
- **Location**: `{working_dir}/.agent/climpt/config/user.yml` or `{working_dir}/.agent/climpt/config/{profilePrefix}-user.yml`
- **Characteristics**: Optional. Normal processing even if it doesn't exist
- **Constraint**: working_dir cannot be configured (can only be set in application configuration file)

### YAML Format

- **Definition**: Format for describing configuration files
- **Constraint**: Only supports simple single documents
- **Characteristics**: Human-readable structured data format
- **Purpose**: Used for both application configuration files and user configuration files

## Configuration Profiles

### Configuration Profile

- **Definition**: Concept representing the combination of application configuration file and user configuration file
- **Types**: Default profile (no prefix) and named profile (with prefix)
- **Management Target**: Managing multiple configuration sets within the same application
- **Selection Method**: Specified as the first argument of the constructor

### Default Profile

- **Definition**: Basic configuration profile without profile prefix
- **Files**: Combination of `app.yml` and `user.yml`
- **Usage Example**: `new BreakdownConfig()`

### Named Profile

- **Definition**: Configuration profile with a specific name (profile prefix)
- **Purpose**: Implementing environment-specific configurations (development, staging, production) or feature-specific configurations
- **File Naming**: `{profilePrefix}-app.yml`, `{profilePrefix}-user.yml`
- **Usage Example**: `new BreakdownConfig("production")`

### Configuration Profile Name

- **Definition**: Name that identifies the configuration profile
- **When Unspecified**: Treated as default profile
- **When Specified**: Used as profile prefix for named profile
- **Examples**: "development", "production", "staging"

### Profile Prefix

- **Definition**: String used to identify named profiles
- **Constraint**: Only alphanumeric characters and hyphens allowed (e.g., development, prod-v2)
- **Application Rule**: Consistently applied to both files in the format `{profilePrefix}-{type}.yml`
- **Purpose**: Unified management of configuration file naming and loading logic

## Directories and Paths

### Base Directory

- **Definition**: Specified as the second argument of the constructor, or the current working directory
- **Purpose**: Directory that serves as the placement standard for application configuration files
- **Characteristics**: Independent from the placement standard for user configuration files (working_dir)
- **Usage Example**: `new BreakdownConfig(undefined, "/path/to/project")`

### working_dir

- **Definition**: Single reference directory that serves as the starting point for user configuration files (unique system-wide)
- **Scope**: System-wide reference point (all user configuration files are placed under this)
- **Relative Base**: Relative path from project root (current directory at execution time)
- **Configuration Location**: Can only be set in application configuration file (cannot be changed in user configuration file)
- **Purpose**: Determine the placement location of user configuration files (`{working_dir}/.agent/climpt/config/user.yml` etc.)
- **Default Value**: "./.agent/climpt"
- **Reference**: Used as `$working_dir` in other configurations and system internals

### base_dir

- **Definition**: Parameter that specifies the directory storing file groups for each function (prompt, schema)
- **Scope**: Individual directories by function (app_prompt.base_dir, app_schema.base_dir, etc.)
- **Relative Base**: Relative path from project root (current directory at execution time)
- **Configuration Location**: Individual configuration under app_prompt, app_schema sub-items
- **Example**: `app_prompt.base_dir: "./.agent/climpt/prompts/app"`

## Main Class and Components

### BreakdownConfig

- **Definition**: Main class that performs integrated management of configuration files
- **Function**: Load and integrate application configuration files and user configuration files
- **Usage Example**: `let config = new BreakdownConfig();`
- **Responsibility**: Order management of multiple configuration files and value override integration

### BreakdownLogger

- **Definition**: Library-specific log output system (`@tettuan/breakdownlogger@^1.1.2`)
- **Purpose**: Debug test code, output structured logs
- **Log Levels**: DEBUG (0), INFO (1), WARN (2), ERROR (3)
- **Environment Variables**:
  - `LOG_LEVEL`: Severity threshold (`debug`, `info`, `warn`, `error`)
  - `LOG_KEY`: Filter by logger key (comma-separated, e.g. `dataflow,security`)
  - `LOG_LENGTH`: Output length (`S`=160, `L`=300, `W`=unlimited, default=80)

### ErrorManager

- **Definition**: Component responsible for error management
- **Function**: Centralized error message management, log output execution
- **Purpose**: Error message management shareable between system and tests

## Configuration Items

### app_prompt

- **Definition**: Configuration item for prompt files
- **Configuration Items**: `base_dir` (Base folder specification)
- **Default Value**: "./.agent/climpt/prompts/app"
- **Purpose**: Specify the location of prompt files

### app_schema

- **Definition**: Configuration item for Schema files
- **Configuration Items**: `base_dir` (Base folder specification)
- **Default Value**: "./.agent/climpt/schema/app"
- **Purpose**: Specify the location of Schema files

## Processing and Operations

### Configuration Integration

- **Definition**: Process of loading and integrating multiple configuration files in order
- **Responsibility**: Handled by the breakdownconfig library
- **Procedure**: Load application configuration file → Load user configuration file → Value override integration

### Override Integration

- **Definition**: Process of replacing application configuration file values with user configuration file values
- **Rule**: Override with top-level keys that exist in user configuration file
- **Priority**: User configuration file > Application configuration file
- **Unit**: Top-level keys of nested hierarchies are the override unit

### Validation

- **Definition**: Process of verifying the validity of configuration files and configuration values
- **Targets**:
  - Directory existence verification
  - Path format checking
  - Configuration file syntax verification
- **Provided Functions**: Directory validation, file existence validation interfaces

### Type Safety Check

- **Definition**: Process of verifying type consistency at compile time
- **Targets**: Type checking of Discriminated Union, Result type, Smart Constructor
- **Benefits**: Detect invalid states before execution
- **Tools**: Static analysis by TypeScript compiler

### Exhaustiveness Check

- **Definition**: Verification that all cases are handled in switch statements or pattern matching
- **Implementation**: Uses TypeScript's strict type checking functionality
- **Goal**: Complete case branching that doesn't require a default clause
- **Benefits**: Prevent handling omissions when adding types in the future

## Development and Testing

### Default Values

- **Definition**: Initial values for items where configuration files don't exist
- **Provision Method**: Returned only when requested by the application side
- **Characteristics**: Not used directly within the library, prioritize configuration files

### fixture

- **Definition**: Configuration file samples for testing
- **Policy**: Use the same configuration as production
- **Reason**: Emphasize guaranteeing operation in production environment due to the importance of configuration values

### Test Hierarchy

- **Definition**: Structure that categorizes test cases in stages
- **Hierarchy**:
  1. **Basic Function Tests**: Basic operation verification
  2. **Main Function Tests**: Operation verification in real environment
  3. **Edge Case Tests**: Special case verification
  4. **Error Case Tests**: Error handling verification

### Quality Indicators

- **Definition**: Standards for measuring code quality
- **Totality Principle Indicators**:
  - Business rules are reflected in type definitions
  - Detect invalid states at compile time
  - No default required in switch statements
  - Minimize type assertion usage
  - Function return values are predictable

### Prohibited Patterns

- **Definition**: Coding patterns that violate the totality principle
- **Targets**:
  - Forced type conversion with `as Type`
  - State representation with optional properties `{ a?: X; b?: Y }`
  - Easy use of `any`/`unknown`
  - Control flow by exceptions

### Recommended Patterns

- **Definition**: Recommended coding patterns that follow the totality principle
- **Targets**:
  - Tagged Union: `{ kind: string; ... }`
  - Result type: `{ ok: boolean; ... }`
  - Smart Constructor: `private constructor + static create`
  - Exhaustive branching with switch statements

## Logs and Errors

### Log Level

- **Definition**: Classification indicating the importance of log output
- **Types**:
  - **DEBUG**: Debug information (test environment only)
  - **INFO**: Normal information
  - **WARN**: Warning information
  - **ERROR**: Error information

## Design Principles

### Separation of Responsibilities

- **Definition**: Design technique that clearly separates the roles of each component
- **Purpose**: Improve testability, ease of handling, achieve loose coupling
- **Effect**: Distributed implementation of error handling and validation

### Loose Coupling

- **Definition**: Design principle that minimizes dependencies between components
- **Benefits**: Improved testability, maintainability, and extensibility
- **Implementation**: Distributed design through separation of responsibilities

### Totality Principle

- **Definition**: Design principle that converts partial functions to total functions and eliminates "impossible states" with the type system
- **Purpose**: Detect invalid states at compile time and prevent runtime errors
- **Core Philosophy**: Reflect business rules in type definitions and ensure type safety
- **Application Scope**: Type-safe code design in TypeScript/JavaScript

## Type-Safe Design Patterns

### Discriminated Union

- **Definition**: State representation pattern using tagged unions
- **Format**: Objects with tags in the format `{ kind: string; ... }`
- **Purpose**: Explicit state management as an alternative to optional properties
- **Benefits**: Compile-time exhaustiveness checking, branching processing with switch statements

### Smart Constructor

- **Definition**: Pattern for creating constrained value types
- **Structure**: Private constructor + static factory method
- **Purpose**: Constraint checking of values based on business rules
- **Example**: `private constructor + static create`

### Result Type

- **Definition**: Pattern that treats errors as values
- **Format**: `{ ok: true; data: T } | { ok: false; error: E }`
- **Purpose**: Alternative to control flow by exceptions
- **Benefits**: Explicit error handling, improved type safety

### Partial Function

- **Definition**: Function defined only for part of the input
- **Problem**: Functions that may return `undefined` or `null`
- **Examples**: Array element retrieval, dictionary value retrieval
- **Solution**: Conversion to total function

### Total Function

- **Definition**: Function defined for all inputs
- **Characteristics**: Predictable return values and type safety
- **Implementation Method**: Use of Result type, Option type
- **Benefits**: Prevention of runtime errors

## Business Rule Design

### Business Rule Analysis

- **Definition**: Process of clarifying domain knowledge before applying totality
- **Perspectives**: State enumeration, transition definition, constraint clarification, exception case identification
- **Importance**: Understanding requirement specifications that form the foundation of type design
- **Deliverables**: Domain rule definition document

### State Transition Rules

- **Definition**: Valid change patterns between states that entities have
- **Purpose**: Design guidelines for Discriminated Union
- **Description Method**: Format of State A → State B
- **Constraints**: Explicit prohibited transitions

### Value Constraints

- **Definition**: Restrictions on the range or format of values that properties should have
- **Examples**: Discount rate (0 or more, 1 or less), inventory count (0 or more integer)
- **Implementation**: Constraint checking with Smart Constructor
- **Purpose**: Guarantee value validity based on business rules

---

## Important Concept Organization

### Difference between Base Directory and working_dir

| Aspect | Base Directory | working_dir |
| -------------- | ------------------------------ | -------------------------------- |
| **Purpose** | Placement standard for application configuration files | Setting reference point for user configuration files |
| **Quantity** | One in the entire system | Only one system-wide |
| **Setter** | Determined by constructor or execution environment | Set in application configuration file |
| **Changeability** | Can be specified by constructor at runtime | Cannot be changed in user configuration file |
| **Usage Scene** | Standard when loading application configuration files | Standard for user configuration file placement |
| **Hierarchical Relationship** | Independent from working_dir | Top level of all user configuration files |

### Path Resolution Differences

- **Application Configuration File**: `baseDirectory + /.agent/climpt/config/ + [profilePrefix-]app.yml`
- **User Configuration File**: `working_dir + /.agent/climpt/config/ + [profilePrefix-]user.yml`

### Comparison in Configuration Examples

```yaml
# Application configuration file (app.yml)
working_dir: "./.agent/climpt" # System-wide standard
app_prompt:
  base_dir: "./.agent/climpt/prompts/app" # Prompt function standard
app_schema:
  base_dir: "./.agent/climpt/schema/app" # Schema function standard
```

### Understanding with Actual File Placement

```
baseDirectory/                     ← Specified by constructor or current directory
├── .agent/climpt/config/
│   ├── app.yml                      ← Application configuration file (default profile)
│   └── production-app.yml           ← Application configuration file (named profile)

working_dir/                         ← Location specified in application configuration file
├── .agent/climpt/config/
│   ├── user.yml                     ← User configuration file (default profile)
│   └── production-user.yml          ← User configuration file (named profile)
├── prompts/app/                     ← Location pointed to by app_prompt.base_dir
│   └── default.txt
└── schema/app/                      ← Location pointed to by app_schema.base_dir
    └── default.json
```

### Role Division of Configuration Files

- **Application Configuration File**: Definition of system structure (working_dir, each base_dir)
- **User Configuration File**: Customization of individual functions (overriding base_dir, etc.)

### Path Resolution Principles

1. All paths are relative paths from project root
2. Application configuration files are loaded from `{baseDirectory}/.agent/climpt/config/`
3. User configuration files are loaded from `{working_dir}/.agent/climpt/config/`
4. base_dir is the reference directory for actual file operations
5. base_dir can be overridden in user configuration files (working_dir cannot)

---

## Ubiquitous Language

Ubiquitous language definition for domain-driven design in the BreakdownConfig library. Specialized terminology collection for forming common understanding among developers, designers, and users.

### Domain-Specific Term List

| Term | English Name | Implementation Name | Category | English Expression | Role/Responsibility |
|------|--------|--------|------|----------|-----------|
| **Application Configuration File** | application config file | `appConfig` | Configuration File | Application Config File | Define system default configuration |
| **User Configuration File** | user config file | `userConfig` | Configuration File | User Config File | Define user-specific custom configuration |
| **Configuration Profile** | configuration profile | `configProfile` | Profile | Configuration Profile | Manage configuration file combinations |
| **Default Profile** | default profile | `defaultProfile` | Profile | Default Profile | Basic configuration without prefix |
| **Named Profile** | named profile | `namedProfile` | Profile | Named Profile | Dedicated configuration by environment/purpose |
| **Profile Prefix** | profile prefix | `profilePrefix` | Profile | Profile Prefix | Identifier for named profiles |
| **Base Directory** | base directory | `baseDirectory` | Directory | Base Directory | Placement standard for application configuration |
| **working_dir** | working directory | `workingDir` | Directory | Working Directory | Placement standard for user configuration |
| **base_dir** | base directory | `baseDir` | Directory | Base Directory | Storage location for function-specific file groups |
| **Configuration Integration** | configuration merging | `mergeConfig` | Processing | Configuration Merging | Integration processing of multiple configuration files |
| **Override Integration** | override merging | `overrideConfig` | Processing | Override Merging | Value replacement by user configuration |
| **Profile Selection** | profile selection | `selectProfile` | Processing | Profile Selection | Determination of configuration profile to use |
| **Path Resolution** | path resolution | `resolvePath` | Processing | Path Resolution | Location identification of configuration files |
| **Configuration Profile Name** | configuration profile name | `profileName` | Identifier | Configuration Profile Name | Name that identifies the profile |
| **app_prompt** | app_prompt | `appPrompt` | Configuration Item | Application Prompt | Configuration for prompt files |
| **app_schema** | app_schema | `appSchema` | Configuration Item | Application Schema | Configuration for schema files |

### Domain Rule Expression

| Domain Rule | Expression |
|---------------|------|
| **Necessity** | Application configuration file is required, user configuration file is optional |
| **Uniqueness** | working_dir is unique system-wide, base directory is determined at runtime |
| **Hierarchy** | Priority of User configuration file > Application configuration file |
| **Constraints** | working_dir can only be set in application configuration |
| **Naming Convention** | Unified format of `{profilePrefix}-{type}.yml` |
| **Placement Rule** | Unified placement under `.agent/climpt/config/` |

### Conceptual Model Relationships

```
BreakdownConfig
├── Configuration Profile
│   ├── Application Configuration File (required)
│   └── User Configuration File (optional)
├── Directory Structure
│   ├── Base Directory → Application Configuration
│   └── working_dir → User Configuration
└── Processing Flow
    ├── Path Resolution
    ├── Configuration Integration
    └── Override Integration
```

### Term Usage Guidelines

1. **Consistency**: Use the same terminology in documentation, code, and discussions
2. **Clarity**: Avoid ambiguous expressions, prioritize defined terms
3. **Hierarchy**: Maintain logical structure from higher to lower concepts
4. **Implementation Neutrality**: Expression at conceptual level independent of technical implementation