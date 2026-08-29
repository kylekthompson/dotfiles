---
name: rwx-sandbox
description: Routes environment-dependent commands through an existing RWX cloud sandbox. Before loading, check that `.rwx/sandbox.yml` exists. Use only when it exists and the task runs tests, checks, builds, package scripts, migrations, code generation, or database commands.
builtin-tools:
  - rwx_exec
---

# RWX Sandbox

Run environment-dependent project commands with the RWX plugin's `rwx_exec` tool. Keep inspection and editing on the host.

## Choose the Execution Boundary

1. Identify the active worktree root and check for `.rwx/sandbox.yml`. Do not use file searches that omit hidden directories.
2. Use `rwx_exec` for tests, linters, formatters, type checks, builds, package scripts, migrations, schema or code generation, and database commands.
3. Keep file reads, searches, edits, lightweight Git inspection, and RWX lifecycle commands on the host.
4. If the config is absent, use the normal local workflow. Do not add sandbox configuration unless the user asks.
5. If RWX is unavailable or cannot authenticate, report the blocker. Ask before running an environment-dependent command locally because its result might not represent the configured environment.

## Execute Commands

- Pass a normal command line in `command`. The tool runs simple commands directly and puts pipelines, redirections, expansions, and command chains inside the sandbox shell.
- Use `command` plus `args` when argument boundaries must be exact.
- The tool runs from the worktree root, selects the token for the repository owner, and serializes commands for this worktree.
- Let execution lazily start or reuse the sandbox. Set `reset` only after setup inputs change or evidence shows stale or damaged sandbox state.

Before each command, RWX syncs staged, unstaged, and untracked files into the sandbox. After it completes, RWX syncs command changes back. Inspect returned changes and do not overwrite unrelated work. Git LFS objects do not sync; account for any warning in the result.

## Diagnose Failures

1. Read the bounded command output. If the project command ran and failed, fix the project issue and rerun the smallest relevant command without a reset.
2. If setup fails, fix the config, dependency, or project input, then rerun with `reset` so setup runs again.
3. Do not reset for authentication, authorization, quota, or network errors.
4. If the output supplies a run ID and more detail is useful, inspect it on the host with `rwx results <run-id>`.
5. Retry once only when the failure can be transient. If RWX remains blocked, report the evidence and ask before a local fallback.

## Report Results

- State which checks ran through RWX and give their result.
- If a check ran locally as an approved fallback, state why and describe the remaining environment uncertainty.
- Review files synced back from the sandbox before presenting them as intentional changes.
