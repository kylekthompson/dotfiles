---
name: managing-deliveries
description: Maintains delivery ledgers and worker reports. Use when dispatching a settled multi-item plan, reconciling delivery state, or reporting an assigned worker result.
builtin-tools:
  - delivery_start
  - delivery_record
  - delivery_report
  - delivery_status
---

# Manage Delivery Events

The owning thread's accepted tool results are the delivery ledger. Worker messages are proposals until the owner verifies and promotes them. Ledger states do not enforce dependency order or confer authorization.

Read only the protocol for your role:

- [Owner](reference/owner.md): start the ledger, assign workers, accept evidence, and record decisions.
- [Worker](reference/worker.md): prepare and send a material report to the fixed owner.

Use stable event IDs. Exact retries are idempotent; conflicting reuse is an error. Preparation is not proof of message delivery. If a send outcome is unknown or a legacy proposal lacks a destination, read [report recovery](reference/recovery.md) before resending or replacing it.

Plugin reload reconstructs state from the connected transcript; no recovery file or command is needed. The in-memory overlay only bridges transcript visibility lag and is not authoritative.
