# Report Recovery

- **Prepared, never sent:** recover the same proposal with `delivery_report` and send it once. Reuse its event ID, payload, and destination.
- **Send outcome unknown:** ask the owner to check for the event before resending. Resend only if confirmed missing; do not resend confirmed delivery.
- **Received, not accepted:** the owner verifies attribution and evidence, then promotes the original event. Receipt alone does not update the ledger.
- **Already accepted:** exact promotion retries are idempotent. Do not invent another event ID to repeat the transition.
- **Legacy proposal without a destination:** it remains readable but cannot be retried through `delivery_report`. Reconcile the original send and owner acceptance first; use a new event ID only if a replacement is needed.

Changing a prepared proposal's content or destination while reusing its event ID is an error. The owner thread stays fixed for the delivery.

## Plugin Revision Compatibility

The current reader accepts existing version-1 start, record, and worker-report events. Legacy missing readiness fields remain unverified. Accepted references are durable `delivery_accept` tool results; retries can return the existing acceptance without contacting a retired worker.

Older plugin readers do not recognize `delivery_accept` results or `dependencies_changed` events and do not interpret structured readiness. Do not downgrade or mix owner plugin versions on a ledger that uses these features: an old reader can silently render incomplete state. Publication is a separate approval gate. Before activating the new protocol on an existing delivery, reload the owner and participating workers and verify the new tools and guidance are available. If that cannot be established, stop protocol writes and reconcile with the current reader; do not use an old status table to release work. Roll forward to the current reader rather than rewriting transcript history for rollback.

The plugin API provides user-message appends, not a documented atomic attributed send with an idempotency key. Notification therefore remains a core `send_thread_message` call with the existing uncertain-send recovery rules. A prepared event is recoverable from worker tool results, but is not proof that its notification reached the owner.
