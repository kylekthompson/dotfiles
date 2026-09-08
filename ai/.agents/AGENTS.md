- Make small, focused commits. Prefer colocating tests with their implementation.
- When opening PRs, always start with a draft PR.

## Codebase consistency

- Treat consistency with the existing codebase as a correctness requirement, not a stylistic preference. Before implementing a change, read comparable implementations and their tests to identify the established pattern; do not infer it from filenames or a single nearby snippet.
- Follow that pattern across structure, responsibility boundaries, interfaces, naming, control flow, error handling, and tests. New modules and features should look like they belong beside their existing peers, not introduce a parallel approach to the same kind of work.
- Prefer established project conventions over personal preferences, generic best practices, or familiar patterns from other codebases. If conventions differ by area, follow the relevant peers and applicable repository guidance.
- Depart from an established pattern only when the task requires it or concrete evidence shows it cannot meet the requirement. Explain the reason and scope of the departure before implementing it; do not silently redesign conventions or broaden the task into a refactor.
- Before finishing, compare the diff with the implementations used as references and correct unjustified inconsistencies.
