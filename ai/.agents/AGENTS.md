- Make small, focused commits. Prefer colocating tests with their implementation.
- When opening PRs, always start with a draft PR.
- Write code with the expectation that a human will read, review, and maintain it. Use clear naming, consistent formatting, and deliberate whitespace to make intent and structure easy to follow; prefer straightforward code over clever or unnecessarily compact expressions.

## Codebase consistency

- Follow established patterns in the affected area, including responsibility boundaries, interfaces, naming, control flow, error handling, and tests. Treat consistency as a correctness requirement, not a stylistic preference.
- For new behavior or structural changes, inspect comparable implementations and their tests. Keep investigation proportional to the change.
- Depart only when the task requires it or concrete evidence shows the existing pattern cannot meet the requirement. Explain material departures and keep them scoped; do not introduce a parallel approach or unrelated refactor.
