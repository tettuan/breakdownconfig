---
name: local-ci
description: Run local CI checks before merge or push
disable-model-invocation: true
---

Run the local CI script to validate the project.

1. Run `scripts/local_ci.sh`
2. If errors occur, re-run with debug logging: `LOG_LEVEL=debug scripts/local_ci.sh`
3. Report results

DO NOT push until all checks pass.
