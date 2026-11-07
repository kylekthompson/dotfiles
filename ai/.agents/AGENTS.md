- Make small, focused commits.
- Prefer atomic SQL operations over explicit database locks where feasible.
- When opening PRs, always start with a draft PR.
- Never merge pull requests.
- Never reply to GitHub comments or threads, or resolve GitHub discussions or review threads, unless the comment, discussion, or thread was authored by a bot.

## Verification

- Scale verification to risk: run focused tests, lint, formatting, and type checks locally; prefer CI for broad or expensive checks. Run broad checks locally only when the risk warrants it, repository guidance requires it, or CI cannot cover them.
- Reuse successful checks. Clean stacked-PR rebases normally need only fresh CI; rerun affected local checks only when conflicts or material code, dependency, or generated-artifact changes invalidate earlier evidence.
