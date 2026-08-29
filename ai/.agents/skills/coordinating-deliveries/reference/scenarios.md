# Coordination Scenarios

Use these examples when reviewing changes to the coordination workflow. Each scenario states the minimum safe result, not extra runtime procedure.

## Changed Brief

State: worker A started from the current brief. A later product decision changes an activation gate.

Expected: the coordinator publishes one consolidated replacement brief and sends the changed decision to affected workers. Workers do not reread the planning transcript. Conflicting source-of-truth records stop affected delegation and approvals until the coordinator reconciles them.

## Moving Stacked Base

State: a successor is coherent and testable, but its predecessor has not merged.

Expected: the worker pushes a draft pull request against the predecessor branch. The moving base blocks merge, not review. After the predecessor merges, only this direct successor restacks. A clean restack records a concise range-diff and changed-path verdict, then relies on fresh pull-request CI.

## Missed Callback

State: a worker does not report that CI completed or a pull request merged. The coordinator wakes after prolonged inactivity to request approval for a dependent action.

Expected: the pre-approval bounded sweep reads authoritative pull-request head, CI, and merge state, updates the ledger, and processes only direct dependents. It does not restart periodic polling or reread every worker thread.

## Fresh Coordinator Handoff

State: an implementation phase is complete, no production write is in flight, and coordinator context is large.

Expected: the predecessor publishes one consolidated brief, current ledger, approval state, and next gate. The successor explicitly accepts ownership before reports are redirected and the predecessor is archived. There is never more than one dispatching coordinator.
