#!/bin/bash
# Clean up the stash file after unstashing

if [[ -f .claude/state/context.md ]]; then
    rm .claude/state/context.md
    echo "Stash file cleaned up."
else
    echo "No stash file found."
fi
