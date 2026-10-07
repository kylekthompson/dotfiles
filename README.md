# ~/

These are my dotfiles! They are an always-changing WIP, so feel free to use them, but be careful!

```bash
git clone https://github.com/kylekthompson/dotfiles ~/.dotfiles
cd ~/.dotfiles
./scripts/bin/dot-strap
fish
sudo dot-setup
```

## Set up an Apple Silicon Mac as an Amp runner

This is a minimal alternative to `dot-strap` / `dot-setup`, not an additional
workstation setup step. Run it in a native ARM terminal as the macOS user that
will run Amp, **without sudo**. Homebrew's installer may request administrator
credentials. It installs Git, GitHub CLI, mise, ripgrep, jq, tmux, and the
self-updating Amp CLI; it does not stow dotfiles, install desktop apps, change
your shell, or publish Amp configuration.

On a fresh Mac, install Apple's developer tools and wait for them to finish:

```bash
xcode-select --install
```

Then, in the default Zsh or Bash:

```bash
git clone https://github.com/kylekthompson/dotfiles ~/.dotfiles
cd ~/.dotfiles
./scripts/bin/dot-runner-setup
```

Defaults are runner ID `m1-pro` and repository parent `~/code`. Override them with
`./scripts/bin/dot-runner-setup my-mac "$HOME/projects"`. The script creates
`~/Library/LaunchAgents/com.kylekthompson.amp-runner.plist` but does **not** start
or restart the service. Keep this checkout in place: the LaunchAgent invokes its
runner wrapper directly. After stowing, setup is also available as
`dot-runner-setup`.

Authenticate interactively as the same user:

```bash
~/.amp/bin/amp login
/opt/homebrew/bin/gh auth login
/opt/homebrew/bin/gh auth setup-git
```

Clone the repositories you want under `~/code` (or your chosen parent), install
their dependencies, and check that their tests work locally. For trusted
repositories using mise, run `/opt/homebrew/bin/mise trust` and
`/opt/homebrew/bin/mise install` in each checkout. Setup does not install any
project runtimes. The runner supplies Homebrew, Amp, local binaries, and mise
shims on PATH without loading interactive shell profiles. Shims select runtime
versions per directory; use `mise exec -- <command>` when a task also needs
mise-defined environment variables.

Start the runner in your logged-in macOS session:

```bash
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.kylekthompson.amp-runner.plist"
~/.amp/bin/amp runner list
```

Select `m1-pro` in Amp's new-thread location picker. Repositories up to two levels
below the parent are discovered automatically, including new clones and
worktrees. An empty parent has no served repositories, so the runner will not
appear until you clone one. Prefer **New Worktree** for concurrent tasks.

The LaunchAgent starts at login and restarts after exits. It prevents system
sleep on AC power, but **does not prevent lid-close sleep**. Keep the Mac plugged
in, ventilated, and the lid open; leave FileVault enabled and expect a local
unlock after reboot. Amp cannot wake the Mac. Threads can access the macOS
user's files and credentials: advertised directories are not a sandbox. Desktop
sharing, workspace sharing, and Amp-managed environment injection are off by
default.

Inspect the service and logs:

```bash
launchctl print "gui/$(id -u)/com.kylekthompson.amp-runner"
tail -n 100 "$HOME/Library/Logs/amp-runner/stderr.log"
```

After active work finishes, stop with
`launchctl bootout "gui/$(id -u)/com.kylekthompson.amp-runner"`. To apply setup
changes, rerun setup and bootstrap again; setup alone does not reload a running
service. To disable startup permanently, boot out the service and remove its
plist. This does not remove code, credentials, or installed tools.

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

Standalone skills can also have an optional `amp-guidance.md` beside `SKILL.md`,
for example `ai/.agents/skills/designing-ui/amp-guidance.md`. Keep the portable
skill self-contained; do not link it to the Amp supplement. During sync, the
publisher appends two newlines, `## Amp-specific guidance`, two newlines, and the
exact supplement to the published `SKILL.md`. It omits the companion file from
the published resources. Both inputs come from the same pinned revision, and a
present supplement must be nonempty UTF-8 text. Removing it restores publication
of the portable skill alone. No generated copy is checked in or written over the
source: Claude and Codex continue loading the portable `SKILL.md`. This convention
applies to allowlisted standalone skills, not plugin-bundled skills. Skill-specific
instructions load with that skill rather than entering the global AGENTS setting.

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
