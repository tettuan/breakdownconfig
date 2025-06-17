# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **BREAKING CHANGE**: Reordered BreakdownConfig constructor arguments
  - Constructor signature changed from `(baseDir?: string, configSetName?: string)` to `(configSetName?: string, baseDir?: string)`
  - `configSetName` is now the first parameter to emphasize environment-specific configurations
  - `baseDir` is now optional with default empty string
  - Updated all tests, examples, and documentation to reflect the new parameter order
  - Common usage patterns remain unchanged: `new BreakdownConfig()` and `new BreakdownConfig("production")` still work

### Added
- Enhanced documentation with detailed constructor options and usage examples
- Comprehensive JSDoc examples showing all constructor parameter combinations
- Updated Japanese documentation (README.ja.md) with new constructor usage patterns

### Fixed
- UserConfigLoader path consistency using DefaultPaths.WORKING_DIR constant

## [1.1.0] - 2025-06-17

### Added
- Custom configuration support with enhanced examples
- Comprehensive Japanese documentation and glossary
- Multi-environment configuration examples
- Enhanced JSDoc documentation for better type and module documentation
- Japanese documentation files (docs/*.ja.md)

### Fixed
- Enhanced custom config support with improved error handling
- Updated import paths in test files after reorganization
- GitHub Actions workflow alignment with local CI behavior
- Path validation and test improvements with better logging
- JSR import paths and removed unused imports
- Version alignment between deno.json and git tags

### Changed
- Improved deno.json format rules and formatting
- Enhanced version bump script with JSR meta.json API integration
- Unified YAML extension to .yml with proper YAML notation capitalization
- Refactored YAMLParser to YamlParser following camelCase convention
- Simplified exports to only expose BreakdownConfig class
- Enhanced test coverage and organization structure

## [1.0.10] - 2025-04-13

### Fixed
- Path validation and test improvements
- Updated default paths configuration
- Enhanced logging in validation tests

## [1.0.9] - 2025-04-13

### Changed
- YAML extension unified to .yml
- YAML notation capitalization improvements
- YAMLParser renamed to YamlParser for camelCase consistency

## [1.0.8] - 2025-04-13

### Fixed
- JSR import paths optimization
- Removed unused imports

## [1.0.7] - 2025-04-13

### Fixed
- JSR_TOKEN removal and publish command updates
- Version alignment with git tags
- Bump script improvements for JSR URL handling

## [1.0.6] - 2025-03-22

### Added
- JSDoc comments to all exported symbols for improved JSR score

### Changed
- Simplified exports structure

## [1.0.5] - 2025-03-22

### Added
- Version check workflow with Deno v2.1.9
- Comprehensive CI workflow improvements

### Fixed
- Workflow check in bump_version.sh
- GitHub Actions workflow with proper environment flags

## [1.0.4] - 2025-03-16

### Added
- JSR publication preparation
- Comprehensive test suite for BreakdownConfig
- Scripts directory with utility scripts

### Changed
- Module structure reorganization with separated type definitions
- Example structure improvements with better path handling
- Test structure reorganization into category-based files

### Fixed
- Linting errors resolution
- Test failures and error handling improvements
- Import paths for JSR compatibility

## [1.0.3] - 2025-03-16

### Added
- BreakdownLogger integration for test logging
- Development design documents
- Configuration format documentation (JSON to YAML migration)

### Changed
- Module structure with mod.ts moved to root
- Test organization with separate files by category
- Improved path handling with Deno standard library

### Fixed
- Code formatting and exports field in deno.json
- File existence verification in tests
- Configuration validation test cases

## [1.0.2] - 2024-04-27

### Fixed
- Fixed path validation to reject absolute paths in configuration
- Updated default paths to use relative paths instead of absolute paths
- Fixed test expectations to match default configuration values
- Enhanced logging in validation tests for better debugging
- Fixed code formatting across the project
- Fixed linting issues with unused variables

## [1.0.1] - 2024-04-13

### Fixed
- Improved error handling with specific error codes
- Fixed error message consistency across the codebase
- Updated error messages to match test expectations
- Fixed unused variable warnings in TypeScript code
- Enhanced code style and formatting

## [1.0.0] - 2024-03-16

### Added
- Initial release
- Basic configuration loading functionality
- Support for application and user configuration files
- Type-safe configuration handling
- Comprehensive test suite
- Documentation and examples 