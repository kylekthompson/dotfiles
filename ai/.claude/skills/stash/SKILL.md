---
name: stash
description: Save current context understanding to .claude/state
disable-model-invocation: true
allowed-tools:
  - "Bash(~/.claude/skills/stash/scripts/prepare-stash.sh *)"
---

# Stash Context Skill

Save your current understanding to `.claude/state/context.md` so you can resume later with a fresh context.

## Workflow

1. Analyze the current conversation to extract:
   - **Problem summary**: What we're working on (1-3 sentences)
   - **Key decisions**: Important choices made during the conversation
   - **Relevant files**: Files that matter and why
   - **Current status**: Where we are now
   - **Next steps**: What needs to happen next

2. Base64 encode the content and pass as argument to the script:

```bash
~/.claude/skills/stash/scripts/prepare-stash.sh 'BASE64_ENCODED_CONTENT'
```

The content to encode (before base64):
```markdown
## Problem Summary
[1-3 sentences describing what we're working on]

## Key Decisions
- Decision 1
- Decision 2

## Relevant Files
- `path/to/file.ts` - why it matters

## Current Status
[Where we are now]

## Next Steps
1. Step 1
2. Step 2
```

3. Tell the user: "Context stashed. Run `/clear` then `/unstash` to resume fresh."
