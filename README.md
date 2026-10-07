# ~/

These are my dotfiles! They are an always-changing WIP, so feel free to use them, but be careful!

```bash
git clone https://github.com/kylekthompson/dotfiles ~/.dotfiles
cd ~/.dotfiles
./scripts/bin/dot-strap
./scripts/bin/dot-setup
```

Run both scripts as your login user, **not with sudo**, from a native macOS
terminal (not Rosetta). They request sudo only for system configuration. If Git
or developer tools are missing, run `xcode-select --install`, finish the installer,
then retry. An existing full Xcode installation also works; resolve any license
or first-launch prompts before continuing. After a macOS upgrade, review available
developer-tool updates in System Settings > General > Software Update.

`dot-strap` reuses existing Homebrew or Workbrew, or installs Homebrew with its
official installer. It enables the application firewall and Apple's Touch ID
sudo rule in `sudo_local` when the standard template is available. It does not
install macOS updates or enable FileVault automatically. Check FileVault in
System Settings > Privacy & Security, keep its recovery key in a secure place,
and require a password immediately after sleep in System Settings > Lock Screen.

Sign in to the Mac App Store before running `dot-setup`. It installs the declared
packages, stows dotfiles and copies fonts, sets Homebrew Zsh as your login shell,
installs mise tools and Claude Code, and installs Amphetamine, Magnet, and Clocker.
Open a new terminal afterward. Existing files that conflict with Stow must be
reviewed and moved aside manually; the scripts do not overwrite or adopt them.

Zsh includes autosuggestions, syntax highlighting, fzf bindings, and a Git/Mercurial
prompt. Put machine-local shell configuration in `~/.config/zsh/override.zsh`;
Fish overrides and history are not imported automatically.

`~/.config/shell/development.sh` owns the shared tool paths and PostgreSQL build
environment. Interactive Zsh, workstation setup, and the Amp runner load it;
prompts, aliases, completions, and interactive mise activation stay in `.zshrc`.
The shared PATH includes Amp, Bun, OrbStack, local binaries, and mise shims before
Homebrew's libpq tools. Workstation updates should rerun `dot-stow` to install
the shared file before opening a new terminal.

## Set up an Apple Silicon Mac as an Amp runner

This is a minimal alternative to `dot-strap` / `dot-setup`, not an additional
workstation setup step. Run it in a native ARM terminal as the macOS user that
will run Amp, **without sudo**. Homebrew's installer may request administrator
credentials. It installs Git, GitHub CLI, mise, ripgrep, jq, tmux, and the
self-updating Amp CLI, plus 1Password for account setup and OrbStack for Docker
support. It also installs PostgreSQL client tools (`libpq`) and build dependencies
(`pkg-config`, ICU, curl, and zlib). It does not install a Homebrew PostgreSQL
server, the full workstation dotfiles or app set, or publish Amp configuration.
It links the shared development environment, `.zprofile`, and `.zshrc` for local
and SSH terminals without changing your login shell; the macOS-provided Zsh is
sufficient. Optional shell plugins load only when installed, and the editor
falls back to `vi` when Zed is unavailable.

For a dedicated runner Mac, use one local administrator account for tool
maintenance and running Amp. An Apple Account is not required for this setup;
you can skip that sign-in during macOS setup. Keep personal iCloud syncing off,
and give the machine only the development credentials it needs. Run Amp without
sudo and do not configure passwordless sudo.

On a fresh Mac, install Apple's developer tools and wait for them to finish:

```bash
xcode-select --install
```

Skip this if full Xcode is already installed and selected (see below).

Then, in the default Zsh or Bash:

```bash
git clone https://github.com/kylekthompson/dotfiles ~/.dotfiles
cd ~/.dotfiles
./scripts/bin/dot-runner-setup
```

Defaults are runner ID `m1-pro` and repository parent `~/src`. Override them with
`./scripts/bin/dot-runner-setup my-mac "$HOME/projects"`. The script creates
`~/Library/LaunchAgents/com.kylekthompson.amp-runner.plist` but does **not** start
or restart the service. Keep this checkout in place: the LaunchAgent and shell
symlinks refer to it. Existing shell files or links to other configurations must
be backed up and moved aside before setup; it checks all three links before
installing anything and does not overwrite or adopt conflicting files. Preserve
machine-local settings in `~/.config/zsh/override.zsh`. Open a new Zsh terminal
after setup. After stowing, setup is also available as `dot-runner-setup`.

Open 1Password and sign in to access the credentials needed for account setup.

Open OrbStack once and finish its initial setup to start the Docker engine:

```bash
open -a OrbStack
```

After setup finishes, verify Docker from a new terminal:

```bash
docker context use orbstack
docker info
```

OrbStack includes Docker CLI, Compose, and Buildx; no separate Docker package is
needed. Enable OrbStack's **Start at login** setting so the engine is available
after reboot and login. The runner includes `~/.orbstack/bin` on PATH without
relying on shell profiles. Setup does not open OrbStack or start its engine.

Authenticate interactively as the same user:

```bash
~/.amp/bin/amp login
/opt/homebrew/bin/gh auth login
/opt/homebrew/bin/gh auth setup-git
```

Clone repositories into `~/src/<org>/<repo>` to mirror GitHub (or under your
chosen parent), install their dependencies, and check that their tests work
locally. For trusted repositories using mise, run `/opt/homebrew/bin/mise trust` and
`/opt/homebrew/bin/mise install` in each checkout. Setup does not install any
project runtimes. The runner supplies Homebrew, Amp, local binaries, and mise
shims on PATH without loading interactive shell profiles. Shims select runtime
versions per directory; use `mise exec -- <command>` when a task also needs
mise-defined environment variables.

The shared environment supplies Homebrew's `libpq` tools after mise shims on
PATH and exports `PKG_CONFIG_PATH` for ICU, curl, and zlib,
`MACOSX_DEPLOYMENT_TARGET` for the current macOS version, and `SDKROOT` from the
selected developer tools. Runner threads and interactive Zsh terminals use the
same settings without loading interactive shell features into the runner.
PostgreSQL server versions remain project-managed through mise or Docker.

Start the runner in your logged-in macOS session:

```bash
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.kylekthompson.amp-runner.plist"
~/.amp/bin/amp runner list
```

Select `m1-pro` in Amp's new-thread location picker. Repositories up to two levels
below the parent are discovered automatically, so `~/src/<org>/<repo>` needs no
extra discovery depth. New clones and worktrees are discovered too. An empty
parent has no served repositories, so the runner will not appear until you clone
one. Prefer **New Worktree** for concurrent tasks.

The wrapper uses these [Amp runner flags](https://ampcode.com/docs/cli/runners):

| Flag | Purpose |
| --- | --- |
| `--no-tui` | Run a background runner, without an interactive Amp TUI. |
| `--runner-id m1-pro` | Keep a stable runner ID (supplied by the LaunchAgent). |
| `--discover-dirs` | Discover checkouts two levels beneath the working directory. |
| `--no-serve-cwd` | Advertise discovered checkouts, not the `~/src` parent itself. |
| `--remote-control-terminal` | Enable the web Terminal tab. |
| `--desktop` | Enable the Desktop tab, sharing and controlling this Mac's display. |

Desktop access is Amp's built-in remote desktop, **not a Microsoft RDP server**.
On first startup, grant **Amp Desktop Helper** Screen Recording and Accessibility
access in System Settings > Privacy & Security. Check readiness or request the
permissions again with:

```bash
~/.amp/bin/amp runner desktop status
~/.amp/bin/amp runner desktop allow screen-recording
~/.amp/bin/amp runner desktop allow accessibility
```

All threads on this Mac share the same desktop, not isolated GUI sessions. Screen
locking can affect GUI automation; verify desktop access in the state you plan
to use. For independent remote access when Amp is offline, configure macOS Screen
Sharing separately; this bootstrap does not enable it.

The LaunchAgent starts at login and restarts after exits. It prevents system
sleep on AC power, but **does not prevent lid-close sleep**. Keep the Mac plugged
in, ventilated, and the lid open. Keep FileVault enabled and automatic login off;
plan to unlock the disk and log into the runner account after reboot. Lock the
screen rather than logging out to keep command-line work running. Apple Silicon
Macs on macOS 26 or later also support
[FileVault unlock over SSH](https://support.apple.com/guide/security/sec8447f5049/web)
with Remote Login enabled and networking available. This is not automatic login;
the LaunchAgent still requires a user login session. Amp cannot wake the Mac.
Threads can access the macOS user's files and credentials: advertised directories
are not a sandbox. Desktop and terminal access are enabled by the wrapper;
workspace sharing and Amp-managed environment injection remain off by default.

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

### Optional: Xcode builds

For Apple-platform app builds, install full Xcode separately; the Command Line
Tools package alone is not sufficient. Use the version your projects expect and
that your macOS version supports. You can use your existing Apple Account to
download Xcode through the Mac App Store or Apple's developer downloads without
signing into iCloud. No separate runner Apple Account is needed.

Open Xcode once to finish setup and install the platform and Simulator runtimes
you need. Then select it for command-line builds:

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
xcodebuild -version
```

Adjust the path if Xcode is installed elsewhere. The runner uses this selection
for `xcodebuild`; no runner configuration change or desktop sharing is needed for
command-line builds. Ordinary Simulator builds/tests generally do not require
signing into Xcode. Physical-device builds and distribution need appropriate
developer signing credentials and provisioning, configured separately. Keep
signing keys out of Git and install them only when needed.

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
