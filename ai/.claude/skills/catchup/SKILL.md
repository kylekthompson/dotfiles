---
name: catchup
description: Load all changes on the current branch into context to quickly understand what has changed.
disable-model-invocation: true
allowed-tools:
  - "Bash(~/.claude/skills/catchup/scripts/*)"
---

# Catchup on Branch Changes

## Context

!`~/.claude/skills/catchup/scripts/get-branch-changes.sh`

## Instructions

You are helping the user catch up on what has changed on their current branch. Follow these steps:

### 1. Branch Detection

Parse the branch info above. If it contains an error, inform the user of the issue and stop.

If the user is on the main/master branch, let them know there are no feature branch changes to show and suggest switching to a feature branch.

### 2. Present Summary

Give the user a concise summary of what's on this branch:

- How many commits have been made
- What files have been changed
- A high-level description of what the changes accomplish (based on commit messages and the diff)

### 3. Offer Assistance

After presenting the summary, ask the user what they'd like to do:

- **Explore specific changes** — dive deeper into particular files or commits
- **Continue working** — proceed with development on this branch
- **Review the diff** — discuss the changes in more detail

Use the AskUserQuestion tool to offer these options.
