#!/bin/bash
# Stash context - create directory, add metadata, and write content from argument

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

# Create state directory
mkdir -p "$claude_dir/state"

# Get current branch
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# Content is passed as base64-encoded first argument
content=$(echo "$1" | base64 -d)

# Write header with metadata, then content
{
    echo "# Stashed Context"
    echo ""
    echo "**Stashed**: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "**Branch**: $branch"
    echo ""
    echo "$content"
} > "$claude_dir/state/context.md"

echo "Context written to $claude_dir/state/context.md"
