---
name: bump-version
description: Bump the project version for release
---

Run the version bump script:

```bash
scripts/bump_version.sh
```

- Detects version from `release/*` branch name, or accepts an explicit argument: `scripts/bump_version.sh 1.3.0`
- Updates `deno.json` only and commits the change
- Does NOT create a git tag (use `scripts/create_release_tag.sh` on main for that)

Only run when explicitly ordered. Do not speculate about releases.
