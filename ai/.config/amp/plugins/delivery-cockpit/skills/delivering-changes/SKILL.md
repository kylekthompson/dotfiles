---
name: delivering-changes
description: Coordinates settled plans through worker-owned pull requests. Use for parallel delivery or explicit delivery coordination, not ordinary single-PR or local-only work.
compatibility: Requires Amp thread tools; published pull-request checks require authenticated GitHub access.
---

# Deliver Changes

Keep the invocation thread responsible for the requested outcome, worker assignments, approvals, and dependencies. Delegate bounded work, not ownership of the delivery.

## Establish Scope and Authorization

1. Confirm the outcome, acceptance checks, and material decisions from the existing plan. Ask only about unknowns that can change the implementation or shared risk.
2. Choose the smallest cohesive work items. Prefer vertical capabilities over persistence/API/lifecycle layers; split schema expansion only when mixed-version safety requires it.
3. Name the requested stopping point: draft PRs ready for review, approved merges, or verified rollout. Local-only implementation is not a delivery-cockpit workflow; keep it in the current thread. Do not extend the task to later stages without authorization.
4. Verify repository identity and the remote default branch. Record direct dependencies and the publication authority available to each worker.

If one cohesive change fits one PR, work directly without a ledger or worker. Multiple commits or technical layers alone do not justify delegation. Parallel research alone does not trigger this workflow.

Every implementation child owns its branch and pull request. Before dispatch, ensure the user has authorized pushing branches and opening draft PRs. If that authority is missing, ask for it; do not substitute local-only children that return bundles for parent integration. A request to use delivery-cockpit establishes PR ownership, not permission to bypass shared-action approval.

For independently owned implementation workstreams, load `delivery-cockpit:managing-deliveries` and call `delivery_start`. Keep policy and approvals in thread prose, not inferred from ledger states.

## Dispatch Bounded Work

Parallelize only independently owned work with clear write boundaries. Each implementation worker owns one cohesive result through its own draft PR, including implementation, verification, publication, review amendments, CI fixes, and any restacking through the requested stopping point. The parent reviews and coordinates; it must not collect bundles, patches, or commits to assemble or publish workers' PRs. Use the current thread for work that would otherwise be a serial handoff.

Give each worker:

```text
Outcome: <bounded result and requested stopping point>
Own: <repository, paths/components, exclusions; own branch and draft PR through the stopping point>
Base: <origin branch or pushed direct predecessor>
Plan: <owner thread link and relevant item>
Authorization: <approved branch pushes and draft PR creation; any further exact shared actions approved>
Acceptance: <focused checks and observable result>
Deliver: <your draft PR URL, head commit, and verification evidence; not a bundle or patch for parent integration>
Report: load delivery-cockpit:managing-deliveries; report material transitions for <delivery>/<item> to <owner thread ID> with a stable eventId.
```

Use core `create_thread`, following its executor and mode rules. Use `managing-deliveries` for assignment records and report reconciliation.

Use coordinator judgment to choose the lightest capable worker mode rather than automatically inheriting the coordinator's mode. Typically choose `low` for small, well-defined changes with clear acceptance checks, and `medium` for broader implementation or moderate ambiguity. Reserve `high` for difficult reasoning or substantial uncertainty that justifies the extra cost. Set `agent_mode` explicitly when permitted by `create_thread`; honor explicit user mode choices and its restrictions on `ultra`, plugin, and custom modes. Do not ask the user to choose a mode for each worker when the choice is already delegated to the coordinator.

For a stack, use the pushed direct predecessor. If it is not available yet, wait for that dependency rather than transferring bundles for parent integration; another thread cannot see an unpushed branch merely because its name was mentioned.

Once authorized, publish a coherent draft early. A moving predecessor blocks merge, not draft review. Workers must not expand their publication scope, merge, deploy, or create further PR-sized workers.

Let workers discover relevant skills. Include only item-specific hazards or required test-first acceptance steps, not copies of general agent policy.

## Reconcile Evidence

Inspect each worker's PR, current head, and relevant checks before accepting implementation results. A bundle, patch, or local commit is not a completed implementation handoff; send the worker back to publish its own draft PR. If publication is blocked, record the blocker and keep PR ownership with the worker rather than taking over publication. Evaluate intent, boundaries, and risk without repeating the worker's full investigation. Request focused amendments from the same worker, and release only directly affected dependencies after accepting evidence through `managing-deliveries`.

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
