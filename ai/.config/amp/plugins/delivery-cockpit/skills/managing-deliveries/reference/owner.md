# Owner Protocol

## Start and Assign

Call `delivery_start` once after the outcome and item graph are settled. Give each item a stable short ID, one cohesive outcome, and its direct dependencies. Keep approvals and unresolved judgment in thread prose; the graph records dependencies but does not enforce dispatch or merge order.

Use Amp's core `create_thread` for bounded workers, not a replacement coordinator or continuation owner. Include the delivery/item IDs, fixed owner thread ID, and instruction to load `delivery-cockpit:managing-deliveries` and follow its worker protocol. After creation succeeds, call `delivery_record` with a stable `eventId`, `kind: worker_started`, `state: active`, the returned `workerThread`, and the first `nextGate`.

Every implementation worker owns its branch and draft PR, including review amendments, CI fixes, and restacking through the requested stopping point. Confirm push and draft-PR authority before dispatch. Require a PR URL, current head, and verification evidence before accepting implementation readiness; bundles, patches, and local commits are not substitutes. Route amendments or blocked publication back to that worker instead of integrating or publishing its work in the parent. Review-only and rollout-verification workers do not need their own PRs.

If creation has an unknown outcome, discover whether the child exists before retrying; the ledger cannot deduplicate thread creation.

## Accept Reports

Before promoting a proposal:

1. Confirm Amp message metadata identifies the assigned worker and the proposal names this owner as its destination.
2. Verify the evidence and confirm the transition is material and its explicit state and next gate are correct.
3. Call `delivery_accept` with the delivery, item, and event IDs. It retrieves the proposal from the assigned worker's durable tool results, validates its source and destination, and copies its fields into an owner event. Do not copy markers or retype worker IDs.

Only the owner tool result updates the ledger. Exact promotion retries report no change. For uncertain sends, use [report recovery](recovery.md).

Acceptance verifies provenance, not code or live CI. If the proposal is stale or incorrect, do not accept it: record the current evidence as an owner decision with a new event ID, or request a corrected proposal. Use `delivery_record` for owner decisions, not as a fallback around rejected provenance. Older proposals without a destination require the legacy recovery procedure.

To replace a worker, first record `superseded` with the current `workerThread`, then `worker_started` for the replacement. Supersession clears the old assignment so later reports cannot use it.

## Record Decisions and Status

Use `delivery_record` for the owner's material decisions and verified transitions, including approval, merge, rollout, completion, or abandonment. Recording approval does not perform the action or create user authorization.

For a changed prerequisite, record `kind: dependencies_changed` on the dependent item with its complete replacement `dependsOn` list (`[]` removes all), the reason in `summary`, and the resulting state and next gate. References and cycles are validated. Deferring or removing scope uses `stopped`; it retains the audit history and does not remove dependency edges. Explicitly revise each affected dependent and notify only its worker. The graph is evidence, not authorization or an automatic dispatch mechanism.

Call `delivery_status` at a material gate, before an approval request, or on a user status request—not as a polling loop.
