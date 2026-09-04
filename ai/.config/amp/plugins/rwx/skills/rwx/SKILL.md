---
name: rwx
description: Runs authenticated RWX CLI commands, including results, logs, and cloud sandbox execution. Use for any RWX operation. When `.rwx/sandbox.yml` exists, load this skill before running environment-dependent project commands.
---

# RWX

Run authenticated RWX CLI commands with `shell_command`. In an Amp orb, the plugin installs and verifies the latest stable RWX CLI from its official GitHub release. It selects the access token for the repository owner without putting the token value in the command.

Before the first RWX operation in a task, run `rwx whoami` to verify that the selected credentials work.

## Use Current RWX Documentation

Before creating, modifying, or explaining files under `.rwx`, pull the current run-definition reference:

`rwx docs pull /migrating/rwx-reference`

The output is already bounded. Do not truncate it. If the reference does not answer a question, run `rwx docs search "<query>"`, then use `rwx docs pull` for the relevant result.

After changing a run definition, validate it with `rwx lint .rwx/<name>.yml`.

## Execute RWX Commands

Run the CLI from the active worktree root:

- Results: `rwx results <run-id>`
- Logs: `rwx logs <task-id>`
- Artifacts: `rwx artifacts --help`
- Identity: `rwx whoami`

For CI failures or branch status, start with `rwx results --help` to select the correct filters. If the user explicitly asks to start a run, use `rwx run .rwx/<file>.yml --wait` and iterate on failures. A run uses local changes to patch its Git clone, so it does not require a commit or push.

When `gh pr checks --watch` reports failed checks, extract the run ID from the RWX URL in its output and run `rwx results <run-id>` before inspecting individual logs. Its default output gives an LLM-friendly summary for the complete run.

Use a short `timeout_ms` for a long command. If `shell_command` returns `running: true`, pass its PID to `shell_command_status` until the command finishes. Do not rerun the original command to get more output. Output can arrive in batches, and stdout and stderr share one stream. ANSI and carriage-return characters can be present in the output.

## Use RWX Sandboxes

1. Identify the active worktree root and check for `.rwx/sandbox.yml`. Do not use file searches that omit hidden directories.
2. Use `rwx sandbox exec` through `shell_command` for tests, linters, formatters, type checks, builds, package scripts, migrations, schema or code generation, and database commands.
3. Keep file reads, searches, edits, lightweight Git inspection, and RWX lifecycle commands on the host.
4. If the config is absent, use the normal local workflow. Do not add sandbox configuration unless the user asks.
5. If RWX is unavailable or cannot authenticate, report the blocker. Ask before running an environment-dependent command locally because its result might not represent the configured environment.

For a simple command:

`rwx sandbox exec -- npm test`

Put shell syntax inside the sandbox, never in the host command:

`rwx sandbox exec -- sh -lc 'npm test | tee test.log'`

Let execution lazily start or reuse the sandbox. Add `--reset` after `exec` only when setup inputs changed or evidence shows stale or damaged sandbox state.

Before each command, RWX syncs staged, unstaged, and untracked files into the sandbox. After it completes, RWX syncs command changes back. Inspect returned changes and do not overwrite unrelated work. Git LFS objects do not sync; account for any warning in the result.

## Diagnose Failures

1. Read the bounded command output. If the project command ran and failed, fix the project issue and rerun the smallest relevant command without a reset.
2. If setup fails, fix the config, dependency, or project input, then rerun with `reset` so setup runs again.
3. Do not reset for authentication, authorization, quota, or network errors.
4. If the output supplies a run ID and more detail is useful, inspect it on the host with `rwx results <run-id>`.
5. Retry once only when the failure can be transient. If RWX remains blocked, report the evidence and ask before a local fallback.
6. Use `shell_command_kill` only when repeated status checks show no output and the process is not expected to run for a long time.

## Report Results

- State which checks ran through RWX and give their result.
- If a check ran locally as an approved fallback, state why and describe the remaining environment uncertainty.
- Review files synced back from the sandbox before presenting them as intentional changes.
