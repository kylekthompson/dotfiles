---
name: coordinating-complex-rollouts
description: Coordinates a complex, long-running delivery across repositories, more than five active PRs, several production or infrastructure actions, or operator handoffs. Use when these conditions require separate operational ownership or the user explicitly asks for a coordinator.
compatibility: Requires Amp thread tools and authenticated GitHub access for pull-request checks.
---

# Coordinate Complex Rollouts

Move a complex delivery through reviewable draft pull requests and, when authorized, merge and rollout. Own cross-repository or long-running operational state that cannot stay safely in the planning thread. For ordinary delivery from a settled plan, use `delivery-cockpit:delivering-changes` instead.

## Start One Coordinator

If this thread is already the coordinator, skip this section.

1. Confirm that the current thread has an implementation-ready plan and that separate coordination is justified by cross-repository work, more than five active pull requests, several production or infrastructure actions, operator handoff across days, or an explicit user request. Otherwise, stop and use `delivery-cockpit:delivering-changes`.
2. Create one medium-mode orb thread in the owning project. Coordination is mostly state reconciliation; use a bounded high-mode worker or advisor only for a concrete unresolved design or safety decision. Give the coordinator the planning-thread link, desired outcome, approval limits, and instructions to follow **Run the Delivery** below.
3. Return the coordinator link. The planning thread does not also implement or relay routine status.

Set `agent_mode: medium` explicitly when creating the coordinator. Never rely on inherited mode.

## Run the Delivery

### Record one compact brief

Read the planning thread once. Publish one brief with:

- outcome, scope, non-goals, settled decisions, and acceptance checks
- safety or compatibility invariants and unresolved decisions
- PR dependency graph, merge order, and rollout gates
- a compact ledger: `item | worker | PR | dependency | state | next gate`

Load `delivery-cockpit:managing-deliveries` and call `delivery_start` with the settled outcome, cohesive items, and direct dependencies. The plugin transcript is the event log for the compact ledger. Keep approval policy and unresolved judgment in the brief, not plugin state.

Publish a new consolidated brief only when a decision, scope boundary, dependency, or gate changes. Edit or supersede the source of truth instead of producing a chain of routine status records. Workers read the brief and their assigned item, not the full planning transcript.

Verify repository identity, default branch, pull-request state, and external identifiers through their authoritative service. Ask the user only about decisions that can change behavior or create shared risk.

### Dispatch for fast draft PRs

Keep at most five active workers and five open delivery pull requests. Parallelize independent work, including stable successors in a stack. Branch a stacked successor from its pushed predecessor.

Prefer independently deployable vertical slices. Keep one cohesive capability and its required persistence, domain, API, and lifecycle behavior in one pull request. Do not create technical-layer stacks unless a concrete compatibility, rollout, ownership, or review-risk boundary requires the split. A schema-first expansion is separate only when mixed-version safety requires storage to deploy before dependent behavior.

Each worker owns one bounded result and one draft pull request. Use a short prompt:

```text
Outcome: <result and one draft PR>
Own: <paths/components and exclusions>
Base: <remote branch or pushed predecessor>
Brief: <coordinator link and item>
Hazard: <only item-specific risk>
Mode: <low for docs-only; medium by default; high only for named difficult design/safety decision>
Acceptance: <focused checks and observable result>
Delivery report: wait until the owner confirms this assignment is recorded; then load delivery-cockpit:managing-deliveries and call delivery_report for <delivery ID>/<item ID> with ownerThread <coordinator thread ID> only on a listed material transition; send the exact prepared content once with send_thread_message; reuse one eventId for retries
```

Set `agent_mode` on every created thread. Use `low` for docs-only work and `medium` by default. Use `high` only when the prompt names the difficult design or safety decision that requires it. Never rely on mode inheritance.

Create workers with Amp's core `create_thread` tool. After creation succeeds, call `delivery_record` with `kind: worker_started`, `state: active`, the returned worker thread ID, and its first material gate. Then use `send_thread_message` once to tell the worker its assignment is recorded and reporting is enabled. Do not retry an uncertain create call; verify whether the child exists first.

Do not repeat generic agent policy, repository guidance, the full plan, or irreversible-action warnings in every prompt. Add a safety warning only when the brief cannot prevent a plausible shared action.

Open and push a draft PR as soon as the change is coherent enough for review or parallel feedback. A moving predecessor blocks merge, not draft publication. Keep successor work draft until its dependency merges, then restack only the direct successor.

Let workers discover applicable skills. Name a skill in the prompt only when its trigger is already proven and the worker would otherwise miss a material constraint:

- use `planning-rolling-deploys` for an actual persisted contract or mixed-version decision
- use `design-interface` for an unresolved ownership or public-boundary decision
- do not name `tdd` for routine implementation; state a required test-first acceptance step directly
- use `ubiquitous-language` only for a domain-term decision, glossary change, or terminology audit
- use `rwx-sandbox` only after verifying `.rwx/sandbox.yml` exists

### Verify once at the right layer

Workers run focused checks while iterating. Use one broad local suite only when repository guidance requires it, the change has broad risk, or CI is not an adequate broad gate. Do not run the same broad suite before and after a behavior-neutral rebase.

For a clean restack, record the old and new base/head, `range-diff` verdict, changed-path verdict, and whether conflicts occurred. Almost never rerun local checks after a stacked-PR rebase; rely on fresh pull-request CI. Run a local check only when conflicts, generated artifacts, dependency changes, or another material effective-diff change invalidates earlier evidence. Do not generate binary patch hashes, synthetic trees, or byte-for-byte proofs unless a merge anomaly or regulated audit requirement makes patch identity uncertain.

Keep tool output bounded. Query only fields needed for the current gate. Do not print full diffs, manifests, CI definitions, raw provider payloads, or successful test progress. On failure, capture the concise error and the smallest useful log range.

### Reconcile only material events

Workers report these transitions once:

- draft PR opened
- review changes complete
- blocker materially changed
- PR ready for review or merge
- work stopped or superseded

Do not poll workers. Ask them to report. Query GitHub or CI only when a reported event reaches a gate, the user asks for status, or stale state can release a dependency. Use one watcher or one later query, not a watch plus repeated status calls.

`delivery_report` prepares and deduplicates a material proposal in the worker's connected transcript. The worker sends its exact prepared content here with Amp's core `send_thread_message` tool. Raw messages never update the ledger.

On each material event:

1. Confirm the Amp message metadata identifies the worker assigned to the item and the proposal is a listed material transition.
2. Call `delivery_record` with the proposal's stable event ID, explicit state, summary, next gate, pull request when present, and assigned `workerThread`. The tool rejects a mismatched worker. Only this promotion updates the ledger.
3. Inspect the changed worker and pull request, plus a direct dependent only when needed.
4. Resolve review work, blockers, and direct-successor restacks.
5. Record any coordinator decision with `delivery_record`, then render the compact ledger when the event reaches a gate.
6. Dispatch newly unblocked work.
7. Tell the planning thread only about a decision, material blocker, review-ready PR, explicit approval request, or completion.

The coordinator reviews intent, changed boundaries, tests, and risk. It does not repeat every worker read or reproduce evidence already stored in the PR.

### Keep approval and rollout explicit

Do not merge, deploy, publish, run production schema or data migrations, make production writes, or change shared infrastructure without explicit approval for that action. Approval for one action does not authorize the next.

Separate implementation, merge, activation, and contraction gates. Require rollout evidence only for environments and behavior that the repository actually deploys. For persisted contracts, load `planning-rolling-deploys` when the concrete rollout decision becomes active and preserve its compatibility requirements.

After a merge, verify the merge and release only the direct successor. A successful merge-triggered rollout can satisfy the rollout gate when it includes the required migration, health, and smoke checks; do not rediscover or restate that policy for each PR.

### Finish or hand off

At a safe phase boundary, start a fresh medium-mode coordinator only when context growth is causing repeated history reads or missed state. Set `agent_mode: medium` explicitly. Give it one consolidated brief, the current `delivery_status` ledger, approval state, and next gate. After it accepts ownership, it loads `delivery-cockpit:managing-deliveries`, starts the same item graph, records each current non-pending item state and worker assignment with new handoff event IDs, and compares the rendered ledger. Send each redirected worker an assignment-recorded message with the new coordinator thread ID for future `delivery_report.ownerThread` calls. Redirect reports and stop the predecessor only after that explicit recovery succeeds.

Complete when work is merged or explicitly abandoned, approved rollout checks are complete, and no blocker or manual action is hidden. Send one final digest with PR links, rollout verdicts, and remaining action, then archive the coordinator.

Use [reference/scenarios.md](reference/scenarios.md) only when changing this skill or resolving an ambiguous coordination rule.
