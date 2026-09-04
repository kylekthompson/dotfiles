# AI configuration maintenance

Portable policy lives in `skills/`. Amp plugin skills own only their client-specific UI, credentials, and tool instructions. The shared planning and RWX sandbox policies are copied into each plugin's `reference/` directory so published plugins remain self-contained.

From the dotfiles repository root, after changing either portable policy:

```sh
bun ai/.agents/sync-plugin-skills.ts
bun ai/.agents/sync-plugin-skills.ts --check
bun test ./ai/.agents ./ai/.config/amp/plugins
```

Commit the source and generated references together. Do not edit the generated copies. Push each changed global skill or plugin only when publication is authorized; changing this repository does not update Amp's global repositories.

Delivery behavior evaluations are specified in `ai/.config/amp/plugins/delivery-cockpit/skills/delivering-changes/reference/scenarios.md`. Unit tests verify plugin mechanics, not agent compliance or model-generation improvements.
