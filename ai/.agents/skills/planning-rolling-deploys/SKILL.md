---
name: planning-rolling-deploys
description: Plans and reviews rolling deploys for mixed-version safety across database migrations and background jobs. Use when changing schemas, job payloads, job signatures, handlers, queues, schema-cached workers, or any persisted contract that old and new application versions can read or write during rollout, retry, or rollback.
---

# Plan Rolling Deploys

Build a phased deploy plan in which every reachable mix of code, schema, and persisted messages remains compatible. Treat database rows and queued jobs as contracts between versions that do not change at the same time.

## Establish the Real Deployment Model

Inspect the repository, deployment configuration, migration tooling, queue framework, serializers, and operational documentation before recommending a sequence. Determine:

- which processes deploy independently, including web, API, worker, scheduler, and migration processes
- whether deploys replace processes gradually, restart them in place, or use blue-green traffic switching
- which process types can overlap and for how long
- whether migrations run before, during, or after application rollout
- whether a failed rollout can restore the prior application version against the new schema
- which worker versions poll each queue and what happens when a worker sees an unknown job type
- the maximum age of queued, scheduled, retried, dead-lettered, or replayed jobs
- whether processes cache column names, types, prepared statements, generated models, or serializer schemas at boot
- database engine and version, table size, lock behavior, replication, and supported online DDL operations

Ask only for facts that cannot be found and that can change the plan. Do not assume a deploy is safe because its normal duration is short. Retries, scheduled work, rollback support, paused workers, and long-running processes can extend version overlap.

Name versions as `current` and `target`, and schema states as `current`, `expanded`, and `contracted`. Avoid ambiguous terms such as “old” in the final plan.

## Inventory Persisted Contracts

List each changed contract and its producers and consumers:

- database tables, columns, types, defaults, constraints, indexes, views, triggers, and enums
- job type names, queue names, argument order, payload fields, defaults, serialization, and retry metadata
- scheduler entries, outbox records, events, cache entries, and replay or dead-letter stores
- ORM schema caches, prepared statements, generated clients, and deployed code outside the main rollout

For each contract, record:

1. who writes or enqueues it
2. who reads, executes, or deserializes it
3. how long persisted instances can survive
4. whether readers ignore unknown fields and tolerate missing fields
5. whether rollback restores an earlier reader or writer

Treat a positional job argument list, serialized class name, and implicit default as part of the wire format. A source-level method signature is not the full contract.

## Prove the Compatibility Matrix

Analyze every reachable producer-consumer pair for a changed job payload:

| Producer | Consumer | Required result |
| --- | --- | --- |
| current | current | Existing behavior remains valid |
| current | target | Target accepts queued current payloads |
| target | current | Current accepts target payloads, or this pair is prevented by an enforced gate or queue boundary |
| target | target | Target behavior is valid |

Analyze every reachable code-schema pair for each process type:

| Code | Schema | Required result |
| --- | --- | --- |
| current | current | Baseline works |
| current | expanded | Current code tolerates additive changes |
| target | current | Target tolerates the pre-migration state, or an enforced migration gate prevents this pair |
| target | expanded | Target can roll out and roll back safely |
| current | contracted | Must be impossible at and after contraction, including during rollback |
| target | contracted | Final behavior works |

Add intermediate schema or code states when the real sequence has more phases. Include a process that started before a migration and kept its cached schema after the migration. Do not use a freshly started console as proof that a long-lived process is safe.

A pair is unreachable only when a concrete mechanism prevents it, such as a completed rollout gate, a queue that current workers cannot poll, or a disabled producer flag. Timing assumptions and operator intent are not mechanisms.

## Design Database Changes

Prefer expand-migrate-contract. Make each phase independently deployable, observable, and safe for application rollback.

### Additive changes

- Add a nullable column or otherwise compatible database object before code requires it, unless target code explicitly tolerates its absence.
- Verify engine-specific lock and table-rewrite behavior for defaults, constraints, indexes, and type changes. “Additive” does not mean operationally cheap.
- Start writing new data only after every relevant writer and reader can tolerate it.
- Add required constraints after existing rows and concurrent writes satisfy them. Use non-blocking validation features when the engine supports them.

### Renames, removals, and type changes

- Treat a rename as add, transition, and remove. Do not rename a live column in one step when mixed code refers to both names.
- For an incompatible type change, add a shadow column, write both forms, backfill, switch reads, stop old writes, and contract later.
- Before dropping a column, deploy code that neither reads nor writes it. Account for ORM-generated `SELECT *`, partial writes, callbacks, and schema caches.
- When a framework supports an ignored-column declaration, deploy it before the drop and wait for every process without it to exit.
- Do not contract while application rollback can restore code that needs the removed shape.

### Backfills and data transitions

- Make backfills resumable, idempotent, bounded in batches, and safe with concurrent writes.
- Establish the required write path before the backfill so rows do not become stale behind it.
- Measure remaining rows and invalid rows. Gate read cutover and constraint validation on those measurements.
- Keep long-running data changes out of a blocking schema transaction when the framework and database allow it.

Treat schema-cache behavior as part of the design. If safety depends on cache refresh, specify which processes restart, in what order, and what prevents a stale process from receiving work. Prefer a compatibility phase that does not depend on coordinated cache invalidation.

## Design Background Job Changes

Queued payloads can outlive the deployment that created them. Make consumers tolerant before producers emit a new format.

### Change a payload or signature

- First deploy a consumer that accepts both current and target payloads while producers still emit the current form.
- Prefer named, additive, optional fields with explicit defaults. Verify that the actual serializer and consumer ignore unknown fields before relying on this pattern.
- Avoid changing positional argument count or meaning in place. It can cause arity errors or, worse, valid calls with changed semantics.
- When meaning changes or readers are strict, use an explicit payload version or a new job type. Keep translation at the consumer boundary.
- Activate target producers only after compatible consumers are everywhere that can reserve the job, or route target payloads to a queue consumed only by compatible workers.
- Retain compatibility until current payloads have left ready, scheduled, retry, dead-letter, and replay stores and the application rollback window has closed.

### Introduce a job type

- Deploy and verify the handler before any producer can enqueue the new type.
- If current workers can reserve a job whose class or type they do not know, do not enqueue while those workers poll the queue. Wait for their rollout to finish or use a separate queue that they cannot poll.
- Gate producer activation independently from code deployment. A target process starting does not prove all consumers are ready.
- Verify routing, retries, idempotency, uniqueness, priority, and dead-letter handling before activation.

### Remove or replace a job type

- Stop all producers and schedulers first.
- Keep the handler able to process old jobs through the maximum queue, schedule, retry, replay, and rollback horizon.
- Inspect all stores, not only the ready queue, before removing the handler or queue.
- Make replacement jobs safe when both job types can execute for the same logical work. Use a stable idempotency boundary where duplicate execution is possible.

Also test job code against the database state in which it can run. A delayed current-format job can execute with target code against a later schema.

## Build the Rollout in Enforced Phases

Use only the phases the change needs, but keep these responsibilities separate:

1. **Prepare compatibility:** Add tolerant readers, dual-write capability, ignored-column declarations, handlers, queue routing, flags, and observability. Keep new production behavior off.
2. **Expand storage:** Apply compatible schema additions and online structures. Verify lock time, replication health, and current-process behavior, including stale schema caches.
3. **Migrate data:** Run and measure backfills or conversions while compatible paths remain active.
4. **Activate producers and reads:** Enable target writes, enqueue formats, job types, or read paths only after their consumer and data gates pass.
5. **Observe and drain:** Wait for explicit health, data, queue, retry, schedule, and rollback-window conditions. Do not substitute a fixed sleep when state can be measured.
6. **Contract:** Remove compatibility code, old handlers, flags, queues, columns, or types only after no supported rollback or persisted work needs them.

For each phase, state:

- exact code versions, schema state, and worker groups that can coexist
- the compatibility invariant that the phase preserves
- commands or artifacts deployed and features activated
- entry gate and measurable exit gate
- verification signals and failure thresholds
- rollback action that is valid from that phase

Prefer roll-forward repair for a failed additive migration. Never propose an automatic destructive down migration without proving it preserves data and remains compatible with every live process.

## Verify the Risk, Not Only the Final State

Choose tests that exercise the actual boundaries:

- deserialize current payload fixtures with target consumers
- deserialize target payload fixtures with current consumers when that pair is meant to be supported
- start a process on the current schema, apply the migration, and exercise that same process with its stale cache
- run current and target code against the expanded schema
- simulate rollback to current code after expansion and activation
- enqueue before deployment and execute after deployment
- enqueue after target activation and prove a current worker cannot fail on it
- test retries, delayed schedules, duplicate delivery, and dead-letter replay when relevant
- inspect generated SQL for dropped or renamed columns and measure migration locks on representative data

Use framework and database documentation for version-specific claims. State uncertainty when production topology, queue retention, schema-cache behavior, or DDL semantics are not verified.

## Report the Plan

Return a concise deployment artifact with:

1. **Verdict:** `safe`, `safe with gates`, or `blocked`, with the main reason
2. **Deployment model:** process overlap, migration order, queue lifetime, cache behavior, and rollback window
3. **Changed contracts:** producers, consumers, and persistence horizon
4. **Compatibility matrices:** all reachable job and code-schema pairs; mark the mechanism that makes any pair unreachable
5. **Phased rollout:** deploy actions, activation actions, measurable gates, verification, and rollback for each phase
6. **Cleanup criteria:** exact evidence required before destructive changes
7. **Open risks:** only unresolved facts that can change safety

Block the plan when any reachable pair is incompatible. Do not call a plan zero-downtime-safe based only on the target code working with the final schema.
