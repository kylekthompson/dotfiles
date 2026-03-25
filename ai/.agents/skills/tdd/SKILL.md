---
name: tdd
description: Use during implementation work to drive changes test-first, choose the right mix of module, integration, and user-facing tests, and decide when mocking is acceptable, especially for features, bugfixes, storage or async behavior, and test-strategy requests.
---

# TDD

Drive implementation from tests. Push back when code is being written before the next failing test is clear.

## Workflow

1. Classify the change before coding.
   - Pure logic inside a stable module or domain boundary
   - Storage or async behavior
   - User-facing feature or request flow
   - Bugfix or hostile legacy change
   - If the classification or best starting seam is unclear, interrogate that before proposing code.
2. Pick the first failing test at the highest fast seam.
   - Default to the module or domain seam through a public API.
   - For bugfixes or legacy code, start with a failing regression test at the highest reliable seam.
3. Run a strict red-green-refactor loop.
   - Name the next failing test before proposing implementation.
   - Make the smallest change that turns that test green.
   - Refactor only while the suite stays green.
4. Prove upward before declaring the change complete.
   - Add infra-backed integration coverage for any storage or async touch.
   - Add a user-facing test for most features: happy path plus one key failure.
5. Challenge weak testing plans.
   - Push back on code-first implementation.
   - Push back on mock-heavy tests that freeze internal structure.
   - Push back on slow top-level-only suites when a faster module test should drive the design first.

## Defaults

- Optimize for fast feedback first, then add higher-fidelity proof where the boundary semantics matter.
- Prefer module or domain tests that exercise behavior through public entrypoints, not private helpers.
- For storage or async changes, require both module-level behavior tests and integration tests against real local infrastructure when practical.
- For user-facing features, keep most combinatorics below the entrypoint and use the user-facing layer to prove wiring and critical behavior.
- For legacy work, capture the bug first, then narrow the seam only if it makes the fix safer or easier to evolve.

## Mocking

- Default to almost no mocks.
- Accept mocks or controllable doubles for clocks, randomness, filesystem, subprocesses, and similar nondeterministic or process-boundary dependencies.
- Prefer fakes for vendor boundaries when practical, but mocking vendors is acceptable.
- Prefer real local databases, queues, and workers when they can run locally.
- Allow interaction tests at external boundaries and at major internal architectural seams when the coordination itself is intentional behavior.

## Response Shape

- Start with the next test to write and why that seam is the right starting point.
- State which additional test layers are required before the change is done.
- Name any acceptable doubles and any collaborators that should stay real.
- If the proposed plan is code-first or over-mocked, say so directly and redirect to a better test sequence.

## References

- Read `references/test-selection.md` when deciding which test layers to add.
- Read `references/mock-policy.md` when the right double or interaction assertion is unclear.
- Read `references/examples.md` when you need concrete examples of feature work, storage-touching changes, or legacy bugfixes.
