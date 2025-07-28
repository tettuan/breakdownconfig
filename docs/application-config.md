# Application Configuration File Overview

The application configuration file
`{base_directory}/.agent/clipmt/config/app.yml`
is loaded. Relative path from the project root (current directory at runtime).

# Configuration Items

Written in YAML format from root.

- working_dir: Base directory for user configuration files (required)
- app_prompt: Prompt file configuration (required)
  - base_dir: Storage directory for function-specific file groups
- app_schema: Schema file configuration (required)
  - base_dir: Storage directory for function-specific file groups

# Configuration Item Details

## working_dir Configuration

The configuration file contains `working_dir: "./.agent/clipmt"`.
Specifies a single base directory that serves as the starting point for user configuration files.

# Configuration Item Naming Rules

- Application configuration files cannot contain items other than those defined.
- Undefined items are ignored. (Even if set in YAML, items are removed when loaded)

# Configuration Loading Process Behavior

- When the application configuration file does not exist, an error message is output and the process terminates.
- When required configuration items are missing, an error message is output and the process terminates.

# Default Values

Default values are only returned when requested by the application side.
This library uses only configuration files directly.

- working_dir: "./.agent/clipmt"
- app_prompt:
  - base_dir: "./.agent/clipmt/prompts/app"
- app_schema:
  - base_dir: "./.agent/clipmt/schema/app"