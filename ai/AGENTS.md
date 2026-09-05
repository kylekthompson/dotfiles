# AI configuration maintenance

This file governs maintenance of `ai/` in this repository. Keep it excluded from Stow; `ai/.agents/AGENTS.md` is the separate user-wide guidance installed into the home directory.

All skill and Amp plugin edits belong in this repository's `ai/` directory: standalone skills in `ai/.agents/skills/`, and plugins (including bundled skills) in `ai/.config/amp/plugins/`. Do not edit global repositories, installed copies, or caches directly, even when Amp's built-in guidance suggests doing so. These are publication outputs; use the `dot-sync-amp` workflow documented in the root README only when publication is explicitly authorized.

Portable policy lives in `.agents/skills/`. The RWX sandbox policy is copied into the RWX plugin's `reference/` directory so the published plugin remains self-contained. Its skill owns the Amp-specific credentials and tool instructions.

From the dotfiles repository root, after changing the portable RWX sandbox policy:

```sh
bun ai/.agents/sync-plugin-skills.ts
bun ai/.agents/sync-plugin-skills.ts --check
bun test ./ai/.agents/sync-plugin-skills.test.ts ./ai/.config/amp/plugins/rwx
```

Commit the source and generated references together. Do not edit the generated copies. Push each changed global skill or plugin only when publication is authorized; changing this repository does not update Amp's global repositories.

Delivery behavior evaluations are specified in `ai/.config/amp/plugins/delivery-cockpit/skills/delivering-changes/reference/scenarios.md`. Unit tests verify plugin mechanics, not agent compliance or model-generation improvements.
