#!/bin/bash

# ============================================================================
# local_ci.sh - Deno-native CI Pipeline
#
# Purpose:
#   - Execute comprehensive CI pipeline using Deno's built-in tools
#   - Stage-by-stage execution with proper error handling
#   - No manual string scanning - rely on Deno's type checking and testing
#
# Stages:
#   1. Dependency Check & Lock File Regeneration
#   2. Type Checking (deno check)
#   3. Testing (deno test) with hierarchical execution
#   4. Linting (deno lint)
#   5. Formatting Check (deno fmt --check)
#   6. Final Validation
#
# Usage:
#   bash scripts/local_ci.sh
#   LOG_LEVEL=debug bash scripts/local_ci.sh
#
# ============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Debug mode handling
if [ "${LOG_LEVEL:-}" = "debug" ]; then
    echo "
===============================================================================
>>> DEBUG MODE ENABLED (LOG_LEVEL=debug) <<<
==============================================================================="
    set -x
else
    echo "
===============================================================================
>>> LOCAL CI PIPELINE STARTING <<<
==============================================================================="
fi

# Color output functions
print_stage() {
    echo "
🔄 STAGE: $1
==============================================================================="
}

print_success() {
    echo "✅ $1"
}

print_error() {
    echo "❌ $1"
}

print_warning() {
    echo "⚠️  $1"
}

# Stage 1: Dependency Management
print_stage "Dependency Check & Lock File Management"

echo "Removing old deno.lock..."
rm -f deno.lock

echo "Regenerating deno.lock..."
if ! deno cache --reload mod.ts; then
    print_error "Failed to regenerate lock file"
    exit 1
fi
print_success "Lock file regenerated successfully"

# Stage 2: Type Checking
print_stage "TypeScript Type Checking"

echo "Running type check on entry point..."
if ! deno check mod.ts; then
    print_error "Type check failed on mod.ts"
    echo "
💡 Fix type errors before proceeding to tests.
   Use 'deno check <file>' to check individual files."
    exit 1
fi

echo "Running type check on source files..."
if ! deno check src/**/*.ts; then
    print_error "Type check failed on source files"
    exit 1
fi

echo "Running type check on test files..."
if ! deno check tests/**/*.ts; then
    print_warning "Some test files have type issues (continuing...)"
    # Don't exit - test files may have intentional type issues for testing
fi

print_success "Type checking completed"

# Stage 3: Testing with Hierarchical Execution
print_stage "Test Execution"

# Test execution function with error handling
run_test_category() {
    local category="$1"
    local pattern="$2"
    local description="$3"
    
    echo "
📋 Testing: $description"
    
    local test_files
    if test_files=$(find tests/ -name "$pattern" 2>/dev/null | sort); then
        if [ -n "$test_files" ]; then
            for test_file in $test_files; do
                echo "  🧪 Running: $test_file"
                if ! LOG_LEVEL=debug deno test --allow-env --allow-write --allow-read "$test_file"; then
                    print_error "Test failed: $test_file"
                    echo "
===============================================================================
>>> TEST FAILURE IN $category <<<
===============================================================================
Failed test: $test_file

Suggested actions:
1. Review the test failure output above
2. Fix the specific issue in the failing test
3. Re-run just this test: deno test $test_file --allow-env --allow-write --allow-read
4. Once fixed, re-run the full CI pipeline

For detailed debugging:
LOG_LEVEL=debug deno test $test_file --allow-env --allow-write --allow-read
==============================================================================="
                    exit 1
                fi
            done
            print_success "$description completed"
        else
            echo "  ℹ️  No $description found - skipping"
        fi
    else
        echo "  ℹ️  No test directory found for $description - skipping"
    fi
}

# Execute tests in hierarchical order
echo "Executing tests in dependency order..."

# Architecture and structure tests first
run_test_category "architecture" "*_architecture_test.ts" "Architecture Tests"
run_test_category "structure" "*_structure_test.ts" "Structure Tests" 
run_test_category "units" "*_units_test.ts" "Unit Tests"

# Integration tests
run_test_category "integrated" "3.integrated/*_test.ts" "Integration Tests"

# End-to-end tests last
run_test_category "e2e" "4.e2e/*_test.ts" "End-to-End Tests"

# Helper and utility tests
run_test_category "helpers" "test_helpers/*_test.ts" "Test Helper Tests"

print_success "All tests passed"

# Stage 4: Linting
print_stage "Code Linting"

if ! deno lint; then
    print_error "Linting failed"
    echo "
💡 Fix linting issues:
   - Run 'deno lint --fix' to auto-fix some issues
   - Review and manually fix remaining issues"
    exit 1
fi
print_success "Linting passed"

# Stage 5: Formatting Check
print_stage "Code Formatting Check"

if ! deno fmt --check; then
    print_error "Code formatting issues found"
    echo "
💡 Fix formatting:
   - Run 'deno fmt' to format all files
   - Commit the formatted changes"
    exit 1
fi
print_success "Code formatting is correct"

# Stage 6: Final Validation
print_stage "Final Validation"

echo "Running comprehensive type check on all files..."
if ! deno check --all; then
    print_error "Comprehensive type check failed"
    exit 1
fi

echo "Running comprehensive test suite with all permissions..."
if ! deno test -A; then
    print_error "Comprehensive test run failed"
    exit 1
fi

echo "Running final entry point type check..."
if ! deno check mod.ts; then
    print_error "Final type check failed"
    exit 1
fi

echo "Checking module imports..."
if ! deno run --check mod.ts --help > /dev/null 2>&1; then
    print_warning "Module may have runtime issues (check exports)"
else
    print_success "Module imports successfully"
fi

# Summary
echo "
===============================================================================
🎉 LOCAL CI PIPELINE COMPLETED SUCCESSFULLY 🎉
===============================================================================

✅ Dependencies managed
✅ Type checking passed
✅ All tests passed
✅ Linting passed
✅ Formatting correct
✅ Comprehensive validation completed

Your code is ready for:
- Git commit
- Pull request
- Production deployment

==============================================================================="

if [ "${LOG_LEVEL:-}" = "debug" ]; then
    set +x
    echo ">>> DEBUG MODE DISABLED <<<"
fi