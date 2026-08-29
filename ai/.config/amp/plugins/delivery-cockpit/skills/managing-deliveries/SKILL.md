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

Keep delivery state in the owning Amp thread while workers produce bounded pull requests. The transcript is the event log. The plugin reconstructs its compact ledger from accepted tool results and authenticated child report messages, so plugin memory is not authoritative.

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
Delivery report: load delivery-cockpit:managing-deliveries and call delivery_report for item <item-id> with ownerThread <owning-thread-id> only when a listed material transition occurs. Then use send_thread_message once to send the exact prepared content to that owner. Reuse one eventId for retries.
```

Do not retry an uncertain `create_thread` call. Verify whether the child exists first. Child creation is deliberately outside the event ledger because the stable Plugin API has no idempotency key for that side effect.

## Record and Reconcile Material Events

Workers call `delivery_report` only for:

- draft pull request opened
- review changes complete
- blocker materially changed or cleared
- pull request ready for review or merge
- work stopped or superseded

Each report supplies `ownerThread`, the explicit resulting `state`, a concise `summary`, and the `nextGate`. The plugin does not infer them. Include the current owner ID in every worker prompt, then send the exact content prepared by `delivery_report` with Amp's core `send_thread_message` tool. After a handoff, replace `ownerThread` with the new owner's ID.

`delivery_report` reads only the connected worker transcript. It suppresses a normal retry with the same `eventId`; a reused ID with different content is an error. The owning ledger accepts the report only when an earlier owner event assigned that worker thread to the item. If the message send result is unknown, ask the owner to check the ledger before sending the same prepared content again.

The owning thread calls `delivery_record` for its own material decisions and verified transitions, including explicit approval, merge, rollout, completion, or abandonment. Recording approval does not grant it and does not perform the approved action. Never infer approval from a state, report, or CI result.

Call `delivery_status` after a material report reaches a gate, before an approval request, or when the user asks for status. Do not call it as a polling loop.

## State, Reload, and Future Webhooks

Accepted events use stable event IDs and live in the full owning-thread transcript. Prepared reports also live in the worker transcript. Plugin reload loses no authoritative state: the next tool call replays the connected transcript, so no recovery command or hidden file is needed. Duplicate delivery of the same report adds no ledger transition because replay deduplicates its stable event ID.

The MVP does not register external webhooks. A future webhook adapter must:

1. register one stable `createWebhook` key for each owning thread and re-register that key after reload;
2. treat the capability URL as a credential and configure it outside the plugin;
3. use `WebhookEvent.id` to suppress Amp's at-least-once handler retry, and require a stable provider event ID plus `Idempotency-Key` to suppress separate provider retries;
4. validate and normalize the payload into the same material event schema;
5. append the normalized marker to the connected owning thread before returning success; if the webhook handler cannot access that connected owner, use an explicit authenticated transport adapter rather than plugin memory.

Do not add a webhook until its provider event schema, authentication, and owner-thread registration lifecycle are concrete.
