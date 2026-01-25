---
name: unstash
description: Load stashed context and resume work
disable-model-invocation: true
allowed-tools:
  - "Bash(~/.claude/skills/unstash/scripts/*)"
---

# Unstash Context Skill

Load saved state from `.claude/state/context.md` into a fresh context.

## Workflow

1. Read `.claude/state/context.md`

2. Present the saved context clearly to understand:
   - What problem we were working on
   - Key decisions already made
   - Which files are relevant
   - Current status and next steps

3. Run: `~/.claude/skills/unstash/scripts/cleanup-stash.sh` to delete the stash file

4. Confirm: "Context restored. Ready to continue from where we left off."
