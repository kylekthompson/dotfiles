# Git Workflow

- Break your work into small, incremental pieces that and commit that. Small, focused commits are easier to review.
- Prefer colocating tests with their implementation when possible.
- Commit messages should be sufficiently detailed to explain the why and reasoning behind a change, but avoid excessive detail.
- Do not put escaped newline sequences (for example `\n`) inside commit message text. They will be committed literally. Prefer using a temporary file and providing that to the `gh` cli.
- When opening PRs, always start with a draft PR.

# Code Style & Quality

- Avoid writing comments that simply re-state what the code that follows is doing. Comments that explain the reasoning behind a decision are fine, however.
- Maintain a similar style and tone as the rest of the code. Consistency is important.
- Ensure that the tests, linters, formatters, and type checks all pass prior to completing your task (ideally before committing as well).

# Monorepo Practices

- When working within monorepos, cd to the directory of the project, then run the command within the scope of that project, then cd back to the root. This way, you'll have correct permissions w.r.t. commands that have been pre-authorized.
- If a command fails because you're in the wrong subdirectory of a monorepo, cd to the correct one, then try again.
- Avoid using commands like `git -C /some/long/absolute/path`, instead cd to the directory first.
