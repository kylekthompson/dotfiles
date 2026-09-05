# Report Recovery

- **Prepared, never sent:** recover the same proposal with `delivery_report` and send it once. Reuse its event ID, payload, and destination.
- **Send outcome unknown:** ask the owner to check for the event before resending. Resend only if confirmed missing; do not resend confirmed delivery.
- **Received, not accepted:** the owner verifies attribution and evidence, then promotes the original event. Receipt alone does not update the ledger.
- **Already accepted:** exact promotion retries are idempotent. Do not invent another event ID to repeat the transition.
- **Legacy proposal without a destination:** it remains readable but cannot be retried through `delivery_report`. Reconcile the original send and owner acceptance first; use a new event ID only if a replacement is needed.

Changing a prepared proposal's content or destination while reusing its event ID is an error. The owner thread stays fixed for the delivery.
