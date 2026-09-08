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

## Readiness Evidence

Use `revision: { head, base }` with full commit SHAs and `evidence` for independent implementation, CI, and owner source-review facts. Facts merge only on the same revision; recording a different head or base clears all prior readiness facts. Missing facts are unverified, not passing. Re-attest after a restack only after the proportional effective-diff review described in `delivering-changes`.

CI evidence includes `result` (`pending`, `passed`, or `failed`), an HTTPS `run` URL identifying the check set/attempt, and UTC ISO `observedAt` from the authoritative read. `passed` means all required checks passed, not one green job. Older observations and conflicting observations at the same timestamp are rejected. These are recorded snapshots: the plugin does not query GitHub or expire evidence on a timer. Verify current head, base, and required checks before releasing dependencies or merging, even on the same commit.

`delivery_accept` rejects a proposal whose revision differs from the recorded owner revision. Verify a legitimate new revision and record it as an owner decision before accepting the worker's new evidence. Do not move the ledger backward just to accept a stale proposal. Legacy reports without revisions can be accepted only before a revision is recorded; otherwise reconcile them as owner decisions with fresh evidence.

Only the owner records `evidence.ownerReview` (`pending`, `changes_requested`, or `complete`). Completing implementation and passing CI do not complete source review. Review against the repository's actual conventions and comparable implementations before marking it complete. `ready_for_review` means review can start, not that it passed. `approval_recorded` remains an audit of explicit user authorization, never an inferred consequence of any readiness fact.

Set `nextOwner` (`owner`, `worker`, `user`, or `external`) alongside each `nextGate`; name an external operator in the gate. Responsibility is not carried forward from the previous action. This identifies who must act, not an automatic dispatch or approval.

## Record Decisions and Status

Use `delivery_record` for the owner's material decisions and verified transitions, including approval, merge, rollout, completion, or abandonment. Recording approval does not perform the action or create user authorization.

For a changed prerequisite, record `kind: dependencies_changed` on the dependent item with its complete replacement `dependsOn` list (`[]` removes all), the reason in `summary`, and the resulting state and next gate. References and cycles are validated. Deferring or removing scope uses `stopped`; it retains the audit history and does not remove dependency edges. Explicitly revise each affected dependent and notify only its worker. The graph is evidence, not authorization or an automatic dispatch mechanism.

After accepting or recording a transition, act on the next authorized step or identify its concrete blocker and responsible party. Do not send a receipt acknowledgment unless the worker needs a decision, correction, or recovery confirmation. Do not echo the accepted event in prose just to prove it was recorded.

Call `delivery_status` at a material gate, before an approval request, or on a user status request—not after every event or as a polling loop. The table is the compact view; do not maintain a duplicate conversational checklist.
