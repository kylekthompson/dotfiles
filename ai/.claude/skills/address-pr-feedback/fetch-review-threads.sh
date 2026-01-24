#!/bin/bash
# Fetch unresolved PR review threads via GitHub GraphQL API

OWNER=$(gh repo view --json owner -q .owner.login 2>/dev/null)
REPO=$(gh repo view --json name -q .name 2>/dev/null)
PR_NUMBER=$(gh pr view --json number -q .number 2>/dev/null)

if [ -z "$OWNER" ] || [ -z "$REPO" ] || [ -z "$PR_NUMBER" ]; then
  echo '{"error": "Could not determine owner/repo/PR number"}'
  exit 0
fi

gh api graphql -f query="
  query {
    repository(owner: \"$OWNER\", name: \"$REPO\") {
      pullRequest(number: $PR_NUMBER) {
        reviewThreads(first: 100) {
          nodes {
            isResolved
            isOutdated
            path
            line
            startLine
            diffSide
            comments(first: 50) {
              nodes {
                author { login }
                body
                createdAt
                url
              }
            }
          }
        }
      }
    }
  }
" 2>/dev/null || echo '{"error": "Failed to fetch review threads"}'
