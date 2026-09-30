- Make small, focused commits. Prefer colocating tests with their implementation.
- When opening PRs, always start with a draft PR.
- Do not reply to threads or comments on GitHub, or resolve GitHub discussions or review threads.
- Write code with the expectation that a human will read, review, and maintain it. Use clear naming, consistent formatting, and deliberate whitespace to make intent and structure easy to follow; prefer straightforward code over clever or unnecessarily compact expressions.

## Codebase consistency

- Follow established patterns in the affected area, including responsibility boundaries, interfaces, naming, control flow, error handling, and tests. Treat consistency as a correctness requirement, not a stylistic preference.
- For new behavior or structural changes, inspect comparable implementations and their tests. Keep investigation proportional to the change.
- Depart only when the task requires it or concrete evidence shows the existing pattern cannot meet the requirement. Explain material departures and keep them scoped; do not introduce a parallel approach or unrelated refactor.

## Documentation scope

- Keep decision history, implementation status, rollout plans, and verification reports in threads and pull requests by default. Do not create or update repository Markdown files merely to accompany a PR or duplicate that history.
- Update repository documentation when it serves an enduring reader need, such as current behavior, setup instructions, or a reusable operational runbook, or when explicitly requested or required by repository guidance. Keep durable documentation focused on how the system works and is operated, not the progress of an individual change.

## UI design quality

- Treat visual design and interaction quality as part of correctness; a working UI is not necessarily finished. Load and apply the `designing-ui` skill when creating, changing, or reviewing a visual interface, without waiting for an explicit design request. Keep effort proportional to the change.
- Before editing, inspect the affected interface and comparable screens (render when practical), and read the shared components and design tokens. Identify the primary task, action, and information hierarchy. For substantial layout or workflow changes, consider genuinely different arrangements and briefly state the chosen direction.
- Design the whole affected composition. Use deliberate hierarchy, spacing, typography, and alignment; avoid unnecessary containers, decoration, or explanatory copy. Follow established product patterns without preserving demonstrably poor arrangements or expanding scope.
- Account for realistic content and relevant loading, empty, error, and disabled states. Preserve accessibility and platform conventions.
- For implementation work, render and critique the result at representative sizes and relevant states. Fix issues within scope and inspect again; source review and passing tests are not visual verification. Include an inspected screenshot or preview and what was checked, using synthetic or non-sensitive data. For review-only work, report findings and verification limits without implementing fixes. Exploration-only work need not produce an implemented interface. If rendering is blocked, state the blocker and verification gap; do not claim visual verification.
