# Worker Protocol

Use `delivery_report` for a draft PR, completed review changes, a materially changed or cleared blocker, review/merge readiness, stop, or supersession—not routine progress.

Supply the assigned delivery/item IDs, fixed `ownerThread`, stable `eventId`, explicit resulting `state`, concise evidence in `summary`, and `nextGate`. The plugin reads only this worker's transcript and does not infer these fields or contact the owner.

Send the exact prepared proposal with Amp's core `send_thread_message` to that owner if it has not yet been sent. Preparation is not proof of delivery, and sending does not update the owner ledger. Reuse the event ID and payload for retries; do not resend a confirmed delivery.

If the send outcome is unknown or a legacy proposal lacks a destination, read [report recovery](recovery.md) before resending or replacing it.
