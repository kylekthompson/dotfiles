---
name: address-pr-feedback
description: Fetch unresolved PR review comments and address selected feedback by making code changes.
argument-hint: "[all | GitHub comment URL(s)]"
disable-model-invocation: true
allowed-tools:
  - "Bash(~/.claude/skills/address-pr-feedback/*)"
---

# Address PR Feedback

## Context

**PR Info:**

!`~/.claude/skills/address-pr-feedback/fetch-pr-info.sh`

**Unresolved Review Threads:**

!`~/.claude/skills/address-pr-feedback/fetch-review-threads.sh`

## Instructions

You are addressing PR review feedback. Follow these steps:

### 1. PR Detection

Parse the PR Info above. If it contains an error or no PR was found, inform the user that no PR is associated with the current branch and stop.

### 2. Display Unresolved Comments

Parse the GraphQL response above. Filter to only threads where `isResolved` is `false`. For each unresolved thread, display a numbered list with:

- **Number** (sequential, starting at 1)
- **File**: the `path` field
- **Line**: the `line` (or `startLine..line` if `startLine` differs)
- **Author**: the first comment's `author.login`
- **Comment**: the first comment's `body` (this is the review comment; subsequent comments are discussion)
- **Outdated**: mark if `isOutdated` is true

If there are no unresolved threads, inform the user and stop.

### 3. User Selection

Check `$ARGUMENTS`:
- If one or more **GitHub URLs** (containing `#discussion_r`, `#pullrequestreview-`, or `#issuecomment-`) — fetch each comment using `~/.claude/skills/address-pr-feedback/fetch-comment-by-url.sh <url>` and use those as the selected comments. Skip the numbered list display above — go straight to analysis.
- If `all` — select all unresolved comments from the list above
- If empty or not provided — use the AskUserQuestion tool to ask which comments to address (show the comment body and author)

**URL formats supported:**
- `https://github.com/{owner}/{repo}/pull/{number}#discussion_r{id}` — a review thread comment
- `https://github.com/{owner}/{repo}/pull/{number}#pullrequestreview-{id}` — a full review (fetches the review and all its comments)
- `https://github.com/{owner}/{repo}/pull/{number}#issuecomment-{id}` — a PR issue comment

### 4. Analyze Selected Comments

For each selected comment, launch an **Explore sub-agent** (via the Task tool with `subagent_type: "Explore"`) to:

- Read the relevant file and surrounding context around the indicated line(s)
- Understand what the reviewer is asking for
- Evaluate whether the comment has merit:
  - Is the suggestion correct and applicable to the current code?
  - Is it a style preference vs a real issue?
  - Is the comment outdated (code already changed)?
  - Has it already been addressed?
- Propose what specific change would address it (if any)
- Flag if the comment doesn't make sense or is already addressed

Launch sub-agents **in parallel** where possible (multiple Task tool calls in one message).

### 5. Present Analysis

After all sub-agents complete, present a summary for each comment:

- What the reviewer wants
- Whether it has merit (and why/why not)
- The proposed fix (or "no change needed" with explanation)

Then ask the user which comments to actually apply changes for (use AskUserQuestion). The user may choose to skip some even if they have merit.

### 6. Apply Changes

For the comments the user approves, make the code changes using the Edit tool. Apply changes carefully, preserving surrounding code.

### 7. Summary

Display a final summary:
- **Addressed**: list of comments where changes were made (with brief description of what changed)
- **Skipped**: list of comments not addressed (with reason — user declined, already addressed, outdated, etc.)

**IMPORTANT**: Do NOT:
- Reply to comments on GitHub
- Resolve any threads
- Create commits
- Push to the remote

Only make local code changes. The user will review, commit, and push themselves.
