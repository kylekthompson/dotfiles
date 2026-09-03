---
name: managing-deliveries
description: "Maintains a deterministic delivery ledger and reconciles material child-thread reports. Use with delivery-cockpit:delivering-changes or delivery-cockpit:coordinating-complex-rollouts after a multi-item plan is ready for dispatch."
builtin-tools:
  - delivery_start
  - delivery_record
  - delivery_report
  - delivery_status
---

# Manage Delivery Events

Keep delivery state in the owning Amp thread while workers produce bounded pull requests. The transcript is the event log. The plugin reconstructs its compact ledger only from owner-accepted tool results, so plugin memory is not authoritative. Worker messages are proposals until the owner promotes them.

## Start in the Owning Thread

1. Call `delivery_start` once after the outcome and item graph are settled.
2. Give each item a stable short ID, one cohesive outcome, and its direct item dependencies.
3. Keep approval policy and unresolved judgment in normal thread prose. Do not encode policy in the plugin.

The item graph records dependencies but does not enforce dispatch or merge order. The owning thread decides when a stacked successor is stable enough to start.

## Dispatch with Amp's Core Thread Tool

Use `create_thread` only for bounded workers, not for a coordinator, owner, relay, handoff, or continuation. Use Amp's core tool, not a plugin tool, so Amp remains responsible for project selection, executor placement, explicit agent mode, and report routing. After worker creation succeeds, call `delivery_record` with:

- a new stable `eventId`
- `kind: worker_started`
- `state: active`
- the returned `workerThread`
- the first material `nextGate`

Add this line to the worker prompt:

```text
Delivery report: for a draft PR, completed review changes, changed/cleared blocker, review/merge readiness, stop, or supersession, call delivery_report for item <item-id> with ownerThread <owning-thread-id>. Reuse one eventId, then send the exact prepared proposal once with send_thread_message.
```

Do not retry an uncertain `create_thread` call. Verify whether the child exists first. Child creation is deliberately outside the event ledger because the stable Plugin API has no idempotency key for that side effect.

## Record and Reconcile Material Events

Workers call `delivery_report` only for:

- draft pull request opened
- review changes complete
- blocker materially changed or cleared
- pull request ready for review or merge
- work stopped or superseded

Each report supplies `ownerThread`, the explicit resulting `state`, a concise `summary`, and the `nextGate`. The plugin does not infer them. Include the invocation thread's owner ID in every worker prompt, then send the exact content prepared by `delivery_report` with Amp's core `send_thread_message` tool. The owner ID stays fixed for the full delivery.

`delivery_report` reads only the connected worker transcript. It suppresses a normal retry with the same `eventId`; a reused ID with different content is an error. Sending the prepared content does not update the owner ledger.

When a proposal arrives, the owner must:

1. confirm the Amp message metadata identifies the worker assigned to that item;
2. confirm the transition is material and the explicit state and next gate are correct;
3. call `delivery_record` with the same event ID, delivery fields, and assigned `workerThread`.

Only that owner tool result enters the ledger. Exact duplicate proposals have no effect, and retrying the same promotion reports no change. If the message send result is unknown, ask the owner to check for the proposal before sending it again.

An item can have only one assigned worker. To replace it, first record `superseded` with the current `workerThread`, then record a new `worker_started` event for the replacement. A direct reassignment is rejected. Supersession clears the old assignment so later reports cannot use it.

The owning thread calls `delivery_record` for its own material decisions and verified transitions, including explicit approval, merge, rollout, completion, or abandonment. Recording approval does not grant it and does not perform the approved action. Never infer approval from a state, report, or CI result.

Call `delivery_status` after promoting a material report that reaches a gate, before an approval request, or when the user asks for status. Do not call it as a polling loop.

## State and Reload

Accepted events use stable event IDs and live in owner tool results in the full owning-thread transcript. Prepared proposals live in the worker transcript. The plugin serializes calls per thread and keeps newly returned events visible until the transcript reader catches up. This short-lived overlay is not authoritative. Plugin reload loses no authoritative state: the next tool call replays the connected transcript, so no recovery command or hidden file is needed. Exact duplicate owner events apply once; conflicting reuse of an event ID is an error.
