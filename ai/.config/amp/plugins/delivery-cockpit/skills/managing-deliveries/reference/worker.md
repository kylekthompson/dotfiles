# Worker Protocol

For an implementation assignment, own your branch and draft PR through the requested stopping point: implement, verify, push, open the draft, address review and CI failures, and restack as needed within granted authority. Return your PR URL, current head, and verification evidence, not a Git bundle, patch, or commits for the parent to integrate or publish. If publication authority or access is missing, report a blocker and retain ownership; do not silently switch to a bundle handoff. Review-only and rollout-verification assignments need evidence, not an artificial PR.

Use `delivery_report` for a draft PR, completed review changes, a materially changed or cleared blocker, review/merge readiness, stop, or supersession—not routine progress.

Supply the assigned delivery/item IDs, fixed `ownerThread`, stable `eventId`, explicit resulting `state`, concise evidence in `summary`, and `nextGate`. Include `pullRequest` once your PR exists and identify the verified head in the evidence. The plugin reads only this worker's transcript and does not infer these fields or contact the owner.

Send the short prepared notification between the delimiters with Amp's core `send_thread_message` to that owner if it has not yet been sent. Do not copy the event marker; the owner retrieves it by reference from your tool results. Preparation is not proof of delivery, and sending does not update the owner ledger. Reuse the event ID and payload for retries; do not resend a confirmed delivery.

If the send outcome is unknown or a legacy proposal lacks a destination, read [report recovery](recovery.md) before resending or replacing it.
