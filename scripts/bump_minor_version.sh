#!/bin/bash

# Check if there are any uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "Error: You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

# Get the latest commit hash
latest_commit=$(git rev-parse HEAD)

# Check GitHub Actions status for all workflows
echo "Checking GitHub Actions status..."
for workflow in "test.yml" "version-check.yml"; do
    echo "Checking $workflow..."
    gh run list --workflow=$workflow --limit=1 --json status,conclusion,headSha | jq -e '.[0].status == "completed" and .[0].conclusion == "success" and .[0].headSha == "'$latest_commit'"' > /dev/null

    if [ $? -ne 0 ]; then
        echo "Error: Latest GitHub Actions workflow ($workflow) has not completed successfully."
        echo "Please ensure all tests pass before bumping version."
        exit 1
    fi
done

# Try to get latest version from JSR
echo "Checking latest version from JSR..."
latest_jsr_version=$(curl -s https://jsr.io/@tettuan/breakdownconfig/meta.json | jq -r '.latestVersion')

if [ -z "$latest_jsr_version" ] || [ "$latest_jsr_version" = "null" ]; then
    echo "Warning: Could not determine latest version from JSR, using local version"
    # Read current version from deno.json
    latest_jsr_version=$(deno eval "const config = JSON.parse(await Deno.readTextFile('deno.json')); console.log(config.version);")
fi

echo "Latest version: $latest_jsr_version"

# Get all GitHub tags
echo "Checking GitHub tags..."
git fetch --tags
all_tags=$(git tag -l "v*" | sort -V)

# Remove tags newer than latest version
for tag in $all_tags; do
    tag_version=${tag#v}
    if [ "$(printf '%s\n%s\n' "$tag_version" "$latest_jsr_version" | sort -V | tail -n 1)" = "$tag_version" ]; then
        echo "Removing tag $tag (newer than version $latest_jsr_version)"
        git tag -d "$tag"
        git push origin ":refs/tags/$tag"
    fi
done

# Split version into major.minor.patch
IFS='.' read -r major minor patch <<< "$latest_jsr_version"

# Increment minor version and reset patch to 0
new_minor=$((minor + 1))
new_version="$major.$new_minor.0"

echo "New version: $new_version"

# Update only the version in deno.json
deno eval "const config = JSON.parse(await Deno.readTextFile('deno.json')); config.version = '$new_version'; await Deno.writeTextFile('deno.json', JSON.stringify(config, null, 2).trimEnd() + '\n');"

# Commit the version change
git add deno.json
git commit -m "chore: bump version to $new_version"

# Create and push tag
git tag "v$new_version"
git push origin "v$new_version"

echo "Version bumped to $new_version and tag v$new_version created" 