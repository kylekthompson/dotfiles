# Complex Rollout Coordination Scenarios

Use these examples when reviewing changes to the coordination workflow. Each scenario states the minimum safe result, not extra runtime procedure.

## Coordinator Not Justified

State: one repository has eight independent implementation pull requests, one ordinary merge order, and no production write or operator handoff in progress.

Expected: use `delivery-cockpit:delivering-changes` in the invocation thread and dispatch all ready bounded workers without a fixed worker or pull-request limit. Do not create a coordinator thread.

## Changed Brief

State: worker A started from the current brief. A later product decision changes an activation gate.

Expected: the coordinator publishes one consolidated replacement brief and sends the changed decision to affected workers. Workers do not reread the planning transcript. Conflicting source-of-truth records stop affected delegation and approvals until the coordinator reconciles them.

## Moving Stacked Base

State: a successor is coherent and testable, but its predecessor has not merged.

Expected: the worker pushes a draft pull request against the predecessor branch. The moving base blocks merge, not review. After the predecessor merges, only this direct successor restacks. A clean restack records a concise range-diff and changed-path verdict, then relies on fresh pull-request CI without local reruns unless a material effective-diff change invalidates earlier evidence.

## Missed Callback

State: a worker does not report that CI completed or a pull request merged. The coordinator wakes after prolonged inactivity to request approval for a dependent action.

Expected: the pre-approval bounded sweep reads authoritative pull-request head, CI, and merge state, records one material reconciliation event with a stable event ID, and processes only direct dependents. It does not restart periodic polling or reread every worker thread.

## Large Coordinator Context

State: an implementation phase is complete and coordinator context is large.

Expected: the invocation thread publishes one consolidated replacement brief with the rendered delivery ledger, approval state, worker assignments, and next gate. It remains the coordinator and keeps all worker report routes unchanged. It does not create a coordinator or continuation thread.

## Duplicate Material Report

State: a worker prepares and sends a proposal across a plugin reload. The same proposal is delivered at least once and may arrive more than once.

Expected: raw proposals do not update the ledger. The coordinator verifies the assigned worker from Amp message metadata and promotes the proposal once with `delivery_record`. Retrying that stable event ID reports no change. A different payload with the same ID stops promotion as a conflict.

## Fast Worker Proposal

State: a worker reaches a material transition before the coordinator has recorded its assignment.

Expected: the raw proposal cannot poison replay. The coordinator records the assignment before promoting the proposal; no acknowledgement round trip is required.
