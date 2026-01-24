#!/bin/bash
# Get all changes on the current branch compared to base branch (main/master)

# Get current branch name
current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [[ -z "$current_branch" ]]; then
    echo '{"error": "Not in a git repository"}'
    exit 1
fi

# Detect base branch (prefer main, fallback to master)
if git show-ref --verify --quiet refs/heads/main 2>/dev/null; then
    base_branch="main"
elif git show-ref --verify --quiet refs/heads/master 2>/dev/null; then
    base_branch="master"
else
    echo '{"error": "Could not find main or master branch"}'
    exit 1
fi

# Check if we're on the base branch
if [[ "$current_branch" == "$base_branch" ]]; then
    echo "## Branch Info"
    echo ""
    echo "Currently on **$base_branch** branch. No feature branch changes to show."
    echo ""

    # Still show uncommitted changes on base branch
    staged_changes=$(git diff --cached --stat)
    unstaged_changes=$(git diff --stat)

    if [[ -n "$staged_changes" || -n "$unstaged_changes" ]]; then
        echo "## Uncommitted Changes"
        echo ""

        if [[ -n "$staged_changes" ]]; then
            echo "### Staged (ready to commit)"
            echo ""
            echo '```'
            echo "$staged_changes"
            echo '```'
            echo ""
            echo '```diff'
            git diff --cached
            echo '```'
            echo ""
        fi

        if [[ -n "$unstaged_changes" ]]; then
            echo "### Unstaged (not yet staged)"
            echo ""
            echo '```'
            echo "$unstaged_changes"
            echo '```'
            echo ""
            echo '```diff'
            git diff
            echo '```'
        fi
    else
        echo "No uncommitted changes."
    fi
    exit 0
fi

# Find merge base (where current branch diverged from base)
merge_base=$(git merge-base "$base_branch" HEAD 2>/dev/null)
if [[ -z "$merge_base" ]]; then
    echo '{"error": "Could not find merge base between '"$current_branch"' and '"$base_branch"'"}'
    exit 1
fi

# Output branch info
echo "## Branch Info"
echo ""
echo "- **Current branch**: $current_branch"
echo "- **Base branch**: $base_branch"
echo "- **Merge base**: ${merge_base:0:8}"
echo ""

# Output commits since diverging
echo "## Commits"
echo ""
commit_count=$(git rev-list --count "$merge_base"..HEAD)
if [[ "$commit_count" -eq 0 ]]; then
    echo "No commits on this branch yet."
else
    echo "$commit_count commit(s) since diverging from $base_branch:"
    echo ""
    echo '```'
    git log --oneline "$merge_base"..HEAD
    echo '```'
fi
echo ""

# Output file changes summary (committed changes)
echo "## Files Changed (Committed)"
echo ""
echo '```'
git diff --stat "$merge_base"..HEAD
echo '```'
echo ""

# Output committed diff
echo "## Committed Diff"
echo ""
echo '```diff'
git diff "$merge_base"..HEAD
echo '```'
echo ""

# Check for uncommitted changes
staged_changes=$(git diff --cached --stat)
unstaged_changes=$(git diff --stat)

if [[ -n "$staged_changes" || -n "$unstaged_changes" ]]; then
    echo "## Uncommitted Changes"
    echo ""

    if [[ -n "$staged_changes" ]]; then
        echo "### Staged (ready to commit)"
        echo ""
        echo '```'
        echo "$staged_changes"
        echo '```'
        echo ""
        echo '```diff'
        git diff --cached
        echo '```'
        echo ""
    fi

    if [[ -n "$unstaged_changes" ]]; then
        echo "### Unstaged (not yet staged)"
        echo ""
        echo '```'
        echo "$unstaged_changes"
        echo '```'
        echo ""
        echo '```diff'
        git diff
        echo '```'
    fi
fi
