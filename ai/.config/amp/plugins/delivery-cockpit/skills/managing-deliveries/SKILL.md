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

Keep delivery state in the owning Amp thread while workers produce bounded pull requests. The transcript is the event log. The plugin reconstructs its compact ledger from accepted tool results and appended child reports, so plugin memory is not authoritative.

## Start in the Owning Thread

1. Call `delivery_start` once after the outcome and item graph are settled.
2. Give each item a stable short ID, one cohesive outcome, and its direct item dependencies.
3. Keep approval policy and unresolved judgment in normal thread prose. Do not encode policy in the plugin.

The item graph records dependencies but does not enforce dispatch or merge order. The owning thread decides when a stacked successor is stable enough to start.

## Dispatch with Amp's Core Thread Tool

Use `create_thread`, not a plugin tool, so Amp remains responsible for project selection, executor placement, explicit agent mode, and authenticated report routing. After creation succeeds, call `delivery_record` with:

- a new stable `eventId`
- `kind: worker_started`
- `state: active`
- the returned `workerThread`
- the first material `nextGate`

Add this line to the worker prompt:

```text
Delivery report: load delivery-cockpit:managing-deliveries and call delivery_report for item <item-id> only when a listed material transition occurs. Reuse one eventId for retries.
```

Do not retry an uncertain `create_thread` call. Verify whether the child exists first. Child creation is deliberately outside the event ledger because the stable Plugin API has no idempotency key for that side effect.

## Record and Reconcile Material Events

Workers call `delivery_report` only for:

- draft pull request opened
- review changes complete
- blocker materially changed or cleared
- pull request ready for review or merge
- work stopped or superseded

Each report supplies the explicit resulting `state`, a concise `summary`, and the `nextGate`. The plugin does not infer them. By default, the report goes to the direct parent. After an owner handoff, a worker may set `ownerThread` only when the new owner's recovered ledger assigns that same worker thread to the item. The plugin suppresses a retry with the same `eventId`; a reused ID with different content is an error.

The owning thread calls `delivery_record` for its own material decisions and verified transitions, including explicit approval, merge, rollout, completion, or abandonment. Recording approval does not grant it and does not perform the approved action. Never infer approval from a state, report, or CI result.

Call `delivery_status` after a material report reaches a gate, before an approval request, or when the user asks for status. Do not call it as a polling loop.

## State, Reload, and Future Webhooks

Accepted events use stable event IDs and live in the full owning-thread transcript. A plugin reload clears only short-lived concurrency locks. The next tool call replays the transcript, so no recovery command or hidden file is needed. If an append result is uncertain, retry the same event ID; transcript reconciliation makes this safe.

The MVP does not register external webhooks. A future webhook adapter must:

1. register one stable `createWebhook` key for each owning thread and re-register that key after reload;
2. treat the capability URL as a credential and configure it outside the plugin;
3. use `WebhookEvent.id` to suppress Amp's at-least-once handler retry, and require a stable provider event ID plus `Idempotency-Key` to suppress separate provider retries;
4. validate and normalize the payload into the same material event schema;
5. use the same per-owner serialization, transcript lookup, and append path as `delivery_report` before returning success.

Do not add a webhook until its provider event schema, authentication, and owner-thread registration lifecycle are concrete.
