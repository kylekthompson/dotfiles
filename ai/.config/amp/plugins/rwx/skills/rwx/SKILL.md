---
name: rwx
description: Runs authenticated RWX commands. Use for RWX operations, or before environment-dependent project commands when `.rwx/sandbox.yml` exists.
---

# RWX

Run authenticated RWX CLI commands with `shell_command`. In an Amp orb, the first agent RWX command triggers installation and verification of the latest unstable CLI from its official GitHub release. Plugin loading and unrelated commands do not install it; terminal-only use needs an existing CLI. The plugin selects the access token for the repository owner without putting the token value in the command.

Before the first RWX operation in a task, run `rwx whoami` to verify that the selected credentials work.

## Use Current RWX Documentation

When creating or changing run-definition semantics, or explaining semantics not established by the repository, pull the current reference:

`rwx docs pull /migrating/rwx-reference`

For a specific unresolved question, use `rwx docs search "<query>"` and pull the relevant result. Reuse documentation already read in the task; comment-only edits and straightforward file explanations do not require a reference fetch.

After changing a run definition, validate it with `rwx lint .rwx/<name>.yml`.

## Execute RWX Commands

Run the CLI on the host from the active worktree root. RWX operations—including docs, lint, results, logs, artifacts, identity, run submission, and sandbox lifecycle commands—must not be wrapped in `rwx sandbox exec`.

- Results: `rwx results <run-id>`
- Logs: `rwx logs <task-id>`
- Artifacts: `rwx artifacts --help`
- Identity: `rwx whoami`

For CI failures or branch status, start with `rwx results --help` to select the correct filters. If the user explicitly asks to start a run, use `rwx run .rwx/<file>.yml --wait` and iterate on failures. A run uses local changes to patch its Git clone, so it does not require a commit or push.

When `gh pr checks --watch` reports failed checks, extract the run ID from the RWX URL in its output and run `rwx results <run-id>` before inspecting individual logs. Its default output gives an LLM-friendly summary for the complete run.

## Use RWX Sandboxes

When `.rwx/sandbox.yml` exists, read [reference/sandbox.md](reference/sandbox.md) before running environment-dependent commands. It owns execution boundaries, synchronization, lifecycle, failure diagnosis, and reporting. Invoke `rwx sandbox exec -- <command>` on the host through `shell_command`; only the project command after `--` runs in the sandbox.
