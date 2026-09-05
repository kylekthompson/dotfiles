<!-- Generated from ai/.agents/skills/rwx-sandbox/SKILL.md by sync-plugin-skills.ts. -->

# RWX Sandbox

Run environment-dependent project commands in the repository's configured persistent sandbox. Keep inspection and editing on the host.

## Choose the Execution Boundary

1. Identify the active worktree root and check for `.rwx/sandbox.yml`. Do not rely on file searches that omit hidden directories.
2. Use the sandbox for commands whose result depends on the configured runtime, dependencies, tools, services, or setup state. This includes tests, linters, formatters, type checks, builds, package scripts, migrations, schema or code generation, and database commands.
3. Keep file reads, searches, edits, and lightweight Git inspection on the host. Run RWX lifecycle commands on the host too.
4. If the config is absent, use the normal local workflow. Do not initialize or add sandbox configuration unless the user asks.
5. If RWX is unavailable or cannot authenticate, continue host-only inspection and editing. Ask before running environment-dependent commands locally; even an approved diagnostic fallback is not authoritative sandbox verification.

## Execute Commands

- Run a simple command directly: `rwx sandbox exec -- npm test`.
- Put shell syntax inside the sandbox. For pipelines, redirections, variable expansion, or command chains, use `rwx sandbox exec -- sh -lc '<command>'`; do not let the host shell run part of the project command.
- Run from the intended worktree and let RWX resolve the default config. Specify a config path only for a non-default config.
- Let `exec` lazily start or reuse the sandbox. Do not run `start` or `reset` before every command.
- Run commands against one sandbox serially because they share state and synchronize files. Separate Git worktrees have isolated sandboxes and can execute in parallel.

Before each command, RWX syncs staged, unstaged, and untracked local files into the sandbox. After it completes, RWX syncs command changes back. The first command in a new sandbox can also return files created by setup tasks. Inspect returned changes and do not overwrite unrelated work. Git LFS objects do not sync; account for any warning in the result.

## Diagnose Failures

Do not treat every nonzero exit as a sandbox failure.

1. Read the command output first. Fix failures caused by the requested change and rerun the smallest relevant command in the same sandbox. Report unrelated failures rather than expanding the task. Do not reset for project test failures.
2. If setup fails, use the diagnostic summary in the CLI output. Fix the config, dependency, or project input, then run `rwx sandbox exec --reset -- <command>` so setup runs again.
3. Reset only when setup inputs changed or evidence shows stale or damaged sandbox state. Use `exec --reset` when a command is ready, or `rwx sandbox reset --wait` when only a fresh environment is needed.
4. If the output supplies a run ID and more task detail is useful, inspect it with `rwx results <run-id>`. Do not reset for authentication, authorization, quota, or network errors.
5. Retry once only when the failure can be transient. If the sandbox remains blocked, report the evidence and continue only work allowed by the execution boundary above.

## Manage the Lifecycle

- Inspect sessions with `rwx sandbox list`.
- Pre-warm a complex environment with `rwx sandbox start --wait` only when lazy startup is not suitable.
- After final verification, stop the current worktree's sandbox with `rwx sandbox stop` unless more commands will use it soon.
- Use `rwx sandbox stop --id <run-id>` only for a session that you identified. Do not use `--all` unless the user asks because it can stop other work.

## Report Results

- State which checks ran through RWX and give their result.
- If a check ran locally as an approved fallback, say why and state the environment difference or remaining uncertainty.
- Review files synced back from the sandbox before presenting them as intentional changes.
