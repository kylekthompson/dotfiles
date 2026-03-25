---
name: review
description: Use when asked to review code, diffs, pull requests, or implementation plans with a code-review mindset. Prioritize bugs, regressions, interface leaks, rollout risk, naming drift, and missing tests over style feedback, and return findings first with severity and file references.
---

# Review

Review like a skeptical peer. Optimize for catching real defects, not producing a long list of nits.

## Workflow

1. Establish the review scope before judging details.
   - Prefer the diff, changed files, or the named PR scope.
   - If the scope is fuzzy, review the smallest credible unit instead of wandering through the repo.
2. Reconstruct behavior before commenting on style.
   - Identify the changed invariant, affected boundaries, and the new failure modes.
   - Read enough surrounding code and tests to understand whether the change is actually safe.
3. Hunt for issues in priority order.
   - Incorrect behavior, data loss, security or privacy exposure, and concurrency hazards
   - Behavioral regressions at module, API, storage, or UI boundaries
   - Missing, weak, or misleading tests that leave important regressions unproven
   - Interface leaks, confused ownership, or domain-language drift that will make the next change harder
   - Performance, observability, migration, or rollback risks that matter in realistic operation
4. Challenge the evidence, not the author.
   - Prefer one solid finding over several speculative ones.
   - Drop style-only feedback unless it obscures behavior, violates an explicit project rule, or hides a larger design problem.
5. Close the review cleanly.
   - If there are no findings, say so explicitly.
   - Still call out residual risk, untested edges, or assumptions that would be worth validating.

## Defaults

- Default to reviewing changed code, but expand far enough to understand callers, callees, and tests.
- Treat a missing test as a finding only when it hides a meaningful regression risk or leaves a critical path unproven.
- Prefer findings that explain impact and failure mode, not just that something "looks wrong."
- Assume there may be intentional tradeoffs; verify them before criticizing.
- Ignore formatting and naming nits unless they create ambiguity, violate established domain language, or weaken the interface.
- Be especially skeptical of new abstractions, partial migrations, retry logic, error handling changes, and broad mocks.

## Findings

- Use severity labels when they help triage: `P0` critical, `P1` high, `P2` medium, `P3` low.
- A finding should point to a concrete defect, regression risk, or missing proof.
- Each finding should include the impacted file and line, what breaks, and why the current code does not adequately protect against it.
- If you are not confident enough to defend a finding, turn it into an open question instead.

## Response Shape

- Start with findings only, ordered by severity.
- For each finding, include severity, file and line reference, the risk, and the smallest credible fix direction.
- After findings, list open questions or assumptions that affected the review.
- End with a brief change summary only if it adds context.
- If there are no findings, say `No findings.` and then note residual risks or testing gaps.
