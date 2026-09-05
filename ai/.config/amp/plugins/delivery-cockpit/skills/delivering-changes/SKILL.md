---
name: delivering-changes
description: Delivers a settled multi-PR or parallel implementation plan in the invocation thread, including complex cross-repository rollouts. Use when the plan requires independently owned workstreams or the user explicitly requests delivery coordination. Do not use for ordinary single-PR implementation.
compatibility: Requires Amp thread tools; published pull-request checks require authenticated GitHub access.
---

# Deliver Changes

Keep the invocation thread responsible for the requested outcome, worker assignments, approvals, and dependencies. Delegate bounded work, not ownership of the delivery.

## Establish Scope and Authorization

1. Confirm the outcome, acceptance checks, and material decisions from the existing plan. Ask only about unknowns that can change the implementation or shared risk.
2. Choose the smallest cohesive work items. Prefer vertical capabilities over persistence/API/lifecycle layers; split schema expansion only when mixed-version safety requires it.
3. Name the requested stopping point: local implementation, draft PRs ready for review, approved merges, or verified rollout. Do not extend the task to later stages without authorization.
4. Verify repository identity and the remote default branch. Record direct dependencies and the publication authority available to each worker.

If one cohesive change fits one PR, work directly without a ledger or worker. Multiple commits or technical layers alone do not justify delegation. Parallel research alone does not trigger this workflow.

For independently owned implementation workstreams, load `delivery-cockpit:managing-deliveries` and call `delivery_start`. Keep policy and approvals in thread prose, not inferred from ledger states.

## Dispatch Bounded Work

Parallelize only independently owned work with clear write boundaries. Each worker owns a verifiable result, through one draft PR only when publication is authorized. Use the current thread for work that would otherwise be a serial handoff.

Give each worker:

```text
Outcome: <bounded result and requested stopping point>
Own: <repository, paths/components, exclusions>
Base: <origin branch, pushed predecessor, or explicitly transferred local work>
Plan: <owner thread link and relevant item>
Authorization: <exact shared actions approved, or local-only>
Acceptance: <focused checks and observable result>
Report: load delivery-cockpit:managing-deliveries; report material transitions for <delivery>/<item> to <owner thread ID> with a stable eventId.
```

Use core `create_thread`, following its executor and mode rules. After creation, record `worker_started` with the returned thread ID and first gate. If creation has an unknown outcome, discover whether the child exists before retrying.

For a stack, use the pushed direct predecessor when pushing is authorized. Otherwise transfer local work explicitly or keep dependent work in the same checkout; another thread cannot see an unpushed branch merely because its name was mentioned.

Once authorized, publish a coherent draft early. A moving predecessor blocks merge, not draft review. Workers must not expand their publication scope, merge, deploy, or create further PR-sized workers.

Let workers discover relevant skills. Include only item-specific hazards or required test-first acceptance steps, not copies of general agent policy.

## Reconcile Evidence

Ask workers to report material results, changed blockers, review readiness, or stop/supersession. Use the report preparation and recovery protocol in `managing-deliveries`. Raw messages are proposals, not accepted ledger state.

Before promoting a report:

1. Verify message attribution against the assigned worker, and confirm the proposal is addressed to this owner.
2. Inspect the changed code or PR and relevant checks. Evaluate intent, boundaries, and risk without repeating the worker's full investigation.
3. Record the verified result with its stable event ID and explicit next gate. If changes are needed, request a focused amendment from the same worker.
4. Release only directly affected dependencies. Render status at a gate or on request, not after every tool call.

Do not poll workers. Use their replies; check authoritative GitHub/CI state when a reported result reaches a gate or stale evidence could release a dependency. Scheduled monitoring requires an explicit user request.

## Verify Proportionately

Run focused checks during implementation. Use a broad local suite only for broad risk, repository requirements, or when CI cannot provide the authoritative broad check.

After a predecessor merges, restack only its direct successor. Record old/new base and head, a concise `range-diff` and changed-path verdict, and any conflicts. A clean, behavior-neutral restack relies on fresh CI; rerun local checks only when conflicts, generated artifacts, dependencies, or other effective-diff changes invalidate earlier evidence.

Independent review or rollout verification deserves a separate worker only when it materially reduces risk. Give it a bounded concern and acceptance evidence, not coordination ownership.

## Complex Rollouts

Use this section for cross-repository work, several production or infrastructure actions, or operator handoffs across days. It adds operational gates, not a second workflow or coordinator thread.

- Maintain one compact brief with scope, invariants, dependency graph, approvals, active operators, and next gates. Supersede it when a material decision changes and notify affected workers.
- Separate implementation, merge, activation, observation, and contraction. Use `planning-rolling-deploys` for changed persisted contracts and mixed-version safety.
- Give each active phase measurable entry/exit gates, health evidence, a valid rollback or roll-forward action, and an operator when manual work is required.
- Before releasing a dependency or requesting a shared action after inactivity, reconcile current PR heads, CI, merge, and rollout state. A missed callback does not justify restarting periodic polling.
- Accept an existing merge-triggered rollout as evidence when it covers the required migration, health, and smoke checks. Do not trigger another deployment merely to obtain a fresh result.

## Finish at the Requested Boundary

Pushing, opening a PR, merging, deploying, publishing, production writes, and shared infrastructure changes each require authorization for that action. Implementation intent alone does not authorize publication. Ledger state and green CI do not confer authorization; continue within explicit user approval already granted, and ask only when the next action exceeds it.

When context grows, replace the working checkpoint in this thread with the current ledger, heads, accepted evidence, approvals, blockers, and next gates. Preserve worker report routes rather than creating a continuation owner.

Complete when the requested stopping point is reached or the user stops the work. Draft PRs ready for review are a valid completed outcome when that is the request. Report delivered results, evidence, and remaining actions without silently proceeding to merge or rollout.

Use [reference/scenarios.md](reference/scenarios.md) to evaluate workflow changes; these are test cases, not extra runtime steps.
