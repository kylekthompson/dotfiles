#!/bin/bash
# Fetch PR info for the current branch
gh pr view --json number,title,url,headRefName 2>/dev/null || echo '{"error": "No PR found for current branch"}'
