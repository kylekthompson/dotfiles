---
name: delivering-changes
description: Coordinates settled plans with independently owned implementation workstreams. Use for parallel delivery or explicit delivery coordination, not ordinary single-PR work.
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

Use core `create_thread`, following its executor and mode rules. Use `managing-deliveries` for assignment records and report reconciliation.

For a stack, use the pushed direct predecessor when pushing is authorized. Otherwise transfer local work explicitly or keep dependent work in the same checkout; another thread cannot see an unpushed branch merely because its name was mentioned.

Once authorized, publish a coherent draft early. A moving predecessor blocks merge, not draft review. Workers must not expand their publication scope, merge, deploy, or create further PR-sized workers.

Let workers discover relevant skills. Include only item-specific hazards or required test-first acceptance steps, not copies of general agent policy.

## Reconcile Evidence

Inspect changed code or PRs and relevant checks before accepting results. Evaluate intent, boundaries, and risk without repeating the worker's full investigation. Request focused amendments from the same worker, and release only directly affected dependencies after accepting evidence through `managing-deliveries`.

Do not poll workers. Use their replies; check authoritative GitHub/CI state when a reported result reaches a gate or stale evidence could release a dependency. Scheduled monitoring requires an explicit user request.

## Verify Proportionately

Run focused checks during implementation. Use a broad local suite only for broad risk, repository requirements, or when CI cannot provide the authoritative broad check.

After a predecessor merges, restack only its direct successor. Record old/new base and head, a concise `range-diff` and changed-path verdict, and any conflicts. A clean, behavior-neutral restack relies on fresh CI; rerun local checks only when conflicts, generated artifacts, dependencies, or other effective-diff changes invalidate earlier evidence.

Independent review or rollout verification deserves a separate worker only when it materially reduces risk. Give it a bounded concern and acceptance evidence, not coordination ownership.

## Complex Rollouts

For cross-repository work, several production or infrastructure actions, or operator handoffs across days, read [complex rollouts](reference/rollouts.md). It adds operational gates, not another coordinator.

## Finish at the Requested Boundary

Pushing, opening a PR, merging, deploying, publishing, production writes, and shared infrastructure changes each require authorization for that action. Implementation intent alone does not authorize publication. Ledger state and green CI do not confer authorization; continue within explicit user approval already granted, and ask only when the next action exceeds it.

When context grows, replace the working checkpoint in this thread with the current ledger, heads, accepted evidence, approvals, blockers, and next gates. Preserve worker report routes rather than creating a continuation owner.

Complete when the requested stopping point is reached or the user stops the work. Draft PRs ready for review are a valid completed outcome when that is the request. Report delivered results, evidence, and remaining actions without silently proceeding to merge or rollout.

Use [reference/scenarios.md](reference/scenarios.md) to evaluate workflow changes; these are test cases, not extra runtime steps.
