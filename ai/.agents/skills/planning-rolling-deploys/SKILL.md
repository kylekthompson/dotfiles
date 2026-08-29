---
name: planning-rolling-deploys
description: Plans and reviews mixed-version safety for schema changes, persisted messages, jobs, queues, and schema-cached processes. Use when current and target code can overlap during rollout, retry, or rollback.
---

# Plan Rolling Deploys

Make every reachable combination of code, schema, and persisted messages compatible. Database rows and queued work are contracts between versions that do not change at the same time.

## Establish the Deployment Model

Inspect repository deployment configuration, migration tooling, queue behavior, and operational documentation. Determine only facts that can change the plan:

- independently deployed web, API, worker, scheduler, and migration processes
- rollout order, process overlap, rollback window, and migration timing
- queue consumers and maximum scheduled, retry, dead-letter, or replay age
- schema caches, prepared statements, generated models, and restart behavior
- database engine, lock behavior, table size, and supported online DDL

Ask for missing material facts. Do not assume short normal deploy time prevents overlap. Name code versions `current` and `target`; name schema states `current`, `expanded`, and `contracted`.

First establish exposure and plausible harm. Separate implementation, merge, activation, and contraction gates. A deferred control needs an enforced protection and a clear re-trigger condition.

## Inventory Persisted Contracts

List each changed database object, job payload or type, queue, scheduled entry, outbox/event record, cache entry, serializer, and generated or cached schema. For each, record:

1. producers and writers
2. consumers and readers
3. persistence or retry lifetime
4. tolerance for missing or unknown fields
5. rollback behavior

Treat positional arguments, serialized class names, implicit defaults, and stale process caches as contract details.

## Prove Reachable Version Pairs

For persisted messages, prove:

| Producer | Consumer | Requirement |
| --- | --- | --- |
| current | current | baseline remains valid |
| current | target | target accepts existing messages |
| target | current | current accepts target messages, or an enforced gate prevents the pair |
| target | target | target behavior works |

For each process type, prove:

| Code | Schema | Requirement |
| --- | --- | --- |
| current | current | baseline works |
| current | expanded | rollback and overlapping current processes work |
| target | current | target works, or migration order enforces that this pair is unreachable |
| target | expanded | rollout and rollback work |
| current | contracted | impossible after contraction |
| target | contracted | final behavior works |

Add intermediate states when the real rollout has them. A pair is unreachable only when a mechanism prevents it, such as a completed gate, isolated queue, or disabled producer. Timing and operator intent are not mechanisms. Block the plan while a reachable pair is incompatible.

## Design Compatible Changes

### Database

- Prefer expand, migrate, activate, observe, then contract.
- Add compatible storage before code requires it unless target code tolerates its absence.
- Check engine-specific lock, rewrite, replication, and online-index behavior. Additive does not mean cheap.
- Treat renames as add-transition-remove. For incompatible types, use a shadow field, dual writes, backfill, read cutover, then contraction.
- Make backfills resumable, idempotent, bounded, observable, and safe with concurrent writes.
- Add required constraints only after existing and concurrent data satisfies them.
- Before dropping storage, deploy code that does not read or write it, account for generated queries and caches, and close the rollback window.
- Prefer compatibility that does not depend on coordinated cache invalidation. If restart is required, state what stops stale processes from receiving work.

### Jobs and persisted messages

- Deploy tolerant consumers before producers emit a new format.
- Prefer named additive optional fields with explicit defaults, after verifying serializer behavior.
- Do not change positional argument meaning in place. Use a payload version or new job type when meaning changes or readers are strict.
- Do not enqueue a new job type while an incompatible worker can reserve it; wait for rollout or isolate its queue.
- Retain old consumers until ready, scheduled, retry, dead-letter, replay, and rollback horizons have drained.
- Make overlapping old/new jobs idempotent at a stable business boundary.
- Test delayed jobs against the schema state in which they can execute.

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

Choose focused checks for the actual boundary:

- deserialize current payloads with target consumers and the reverse when reachable
- run current and target code against expanded schema
- start a current process, apply the migration, then exercise that same stale-cache process
- simulate rollback after expansion or activation
- enqueue before deploy and execute after deploy
- prove incompatible workers cannot reserve target jobs
- test retries, delays, duplicate delivery, and replay when relevant
- inspect generated SQL and measure migration locks when operational risk requires it

Do not require every check for every change. State uncertainty when topology, retention, cache behavior, or DDL semantics remain unverified.

## Report

Return a concise artifact:

1. verdict: `safe`, `safe with gates`, or `blocked`
2. deployment model and changed persisted contracts
3. reachable compatibility pairs and mechanisms that prevent others
4. rollout phases with measurable gates and rollback
5. contraction criteria
6. unresolved facts that can change safety
