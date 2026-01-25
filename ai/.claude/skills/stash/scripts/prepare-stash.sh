#!/bin/bash
# Stash context - create directory, add metadata, and write content from argument

# Create state directory
mkdir -p .claude/state

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
} > .claude/state/context.md

echo "Context written to .claude/state/context.md"
