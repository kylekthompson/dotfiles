# Database Contracts

## Inventory

Inspect migration tooling and affected database objects, generated models, queries, and cached schemas. Identify readers/writers, schema caches, prepared statements, restart behavior, database engine, lock behavior, table size, and supported online DDL where they affect the plan.

## Design

- Prefer expand, migrate, activate, observe, then contract.
- Add compatible storage before code requires it unless target code tolerates its absence.
- Check engine-specific lock, rewrite, replication, and online-index behavior. Additive does not mean cheap.
- Treat renames as add-transition-remove. For incompatible types, use a shadow field, dual writes, backfill, read cutover, then contraction.
- Make backfills resumable, idempotent, bounded, observable, and safe with concurrent writes.
- Add required constraints only after existing and concurrent data satisfies them.
- Before dropping storage, deploy code that does not read or write it, account for generated queries and caches, and close the rollback window.
- Prefer compatibility that does not depend on coordinated cache invalidation. If restart is required, state what stops stale processes from receiving work.

## Focused Checks

- Run current and target code against expanded schema.
- Start a current process, apply the migration, then exercise that same stale-cache process.
- Simulate rollback after expansion or activation.
- Inspect generated SQL and measure migration locks when operational risk requires it.
- If delayed work can execute against changed storage, also read [Jobs and persisted messages](messages.md) and test the reachable message/schema combinations.
