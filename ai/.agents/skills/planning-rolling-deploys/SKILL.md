---
name: planning-rolling-deploys
description: Plans and reviews mixed-version safety for schema changes, persisted messages, jobs, queues, and schema-cached processes. Use when current and target code can overlap during rollout, retry, or rollback.
---

# Plan Rolling Deploys

Make every reachable combination of code, schema, and persisted messages compatible. Database rows and queued work are contracts between versions that do not change at the same time.

## Establish the Deployment Model

Inspect repository deployment configuration and operational documentation for the changed contract. Determine only facts that can change the plan:

- independently deployed web, API, worker, scheduler, and migration processes
- rollout order, process overlap, rollback window, and migration timing

Ask for missing material facts. Do not assume short normal deploy time prevents overlap. Name code versions `current` and `target`; name schema states `current`, `expanded`, and `contracted`.

First establish exposure and plausible harm. Separate implementation, merge, activation, and contraction gates. A deferred control needs an enforced protection and a clear re-trigger condition.

## Inventory Persisted Contracts

Inventory only changed contracts and their affected dependencies, not every persistence mechanism in the system. For each, record:

1. producers and writers
2. consumers and readers
3. persistence or retry lifetime
4. tolerance for missing or unknown fields
5. rollback behavior

Read the applicable reference for contract-specific inventory, design, and checks:

- [Database contracts](reference/database.md) when schema, storage, or schema-cached processes change.
- [Jobs and persisted messages](reference/messages.md) when payloads, producers, consumers, queues, or delivery semantics change.

Read both only when the change crosses both contract types, including delayed work that may execute against a changed schema.

## Prove Reachable Version Pairs

For changed persisted-message contracts, prove:

| Producer | Consumer | Requirement |
| --- | --- | --- |
| current | current | baseline remains valid |
| current | target | target accepts existing messages |
| target | current | current accepts target messages, or an enforced gate prevents the pair |
| target | target | target behavior works |

For changed database contracts, prove for each affected process type:

| Code | Schema | Requirement |
| --- | --- | --- |
| current | current | baseline works |
| current | expanded | rollback and overlapping current processes work |
| target | current | target works, or migration order enforces that this pair is unreachable |
| target | expanded | rollout and rollback work |
| current | contracted | impossible after contraction |
| target | contracted | final behavior works |

Add intermediate states when the real rollout has them. A pair is unreachable only when a mechanism prevents it, such as a completed gate, isolated queue, or disabled producer. Timing and operator intent are not mechanisms. Block the plan while a reachable pair is incompatible.

## Build Measurable Phases

Use only phases the change needs:

1. **Prepare:** tolerant readers/consumers, dual-write capability, handlers, queue routing, flags, and observability.
2. **Expand:** compatible schema and online structures.
3. **Migrate:** measured backfill or conversion.
4. **Activate:** target writers, producers, jobs, or reads after their compatibility gates pass.
5. **Observe and drain:** measure health, invalid data, queues, retries, schedules, and rollback window.
6. **Contract:** remove compatibility only after no supported rollback or persisted work needs it.

For each active phase, state the coexistence invariant, action, entry and exit gates, signals and thresholds, and valid rollback or roll-forward action. Prefer roll-forward repair after a failed additive migration. Do not use a destructive down migration without proving data and mixed-version safety.

## Verify the Risk

Choose focused checks from the applicable contract reference to prove reachable pairs, activation gates, and rollback safety. Do not require every check for every change. State uncertainty when topology, retention, cache behavior, or DDL semantics remain unverified.

## Report

Return a concise artifact:

1. verdict: `safe`, `safe with gates`, or `blocked`
2. deployment model and changed persisted contracts
3. reachable compatibility pairs and mechanisms that prevent others
4. rollout phases with measurable gates and rollback
5. contraction criteria
6. unresolved facts that can change safety
