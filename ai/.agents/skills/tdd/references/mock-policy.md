# Mock Policy

Use this file when deciding whether a dependency should stay real, be replaced with a fake, or be mocked directly.

## Default Stance

- Start from almost no mocks.
- Prefer asserting on outcomes through a public seam before asserting on who called whom.
- Treat mock-heavy tests as suspicious until the mocked boundary is justified.

## Preferred Order

1. Real collaborator
   - Use the real thing when it is local, deterministic enough, and cheap to run.
   - This is the default for in-process domain code.
2. Real local infrastructure
   - Use local databases, queues, workers, and other self-hosted dependencies when they can run in the development environment.
   - Prefer this over mocking persistence or async behavior.
3. Fake
   - Prefer a fake for vendor-style integrations when a realistic local stand-in exists and keeps the test honest.
4. Mock or stub
   - Use direct mocks for nondeterminism, process boundaries, or boundaries that do not have a credible local fake.

## Safe To Mock

- Clocks and time sources
- Randomness and ID generators
- Filesystem operations when the filesystem behavior itself is not under test
- Subprocess invocation
- Vendor or remote service clients when a fake is not worth the setup
- Notification, analytics, or similar edge adapters where the contract matters more than the implementation

## Prefer Real Or Fake

- Internal domain services and module collaborators
- Repositories backed by a local test database
- Queues, workers, and async infrastructure that can run locally
- Serialization, query behavior, transaction boundaries, and retry behavior that depend on real infrastructure semantics

## Interaction Tests

Interaction tests are acceptable when the call pattern is the behavior under test, not just an implementation detail.

Good cases:

- Verifying an external request or emitted event contract
- Verifying retries, deduping, backoff, or ordering rules
- Verifying coordination across major architectural seams when that orchestration is intentional and stable

Weak cases:

- Verifying that one private helper called another
- Locking in internal call counts with no business meaning
- Replacing state-based assertions with spy assertions just because they are easier to write

## Red Flags

- The test mocks several internal collaborators just to isolate one method.
- The assertions describe the implementation steps better than the business outcome.
- Refactors that preserve behavior would still force widespread test rewrites.
- The mock exists only to avoid running cheap local infrastructure.
