# Test Selection

Use this file to decide where to start the TDD loop and which additional test layers are required before a change is done.

## Starting Rule

- Default first failing test: module or domain seam through a public API.
- Exception: for bugfixes or hard-to-isolate legacy code, start with a regression test at the highest reliable seam.

## Required Layers By Change Type

### 1. Pure Logic

- Start at the module or domain seam.
- Stay there unless framework wiring or external boundaries are part of the requirement.
- Avoid integration or user-facing tests that only repeat the same logic.

### 2. Storage Or Async Touch

- Start with a module or domain test that drives the decision logic.
- Add an infra-backed integration test that exercises the real local database, queue, worker, or framework boundary.
- Keep both layers: fast behavior coverage plus boundary proof.

Use this category for changes involving:

- queries or persistence rules
- transactions or locking
- serialization or deserialization
- jobs, queues, workers, or async orchestration
- framework behavior that could invalidate a pure module test

### 3. User-Facing Feature

- Start with a module or domain test unless the design cannot be expressed there.
- Before calling the feature done, add a user-facing test at the request, CLI, or UI layer.
- Default user-facing scope: one happy path and one key failure.
- Keep most edge cases below the entrypoint.

### 4. Bugfix Or Legacy Change

- Reproduce the bug first with a failing regression test at the highest reliable seam.
- Fix the bug.
- Add narrower tests only when they improve change safety, clarify design, or reduce future debugging cost.

## Choosing The Highest Reliable Seam

Pick the highest seam that still keeps the feedback loop fast and local enough to drive design.

Prefer:

- module API over private helper
- domain command over controller when the controller adds little value
- integration seam over pure module test when the semantics depend on real infrastructure

Avoid:

- top-level tests for every case
- unit tests that only mirror private implementation structure
- skipping the fast seam just because a high-level test already exists
