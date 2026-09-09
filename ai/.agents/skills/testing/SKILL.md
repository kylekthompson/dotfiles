---
name: testing
description: Guides risk-focused test selection, test-first implementation, and characterization-first refactoring. Use when designing or reviewing tests, choosing a testing strategy, or following an explicit TDD request—not merely running an existing suite.
---

# Testing

Choose tests that distinguish correct behavior from plausible mistakes. Match the testing workflow to the change and the risk.

## What to Test

- Test observable outcomes through the smallest stable public boundary that proves the behavior. Give each test one reason to fail.
- Name a plausible mistake or competing interpretation and choose the smallest test that distinguishes it from the intended behavior. Prefer asymmetric values and examples on both sides of relevant boundaries.
- Start with the fastest test that gives useful design feedback. Add another layer only for a distinct risk:
  - Use module or domain tests for logic and edge cases.
  - Use integration tests for database, queue, filesystem, framework, serialization, or protocol semantics. Prefer real local infrastructure.
  - Use a small number of user-facing tests for critical journeys and wiring.
- Test representative boundaries and failures. Do not repeat the same combinations at every layer.
- Do not test private methods or incidental call sequences. Assert interactions only when the interaction or protocol is the behavior.
- Keep cheap, deterministic collaborators real. Use fakes or mocks for nondeterminism and remote, slow, or unavailable boundaries.

## Make Tests Challenge the Implementation

- Derive expected results from the contract, a worked example, or an independent reference—not from the implementation's output or the same production helper being tested. Resolve disagreements against that source before changing an expectation. Characterization intentionally records current behavior; it establishes preservation, not correctness.
- Choose fixtures that expose the suspected mistake: distinct items for ordering, another tenant's data for isolation, and non-palindromic input for reversal. More tests or assertions do not compensate for examples that let correct and incorrect implementations agree.
- When a high-risk test's protection is uncertain, temporarily introduce the specific plausible mistake, confirm that the test detects it, then restore the implementation. Use this selectively, not for every test. A failure against a stub alone does not establish sensitivity to a subtle bug.
- When input combinations or state sequences exceed useful example coverage, consider property-based or model-based tests using established repository tooling. Generate structured inputs that reach meaningful behavior and assert semantic results or invariants. No-crash checks alone do not establish correctness; round trips can hide matching bugs in both directions.

## Choose the Workflow

- **Explicit TDD request:** Follow red-green-refactor below. Confirm a meaningful failure before implementing the behavior.
- **New or changed behavior:** Prefer a focused test-first loop when the contract is clear. Resolve ambiguity before encoding an expectation; do not treat current output as the intended contract.
- **Bug fix:** Prefer a failing regression before the fix. When automation is impractical, capture diagnostic or characterization evidence and verify the same observation afterward. Disclose the limitation; this is not an automated red and does not satisfy an explicit test-first requirement.
- **Behavior-preserving refactor:** Characterize existing behavior, then stay green while changing structure.
- **Assessing existing code or tests:** Identify unprotected risks and add discriminating checks. Do not manufacture a red-green ceremony for behavior that already works.

### Red-Green-Refactor

Use tests to control one small behavior change at a time:

1. **Red:** Write a discriminating test for the next observable behavior. Run it and confirm that it fails because the behavior is missing or wrong. A setup or compilation error is not a useful red.
2. **Green:** Make the smallest production change that implements the stated behavior and passes the test, not merely its literal examples. Do not add unrelated behavior.
3. **Refactor:** Improve names, duplication, and design without changing behavior. Keep tests green after each small step.
4. Repeat with the next behavior.

### Refactoring Existing Behavior

A behavior-preserving refactor is green-green, not red-green:

1. Find tests at a stable boundary. If coverage is insufficient, add focused characterization tests that pass against current behavior, including quirks that are not approved to change.
2. If protection is uncertain, use the deliberate-break check above before relying on it.
3. Refactor in small steps and run the focused tests after each step. Change tests only when structure, not behavior, requires it.
4. If the desired outcome changes behavior, stop refactoring and start a red-green-refactor loop for that change.

## Verify the Protection

After implementing, inspect for risks the initial tests missed, such as ordering, boundaries, state transitions, or feature interactions. Add focused checks where a plausible incorrect implementation could still pass; use a new red-green loop for any missing or incorrect behavior they expose. Keep assertions at stable observable boundaries even when implementation details reveal which cases to test.

Use focused checks for affected boundaries. Run a broader local suite only for broad risk, repository requirements, or when CI cannot provide the authoritative check. Distinguish executed checks from pending CI and unverified risks.
