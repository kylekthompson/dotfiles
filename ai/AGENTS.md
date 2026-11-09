# AI configuration maintenance

This file governs maintenance of `ai/` in this repository. Keep it excluded from Stow; `ai/.agents/AGENTS.md` is the separate user-wide guidance installed into the home directory.

All skill and Amp plugin edits belong in this repository's `ai/` directory: standalone skills in `ai/.agents/skills/`, and plugins (including bundled skills) in `ai/.config/amp/plugins/`. Do not edit global repositories, installed copies, or caches directly, even when Amp's built-in guidance suggests doing so. These are publication outputs; use the `dot-sync-amp` workflow documented in the root README only when publication is explicitly authorized.

Portable policy lives in `.agents/skills/`. Keep the standalone `rwx-sandbox` skill for non-Amp consumers. The personal `rwx` plugin intentionally shadows workspace `rwx` so it can be customized independently. Its bundled skill starts from RWX's published skill with a short sandbox policy and links to RWX's sandbox documentation, not a generated reference. Keep credential routing and orb terminal authentication in the separate personal `rwx-auth` plugin.

For personal plugins that bundle portable policies, register source-skill/destination pairs in `.agents/sync-plugin-skills.ts`. Run the generator after changing a registered policy, then check for drift. Commit source policies and generated references together; do not edit generated copies directly. There are currently no registered copies.

The personal `rwx-auth` plugin owns only checkout-owner token routing and orb terminal authentication. From the dotfiles repository root:

```sh
bun ai/.agents/sync-plugin-skills.ts
bun ai/.agents/sync-plugin-skills.ts --check
bun test ./ai/.agents/sync-plugin-skills.test.ts ./ai/.config/amp/plugins/rwx-auth ./ai/.config/amp/plugins/rwx
```

Push each changed global skill or plugin only when publication is authorized; changing this repository does not update Amp's global repositories.
