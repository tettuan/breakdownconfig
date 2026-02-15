#!/bin/bash

# Create a version tag on the main branch and push it.
# The tag push triggers publish.yml for JSR publish.
#
# Usage:
#   scripts/create_release_tag.sh          # read version from deno.json
#   scripts/create_release_tag.sh 1.3.0    # explicit version

set -euo pipefail

# Ensure we are on main
branch=$(git branch --show-current)
if [ "$branch" != "main" ]; then
  echo "Error: Must be on 'main' branch to create a release tag."
  echo "Current branch: $branch"
  exit 1
fi

# Ensure working tree is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working tree is not clean. Commit or stash changes first."
  exit 1
fi

# Determine version
if [ $# -ge 1 ]; then
  version="$1"
else
  version=$(deno eval "console.log(JSON.parse(Deno.readTextFileSync('deno.json')).version)")
fi

if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: Invalid version format '$version'. Expected x.y.z"
  exit 1
fi

tag="v$version"

# Check if tag already exists
if git rev-parse "$tag" >/dev/null 2>&1; then
  echo "Error: Tag '$tag' already exists."
  exit 1
fi

echo "Creating tag: $tag"
git tag "$tag"
git push origin "$tag"

echo "Tag $tag created and pushed."
echo "This will trigger JSR publish via publish.yml."
