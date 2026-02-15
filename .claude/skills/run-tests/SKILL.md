---
name: run-tests
description: Run a specific test file with debug logging
disable-model-invocation: true
argument-hint: "[test-file-path]"
---

Run the specified test file with debug output.

```bash
LOG_LEVEL=debug deno test $ARGUMENTS --allow-env --allow-write --allow-read
```

If no argument is provided, run all tests:

```bash
LOG_LEVEL=debug deno test --allow-env --allow-write --allow-read
```

Tests and fixtures must be in `tests/`.
