# Owner Protocol

## Start and Assign

Call `delivery_start` once after the outcome and item graph are settled. Give each item a stable short ID, one cohesive outcome, and its direct dependencies. Keep approvals and unresolved judgment in thread prose; the graph records dependencies but does not enforce dispatch or merge order.

Use Amp's core `create_thread` for bounded workers, not a replacement coordinator or continuation owner. Include the delivery/item IDs, fixed owner thread ID, and instruction to load `delivery-cockpit:managing-deliveries` and follow its worker protocol. After creation succeeds, call `delivery_record` with a stable `eventId`, `kind: worker_started`, `state: active`, the returned `workerThread`, and the first `nextGate`.

If creation has an unknown outcome, discover whether the child exists before retrying; the ledger cannot deduplicate thread creation.

## Accept Reports

Before promoting a proposal:

1. Confirm Amp message metadata identifies the assigned worker and the proposal names this owner as its destination.
2. Verify the evidence and confirm the transition is material and its explicit state and next gate are correct.
3. Call `delivery_record` with the same event ID, delivery fields, and assigned `workerThread`.

Only the owner tool result updates the ledger. Exact promotion retries report no change. For uncertain sends, use [report recovery](recovery.md).

To replace a worker, first record `superseded` with the current `workerThread`, then `worker_started` for the replacement. Supersession clears the old assignment so later reports cannot use it.

## Record Decisions and Status

Use `delivery_record` for the owner's material decisions and verified transitions, including approval, merge, rollout, completion, or abandonment. Recording approval does not perform the action or create user authorization.

Call `delivery_status` at a material gate, before an approval request, or on a user status request—not as a polling loop.
