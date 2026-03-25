# TDD Examples

Use these examples as anchors for sequencing and test choice, not as rigid templates.

## 1. Pure Domain Rule

Situation: add a rule that rejects subscription downgrades while an unpaid invoice is open.

Prefer:

1. Write a failing module or domain test against the subscription policy boundary.
2. Implement the smallest rule change to make it pass.
3. Refactor while the module suite stays green.

Do not:

- start with a controller test if the real decision lives in the domain
- mock internal policy collaborators just to isolate one method

## 2. Persistence Change

Situation: add a new repository query and transaction rule for invoice settlement.

Prefer:

1. Write a failing module or domain test that drives the settlement behavior.
2. Implement enough code to pass that test.
3. Add an integration test against the local test database that proves the query and transaction semantics.

Do not:

- replace the repository with a mock and call it done
- rely on the integration test alone if the decision logic still deserves a fast loop

## 3. Async Feature

Situation: when an order is paid, enqueue fulfillment and notify shipping.

Prefer:

1. Start with a module or domain test for the decision to trigger fulfillment.
2. Add an integration test using the local queue or worker setup.
3. Add a user-facing test if the feature is exposed through an API or UI flow.

Allow:

- interaction assertions around the emitted command or event contract
- mocks for subprocess or clock behavior if retries or timing matter

## 4. Legacy Bugfix

Situation: a production bug duplicates refunds under a specific retry path in older code.

Prefer:

1. Reproduce the bug with a failing regression test at the highest reliable seam.
2. Make the smallest fix that turns the regression green.
3. Add narrower tests only if they make the retry policy or deduping rule easier to protect.

Do not:

- begin by refactoring the legacy module into a cleaner shape without first proving the bug
- convert the fix into a mock-heavy unit test that no longer demonstrates the original failure mode
