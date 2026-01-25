#!/bin/bash
# Clean up the stash file after unstashing

# Find the project's .claude directory by looking upward for .claude next to .git
find_project_claude_dir() {
    local dir="$PWD"
    while [[ "$dir" != "/" ]]; do
        if [[ -d "$dir/.git" && -d "$dir/.claude" ]]; then
            echo "$dir/.claude"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

# Find the project's .claude directory
claude_dir=$(find_project_claude_dir)
if [[ -z "$claude_dir" ]]; then
    echo "Error: Could not find a .claude directory next to a .git directory"
    exit 1
fi

stash_file="$claude_dir/state/context.md"

if [[ -f "$stash_file" ]]; then
    rm "$stash_file"
    echo "Stash file cleaned up."
else
    echo "No stash file found at $stash_file"
fi
