---
name: delivering-changes
description: Delivers a completed multi-PR plan directly from its planning thread without a persistent coordinator. Use when the user asks to start, implement, or continue delivery from a settled plan.
compatibility: Requires Amp thread tools and authenticated GitHub access for pull-request checks.
---

# Deliver Changes Directly

Use the planning thread as the delivery owner. Create bounded implementation workers, receive their material reports, and keep approval and dependency decisions in one place. Do not add a pass-through coordinator.

## Confirm the Plan Is Ready

Before dispatch:

1. Confirm that the thread has a settled outcome, scope, acceptance checks, and enough decisions for the first work items.
2. Record a compact PR dependency graph and unresolved decisions. Do not rewrite the plan into another brief.
3. Verify the repository and remote default branch through authoritative sources.
4. Ask only about unresolved decisions that can change behavior, ownership, persisted compatibility, or shared risk.

If the work needs multi-repository control, several concurrent production or infrastructure actions, an operator handoff across days, or more than five active pull requests, use `coordinating-complex-rollouts` instead.

## Dispatch Bounded Workers

Keep at most five active workers and five open delivery pull requests. Parallelize independent work. For a stack, create a successor from its pushed direct predecessor.

Each worker owns investigation through one draft pull request. Use a short prompt:

```text
Outcome: <one bounded result and one draft PR>
Own: <repository paths/components and exclusions>
Base: <remote branch or pushed predecessor>
Plan: <planning-thread link and relevant item>
Hazard: <only item-specific risk>
Acceptance: <focused checks and observable result>
Report here: <draft PR, checks, blocker, or material manual action>
```

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

After a material report:

1. Inspect the changed pull request and direct dependent only when needed.
2. Review intent, changed boundaries, tests, and material risk. Do not repeat the worker's full repository investigation.
3. Request a focused amendment from the same worker when needed.
4. Dispatch newly unblocked work.
5. Tell the user the decision, blocker, review-ready result, approval request, or completion—not routine state.

## Verify at the Right Layer

Workers run focused checks while iterating. Run one broad local suite only when repository guidance requires it, the change has broad risk, or CI is not an adequate broad gate.

For a clean restack, record old and new base/head, `range-diff` verdict, changed-path verdict, and conflicts. Do not generate binary patch hashes or synthetic-tree proofs unless a conflict, generated artifact, merge anomaly, or audit requirement makes identity uncertain. Fresh pull-request CI is normally the authoritative post-restack check.

Keep output bounded. Prefer targeted ranges and selected fields. Do not print full diffs, successful test progress, manifests, raw CI payloads, or service logs when a concise verdict is sufficient.

## Use Short-Lived Specialists

Create a separate, bounded review worker only for an independent review that materially reduces risk. Give it the pull request, intent, changed boundaries, and exact concern. It returns findings, then stops.

Create a rollout verifier only after an approved merge requires external rollout evidence. It verifies the specific deployment, migration, health, or smoke gates and reports once. It does not become the implementation coordinator.

## Keep Shared Actions Explicit

Do not merge, deploy, publish, run production schema or data migrations, make production writes, or change shared infrastructure without explicit approval for that action. Approval for one action does not authorize the next.

After a stacked pull request merges, verify it and restack only its direct successor. Separate implementation, merge, activation, and contraction gates. Use `planning-rolling-deploys` for concrete persisted-contract rollout decisions.

Complete when work is merged or explicitly abandoned, approved rollout checks are complete, and no blocker or manual action is hidden. Return one digest with pull-request links, rollout verdicts, and remaining action.
