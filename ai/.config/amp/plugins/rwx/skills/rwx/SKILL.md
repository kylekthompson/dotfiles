---
name: rwx
description: Runs authenticated RWX CLI commands, including results, logs, and cloud sandbox execution. Use for any RWX operation. When `.rwx/sandbox.yml` exists, load this skill before running environment-dependent project commands.
---

# RWX

Run authenticated RWX CLI commands with `shell_command`. In an Amp orb, the plugin installs and verifies the latest unstable RWX CLI from its official GitHub release. It selects the access token for the repository owner without putting the token value in the command.

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

When `.rwx/sandbox.yml` exists, read [reference/sandbox.md](reference/sandbox.md) before running environment-dependent commands. It owns execution boundaries, synchronization, lifecycle, failure diagnosis, and reporting. Run its CLI examples through Amp's `shell_command` tool.

Use `shell_command_kill` only when repeated status checks show no output and the process is not expected to run for a long time.
