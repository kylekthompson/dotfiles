# ~/

These are my dotfiles! They are an always-changing WIP, so feel free to use them, but be careful!

```bash
git clone https://github.com/kylekthompson/dotfiles ~/.dotfiles
cd ~/.dotfiles
./scripts/bin/dot-strap
fish
sudo dot-setup
```

## Sync global Amp skills, plugins, and guidance

Requires authenticated `amp`, Git, and Bun with `Bun.YAML` support (tested with
Bun 1.3.10). From this checkout, run:

```bash
./scripts/bin/dot-sync-amp
```

After stowing, the command is also available as `dot-sync-amp`. It fetches and
pins the latest `origin/main`, without changing the dotfiles worktree. Only skills
listed in `ai/.agents/amp-skills.json` and the complete `ai/.config/amp/plugins`
tree are eligible for repository publication. `ai/.agents/AGENTS.md` (shared
guidance) and `ai/.agents/amp-guidance.md` (Amp-only additions) are composed and
handed off to the syncing Amp thread for the personal Global AGENTS.md setting;
`settings.json` and other configuration remain excluded.

Keep agent-independent policy in the shared base and Amp-specific instructions
in the supplement. There is no checked-in generated copy. Claude and Codex keep
using the shared base. The existing local Amp guidance symlink remains until the
composed global setting is published and verified to load in local Amp; remove
that symlink after verification to avoid loading the base twice.

The default run validates skill frontmatter, plugin entrypoints and descriptions,
and literal bundled-skill registrations, then runs colocated Bun plugin tests in a
temporary staging directory. It discovers writable User repositories through Amp,
reuses their canonical clones under `~/.cache/amp/repositories`, fast-forwards them,
and reports changed names and paths. It does not commit or push. Both existing
clones must be clean, including ignored files, on `main`, and have no unpublished
commits. Missing clones are created; an empty global repository without a remote
`main` must be initialized separately.

Review the printed source revision, especially plugin commands, credential
access, network/install behavior, tests, and executable resources. Tests execute
source code even in the default mode: this is a synchronizer for trusted dotfiles,
not a sandbox or automated security audit. Publish the reviewed revision with:

```bash
./scripts/bin/dot-sync-amp --publish <reviewed-origin-main-revision>
```

Publishing refuses if `origin/main` has moved. It replaces the destination trees
exactly, **including deletion of previously published entries**, verifies file
contents and executable bits, makes one commit per changed repository, and pushes
each changed `main`. Identical trees produce no commit or push. Symlinks and binary
resources are rejected. Plugin skill registrations must use a literal
`amp.registerSkill({ path: 'skills/<name>' })` call in the entrypoint.

After a push, use Amp's `reload_skills` and/or `reload_plugins` tools in the active
thread and verify the synchronized entries load without errors. The script prints
the required reloads; the CLI cannot reload an existing session. New threads pick
up pushed global entries automatically.

Every successful run also prints a single-line JSON handoff with type
`amp-global-agent-guidance`, including when skills and plugins already match.
It contains the exact shared base followed by two newlines, an
`## Amp-specific guidance` heading, two newlines, and the exact Amp supplement.
Both files must be nonempty UTF-8 text and come from the same pinned source
revision. The handoff includes both source URLs, the preview/publish mode, and
arguments for Amp's `get_settings` and `update_setting` tools.
The syncing thread should discover `amp.get_settings`
and `amp.update_setting` with `tool_search`, then call them through `code_exec`:

- **Preview:** compare personal `global_agent_guidance` with the supplied value
  and report differences without writing. Review this guidance before publishing.
- **Publish:** if different, replace the entire setting (not merge or append),
  then read it back and verify exact equality. Skip the write if already equal.

The CLI does not access these thread tools or claim the guidance is synchronized.
Without a syncing thread that completes this handoff, guidance sync remains
incomplete. The settings update and repository pushes are not atomic; report
partial completion if the tools are unavailable or verification fails.

Pushes across the two repositories are not atomic. On failure, inspect both
canonical clones and remotes before retrying; the script never force-pushes or
discards local commits. A lock prevents concurrent script invocations. If a process
is forcibly terminated, remove its reported stale lock only after confirming no
sync is running.

Run the synchronizer's tests (temporary local Git remotes; no real publication):

```bash
bun test scripts/dot-sync-amp.test.ts
```
