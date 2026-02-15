#!/bin/bash

# Bump version in deno.json.
# Usage:
#   scripts/bump_version.sh          # detect version from release/* branch name
#   scripts/bump_version.sh 1.3.0    # explicit version

set -euo pipefail

# Determine new version
if [ $# -ge 1 ]; then
  new_version="$1"
else
  branch=$(git branch --show-current)
  if [[ "$branch" =~ ^release/(.+)$ ]]; then
    new_version="${BASH_REMATCH[1]}"
  else
    echo "Error: Not on a release/* branch and no version argument provided."
    echo "Usage: scripts/bump_version.sh [version]"
    exit 1
  fi
fi

# Validate version format
if ! [[ "$new_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: Invalid version format '$new_version'. Expected x.y.z"
  exit 1
fi

current_version=$(deno eval "console.log(JSON.parse(Deno.readTextFileSync('deno.json')).version)")
echo "Current version: $current_version"
echo "New version:     $new_version"

if [ "$current_version" = "$new_version" ]; then
  echo "Version is already $new_version. Nothing to do."
  exit 0
fi

# Update deno.json
deno eval "
const config = JSON.parse(await Deno.readTextFile('deno.json'));
config.version = '$new_version';
await Deno.writeTextFile('deno.json', JSON.stringify(config, null, 2).trimEnd() + '\n');
"

echo "Updated deno.json to version $new_version"

# Commit the version change
git add deno.json
git commit -m "chore: bump version to $new_version"

echo "Version bumped to $new_version (committed, no tag created)"
echo "Use scripts/create_release_tag.sh to create a tag on main after merging."
