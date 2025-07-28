# User Configuration File Overview

The user configuration file is loaded from the fixed path `{working_dir}/.agent/clipmt/config/user.yml`.

Configuration file
`{working_dir}/.agent/clipmt/config/user.yml`
is loaded.

# Configuration Items

Written in YAML format from the root.
All items in the user configuration file are optional.

- app_prompt : Prompt file configuration
  - base_dir : Storage directory for feature-specific file groups
- app_schema : Schema file configuration
  - base_dir : Storage directory for feature-specific file groups

## Non-configurable Items

- working_dir: The configuration of the base directory for user configuration file placement can only be done in the application configuration file.

## Configuration Item Naming Rules

- User configuration file items have no rules.
- All items can be freely configured by the application using the library.
- This library focuses on loading configuration values without managing user configuration file items.
- All configurations loaded in YAML format can be handled.

# Configuration Loading Process Behavior

- When the user configuration file does not exist, it is treated as having no user configuration file.
  - Treated as normal processing without error
- Application configuration file item values are overridden by user configuration file items.
- User configuration file items that do not exist in the application configuration file are merged.

## Override Merge Rule Details

- Unit
  - For nested hierarchical configurations, override with the top-level key of keys that exist in the user configuration file.
    ex.
    ```user.yml
    - app_prompt:
      - base_dir: "user_dir/"
    ```
    In this case, `app_prompt` is overridden.