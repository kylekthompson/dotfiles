---
name: rwx-sandbox
description: Use when executing project shell commands and `.rwx/sandbox.yml` is present. Prefer `rwx sandbox` for tests, linters, builds, migrations, codegen, package manager scripts, database commands, and other iterative in-project command execution that should run in the configured development environment.
---

# RWX Sandbox

Use sandbox-first command routing for project command execution.

## Routing Rules

1. Check whether `.rwx/sandbox.yml` exists at the project root.
2. If it exists, run project commands with:
   - `rwx sandbox exec .rwx/sandbox.yml -- <command>`
3. If it does not exist, run commands locally and note that sandbox setup is available with:
   - `rwx sandbox init .rwx/sandbox.yml`

Make sure to run `rwx sandbox` commands serially. It does not yet handle parallel invocations.

Prefer sandbox execution for fast iterative loops and environment-dependent commands, especially:
- tests
- linters and format checks
- builds
- migrations and schema generation
- code generation
- package manager scripts (`npm`, `pnpm`, `yarn`, `bun`, `make`, etc.)
- database commands

Keep local execution for tasks that do not need sandbox command execution:
- reading files
- editing files
- lightweight git metadata checks (`git status`, `git diff`, `git log`, `git show`)

## Failure and Recovery

If a sandbox command fails:

1. Run `rwx results <run-id>` and try to diagnose the issue
2. If that fails, run `rwx sandbox reset .rwx/sandbox.yml --wait`
3. Retry the original sandbox command once.
4. If it still fails, ask the user before any local fallback.

Do not silently switch to local execution after repeated sandbox failures.

## Operational Commands

Use these when managing sandbox sessions:

- Inspect sessions: `rwx sandbox list`
- Warm/start a sandbox: `rwx sandbox start .rwx/sandbox.yml --wait`
- Recover sandbox state: `rwx sandbox reset .rwx/sandbox.yml --wait`
- Stop sandbox sessions: `rwx sandbox stop` (or `rwx sandbox stop --id <run-id>`)

## Sync Behavior

When using `rwx sandbox exec`:
- local uncommitted changes are synced to sandbox before execution
- sandbox file changes are synced back locally after execution (even on non-zero exit)

Use `--no-sync` only when intentionally running against unsynced sandbox state.
