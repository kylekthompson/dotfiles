---
name: delivering-changes
description: Delivers a settled plan with multiple pull requests or parallel workstreams directly from its planning thread. Use when the user explicitly asks to start or continue multi-PR delivery. Do not use for ordinary single-PR implementation.
compatibility: Requires Amp thread tools and authenticated GitHub access for pull-request checks.
---

# Deliver Changes Directly

Use the invocation thread as the delivery owner for the full delivery. Create bounded implementation workers, receive their material reports, and keep approval and dependency decisions in one place. Never create or hand off to a coordinator, relay, owner, or continuation thread.

## Confirm the Plan Is Ready

Before dispatch:

1. Confirm that the thread has a settled outcome, scope, acceptance checks, and enough decisions for the first work items.
2. Record a compact PR dependency graph and unresolved decisions. Do not rewrite the plan into another brief.
3. Verify the repository and remote default branch through authoritative sources.
4. Ask only about unresolved decisions that can change behavior, ownership, persisted compatibility, or shared risk.

If the outcome fits one pull request, implement it normally in the current thread. Do not load this workflow or create delivery workers.

If the work needs multi-repository control, several concurrent production or infrastructure actions, an operator handoff across days, or more than five active pull requests, use `delivery-cockpit:coordinating-complex-rollouts` in this thread instead.

For the remaining direct multi-PR delivery, load `delivery-cockpit:managing-deliveries` and call `delivery_start` with the settled outcome, cohesive items, and direct dependencies. Keep policy and unresolved judgment in normal thread prose.

## Dispatch Bounded Workers

Keep at most five active workers and five open delivery pull requests. Parallelize independent work. For a stack, create a successor from its pushed direct predecessor.

Prefer independently deployable vertical slices. One pull request should deliver one cohesive capability through the persistence, domain, API, and lifecycle layers it needs. Do not split a capability into persistence/API/lifecycle pull requests only because those are technical layers. Split when capabilities can ship independently or a concrete compatibility, rollout, ownership, or review-risk boundary requires it. A schema-first expansion is separate only when mixed-version safety requires storage to deploy before dependent behavior.

Each worker owns investigation through one draft pull request. Use a short prompt:

```text
Outcome: <one bounded result and one draft PR>
Own: <repository paths/components and exclusions>
Base: <remote branch or pushed predecessor>
Plan: <planning-thread link and relevant item>
Hazard: <only item-specific risk>
Mode: <low for docs-only; medium by default; high only for named difficult design/safety decision>
Acceptance: <focused checks and observable result>
Delivery report: for a draft PR, completed review changes, changed/cleared blocker, review/merge readiness, stop, or supersession, call delivery_report for <delivery ID>/<item ID> with ownerThread <planning thread ID>; reuse one eventId, then send the exact prepared proposal once with send_thread_message
```

Set `agent_mode` on every created thread. Use `low` for docs-only work and `medium` by default. Use `high` only when the prompt names the difficult design or safety decision that requires it. Never rely on mode inheritance.

Create workers with Amp's core `create_thread` tool. After creation succeeds, call `delivery_record` with `kind: worker_started`, `state: active`, the returned worker thread ID, and its first material gate. Do not retry an uncertain create call; verify whether the child exists first.

Do not copy the whole plan, generic agent policy, repository guidance, or routine safety disclaimers. Add a safety warning only when omission could plausibly permit an irreversible action before the worker reads the plan.

Open and push a draft PR as soon as the change is coherent enough for review or parallel feedback. A moving predecessor blocks merge, not draft publication. A worker must not merge, deploy, create another pull request, or delegate PR-sized work.

Let workers discover applicable skills. Name one only when its trigger is already proven and it protects a material constraint:

- `planning-rolling-deploys` for an actual persisted contract or mixed-version decision
- `design-interface` for an unresolved ownership or public-boundary decision
- `ubiquitous-language` for a domain-term decision, glossary change, or terminology audit
- `rwx-sandbox` only after verifying `.rwx/sandbox.yml` exists

Do not name `tdd` for routine implementation. Put a required failing regression or test-first step in acceptance criteria directly.

## Receive Material Reports

Ask each worker to report once for these transitions:

- draft pull request opened
- review changes complete
- blocker materially changed
- pull request ready for review or merge
- work stopped or superseded

Workers report directly to this planning thread. Do not poll workers, schedule checks, or add a relay thread. Query GitHub or CI only when a report reaches a gate, the user asks for status, or stale state can release a dependency. Use one watcher or one later query, not both plus repeated polling.

`delivery_report` prepares and deduplicates a material proposal in the worker's connected transcript. The worker sends its exact prepared content here with Amp's core `send_thread_message` tool. Raw messages never update the ledger.

After a material report:

1. Confirm the Amp message metadata identifies the worker assigned to the item and the proposal is a listed material transition.
2. Call `delivery_record` with the proposal's stable event ID, explicit state, summary, next gate, pull request when present, and assigned `workerThread`. The tool rejects a mismatched worker. Only this promotion updates the ledger.
3. Inspect the changed pull request and direct dependent only when needed.
4. Review intent, changed boundaries, tests, and material risk. Do not repeat the worker's full repository investigation.
5. Request a focused amendment from the same worker when needed.
6. Dispatch newly unblocked work.
7. Tell the user the decision, blocker, review-ready result, approval request, or completion—not routine state.

Call `delivery_status` after promotion reaches a gate or when the user asks for status, not after every tool call.

## Verify at the Right Layer

Workers run focused checks while iterating. Run one broad local suite only when repository guidance requires it, the change has broad risk, or CI is not an adequate broad gate.

For a clean restack, record old and new base/head, `range-diff` verdict, changed-path verdict, and conflicts. Almost never rerun local checks after a stacked-PR rebase; rely on fresh pull-request CI. Run a local check only when conflicts, generated artifacts, dependency changes, or another material effective-diff change invalidates earlier evidence. Do not generate binary patch hashes or synthetic-tree proofs unless a merge anomaly or audit requirement makes identity uncertain.

Keep output bounded. Prefer targeted ranges and selected fields. Do not print full diffs, successful test progress, manifests, raw CI payloads, or service logs when a concise verdict is sufficient.

## Use Short-Lived Specialists

Create a separate, bounded review worker only for an independent review that materially reduces risk. Set its mode explicitly: `medium` by default, or `high` only for a named difficult design or safety decision. Give it the pull request, intent, changed boundaries, and exact concern. It returns findings, then stops.

Create a medium-mode rollout verifier only after an approved merge requires external rollout evidence. It verifies the specific deployment, migration, health, or smoke gates and reports once. It does not become the implementation coordinator.

## Keep Ownership Through Growing Context

When context grows or a major phase ends, publish one compact replacement checkpoint in this thread. Include the pull-request graph and current heads, worker report routes, settled decisions, approval state, accepted checks, blockers, next gate, and current `delivery_status` ledger. Continue in this thread without reconstructing the ledger or redirecting workers. Do not create a coordinator or continuation thread.

## Keep Shared Actions Explicit

Do not merge, deploy, publish, run production schema or data migrations, make production writes, or change shared infrastructure without explicit approval for that action. Approval for one action does not authorize the next.

After a stacked pull request merges, verify it and restack only its direct successor. Separate implementation, merge, activation, and contraction gates. Use `planning-rolling-deploys` for concrete persisted-contract rollout decisions.

Complete when work is merged or explicitly abandoned, approved rollout checks are complete, and no blocker or manual action is hidden. Return one digest with pull-request links, rollout verdicts, and remaining action.

Use [reference/scenarios.md](reference/scenarios.md) when changing this skill or resolving an ambiguous delivery rule.
