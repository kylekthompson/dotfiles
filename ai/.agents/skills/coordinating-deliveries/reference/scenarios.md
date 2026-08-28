# Coordination Scenarios

Use these examples when reviewing changes to the coordination workflow. Each scenario states the minimum safe result, not extra runtime procedure.

## Stale Brief

State: worker A received checkpoint v2. A later decision delta publishes `DELIVERY-INDEX` v3, which supersedes v2 and removes an activation gate.

Expected: worker A uses the dispatched marker for a targeted newest-index lookup, not a full transcript read. It validates v3 back to checkpoint v2, reports v3, and follows the replacement gate. After five deltas, the coordinator publishes a new checkpoint with historical evidence links. A gap or competing latest record stops delegation and approvals until authoritative reconciliation produces one corrected checkpoint.

## Missed Callback

State: a worker does not report that CI completed or a pull request merged. The coordinator wakes after prolonged inactivity to request approval for a dependent action.

Expected: the pre-approval bounded sweep reads authoritative pull-request head, CI, and merge state, updates the ledger, and processes only direct dependents. It does not restart periodic polling or reread every worker thread.

## Fresh Coordinator Handoff

State: an implementation phase is complete, no production write is in flight, and coordinator context is large.

Expected: the predecessor publishes a consolidated brief and new checkpoint, current ledger, approval state, and next gate. The successor resolves that checkpoint with targeted lookups and explicitly accepts ownership before reports are redirected and the predecessor is archived. There is never more than one dispatching coordinator.
