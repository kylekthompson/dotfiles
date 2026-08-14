---
name: tdd
description: Guides test-first implementation with red-green-refactor and characterization-first refactoring. Use for features, bug fixes, behavior-preserving refactors, and test-strategy decisions.
---

# TDD

Use tests to control one small behavior change at a time.

## Red-Green-Refactor

For new or changed behavior:

1. **Red:** Name the next observable behavior. Write the smallest test for it, run the test, and confirm that it fails for the expected reason. A setup or compilation error is not a useful red.
2. **Green:** Make the smallest production change that passes the test. Do not add untested behavior.
3. **Refactor:** Improve names, duplication, and design without changing behavior. Keep tests green after each small step.
4. Repeat with the next behavior.

For a bug, first reproduce it with a failing regression test. Push back on production changes made before a meaningful red.

## What to Test

- Test observable outcomes through the smallest stable public boundary that proves the behavior. Give each test one reason to fail.
- Start with the fastest test that gives useful design feedback. Add another layer only for a distinct risk:
  - Use module or domain tests for logic and edge cases.
  - Use integration tests for database, queue, filesystem, framework, serialization, or protocol semantics. Prefer real local infrastructure.
  - Use a small number of user-facing tests for critical journeys and wiring.
- Test representative boundaries and failures. Do not repeat the same combinations at every layer.
- Do not test private methods or incidental call sequences. Assert interactions only when the interaction or protocol is the behavior.
- Keep cheap, deterministic collaborators real. Use fakes or mocks for nondeterminism and remote, slow, or unavailable boundaries.

## Refactoring Existing Behavior

A behavior-preserving refactor is green-green, not red-green:

1. Find tests at a stable boundary. If coverage is insufficient, add focused characterization tests that pass against current behavior, including quirks that are not approved to change.
2. If a test's protection is uncertain, make a temporary deliberate break, confirm that the test fails, then undo the break.
3. Refactor in small steps and run the focused tests after each step. Change tests only when structure, not behavior, requires it.
4. If the desired outcome changes behavior, stop refactoring and start a red-green-refactor loop for that change.

Before completion, run the relevant broader suite. State the next test and why its boundary is appropriate when the test sequence is not obvious.
