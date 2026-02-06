#!/bin/bash
# Fetch PR comment data given a GitHub URL
# Supports:
#   ...#discussion_r{id}       (review thread comment)
#   ...#pullrequestreview-{id} (pull request review)
#   ...#issuecomment-{id}      (issue/PR comment)

URL="$1"

if [ -z "$URL" ]; then
  echo '{"error": "No URL provided"}'
  exit 0
fi

# Extract owner/repo from URL
OWNER=$(echo "$URL" | sed -n 's|.*github\.com/\([^/]*\)/.*|\1|p')
REPO=$(echo "$URL" | sed -n 's|.*github\.com/[^/]*/\([^/]*\)/.*|\1|p')
PR_NUMBER=$(echo "$URL" | sed -n 's|.*/pull/\([0-9]*\).*|\1|p')

if [ -z "$OWNER" ] || [ -z "$REPO" ] || [ -z "$PR_NUMBER" ]; then
  echo '{"error": "Could not parse owner/repo/PR from URL"}'
  exit 0
fi

FRAGMENT=$(echo "$URL" | sed -n 's|.*#\(.*\)|\1|p')

if echo "$FRAGMENT" | grep -q '^discussion_r'; then
  COMMENT_ID=$(echo "$FRAGMENT" | sed 's/discussion_r//')
  gh api "repos/$OWNER/$REPO/pulls/comments/$COMMENT_ID" 2>/dev/null || echo "{\"error\": \"Failed to fetch discussion comment $COMMENT_ID\"}"

elif echo "$FRAGMENT" | grep -q '^pullrequestreview-'; then
  REVIEW_ID=$(echo "$FRAGMENT" | sed 's/pullrequestreview-//')
  echo '{"review":'
  gh api "repos/$OWNER/$REPO/pulls/$PR_NUMBER/reviews/$REVIEW_ID" 2>/dev/null || echo "{\"error\": \"Failed to fetch review $REVIEW_ID\"}"
  echo ', "comments":'
  gh api "repos/$OWNER/$REPO/pulls/$PR_NUMBER/reviews/$REVIEW_ID/comments" 2>/dev/null || echo "[]"
  echo '}'

elif echo "$FRAGMENT" | grep -q '^issuecomment-'; then
  COMMENT_ID=$(echo "$FRAGMENT" | sed 's/issuecomment-//')
  gh api "repos/$OWNER/$REPO/issues/comments/$COMMENT_ID" 2>/dev/null || echo "{\"error\": \"Failed to fetch issue comment $COMMENT_ID\"}"

else
  echo "{\"error\": \"Unrecognized URL fragment: $FRAGMENT\"}"
fi
