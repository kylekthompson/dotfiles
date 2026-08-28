---
name: coordinating-deliveries
description: Starts and guides a delivery coordinator child thread for a completed planning thread. Use only when the user explicitly invokes this skill or explicitly asks to start or spin up a coordinator thread from the current planning thread. Do not use for ordinary planning, implementation, delegation, shipping, or rollout requests.
compatibility: Requires Amp thread tools and authenticated GitHub access for pull-request checks.
---

# Coordinate Deliveries

Move a completed plan through implementation, review, merge, and verified rollout. Keep one compact source of truth so each layer carries only the detail it needs.

## Start the Coordinator

If this prompt identifies this thread as the coordinator and gives a planning thread, skip this section.

1. Confirm that the current thread contains a completed plan. If the user asked to update a plan, clarify whether that means thread text, a repository file, an issue, or a pull request. Record a decision delta or minimal amendment; do not recreate the plan.
2. Create one high-mode orb thread in the current project. Give it the planning-thread link, ownership through verified rollout, and instructions to load this skill, follow **Run the Delivery**, and report material updates directly to the planning thread. It must not create another coordinator except for a controlled phase handoff.
3. Return its link. Do not also implement, delegate, or echo routine status from the planning thread.

## Run the Delivery

### Establish one source of truth

Read the planning thread once. Post a compact, versioned **Delivery brief** with:

- outcome, scope, non-goals, decisions, and acceptance checks
- global invariants and approval gates
- persisted-contract or migration hazards and mixed-version gates
- PR DAG, dependency reasons, unblock events, and targeted evidence links

Maintain one ledger with `item | worker | PR | base/dependency | status | next gate`; keep implementation, ancestry, merge, and rollout dependencies distinct. The stable pointer is the coordinator link plus its current marker. Workers use a targeted lookup, not a transcript reread, for the newest `DELIVERY-INDEX`: `brief vN <link> | supersedes <index-link>`. Each brief or delta publishes the next record. After five deltas or at a phase boundary, publish a consolidated checkpoint that supersedes the normal-use chain and links to historical evidence. Workers validate only to that checkpoint and state the version used.

For a changed decision, post a small versioned delta that marks the prior assumption or gate superseded; omit it from the next consolidated brief. Prompts and reports link to `DELIVERY-INDEX` instead of copying the brief. The planning thread wins if it conflicts. If the index is ambiguous, conflicting, or unresolved, stop delegation and approval actions, reconcile authoritative state, and publish one corrected checkpoint rather than competing deltas.

Verify repositories, default branches, and referenced identifiers with their authoritative services; never infer identity from name or sequence. Resolve material uncertainty before dispatch; decide routine reversible details locally.

### Dispatch bounded work

Keep at most five active workers and five open delivery pull requests. Drafts count; the coordinator does not. Reconcile both limits before dispatch, prioritize the critical path, then fill capacity with implementation-ready work.

Parallelize work unless workers can edit the same paths or branch, depend on an unsettled decision or contract, or can produce incompatible migration changes. A shared project or later merge/rollout dependency does not require serial implementation. Start stable successor work early and keep it draft when a later gate blocks merge. For a stack, branch from the pushed direct predecessor. Do not create placeholder workers; record the blocker and unblock event for idle work.

Create each worker in the exact project that owns the work. Use this prompt shape:

```text
Outcome: <one bounded result and one draft PR>
Own: <repository and paths/components; state exclusions>
Base/dependency: <remote base, predecessor branch/SHA, and unblock event>
Brief: <coordinator pointer and current index marker; target newest DELIVERY-INDEX and this item>
Unique hazards: <only hazards specific to this item>
Skills: <minimum role-specific set, normally zero to two>
Acceptance: <checks and observable result>
Report: <outcome, PR, checks, blocker/manual action, evidence links>
```

The worker owns investigation through one verified, pushed draft pull request and can change only that branch and pull request. It must not merge, deploy, create another pull request, or delegate PR-sized work. Require one `send_thread_message` report before idle. Put a safety rule in the prompt only if omission could permit an irreversible action before the brief is read.

Load skills only where their decision is made. Do not load coordination guidance again in the planning parent. Select worker skills by role, not possibility:

- `planning-rolling-deploys` for a persisted contract, schema/data migration, queue, job payload, or mixed-version rollout
- `design-interface` for an unsettled module, service, adapter, or public API boundary
- `tdd` for a behavior change when test-first work is useful
- `ubiquitous-language` when `DOMAIN.md` governs changed domain terms
- `rwx-sandbox` only when the repository uses RWX for required commands

Do not send broad “just in case” bundles. Load rollout guidance progressively when a concrete rollout decision is active. A worker can add a skill after finding its trigger.

Workers fetch origin and branch from the fetched remote default, or the fetched predecessor for a stack. Do not pin an unstacked dispatch-time SHA. Rebase before opening the pull request; after opening, rebase only to restack. Compare the effective pre/post-rebase diff. Store detailed SHAs, range-diff, and output once in a durable, reviewer-accessible PR comment/check, worker message, or repository artifact—never an executor-local file or ephemeral output. Send only its link, verdict, and material change. Re-run checks only when the changed diff justifies it; otherwise use pull-request CI.

Use a separate worker for each additional pull request. A bounded research task can own none.

### Reconcile and report deltas

Workers report only a material transition: pull request opened or ready, blocker changed, review changes complete, work superseded, or task complete. They send one compact report to the coordinator and do not copy it to the planning thread or other workers. Their final reply can state only that the report was sent. Do not poll, schedule checks, or use `wait_for_threads`; worker messages are the signal.

On each wake-up, reconcile one batch:

1. Collect all new worker, user, and pull-request events.
2. Inspect only changed threads and pull requests plus direct dependents. GitHub is authoritative.
3. Resolve changed blockers, review work, retirements, and restacks.
4. Update the ledger once, then fill capacity with newly ready work.
5. Check only gates reached by these changes. Do a full audit at phase boundaries and before completion.

Run a bounded authoritative sweep before approval requests, at phase boundaries and completion, and after inactivity only if stale state could change capacity, release a dependency, affect an external gate, or alter approval. Inspect active delivery pull-request heads and CI/merge state, plus that phase's external gates. Do not restore routine polling.

Keep a worker available while its pull request can need changes. Archive it only after GitHub confirms merge, or after it confirms that canceled work stopped; ask before closing an unauthorized pull request. Restore it only for new pull-request work. Never archive the planning thread.

Classify outbound updates as `FYI`, `review-ready`, `decision-needed`, or `material-state-change`. Keep FYI updates in the ledger. Send the planning thread one initial dispatch report, then only review-ready work, decisions, material blockers/scope/gate changes, and completion. Report deltas and next gates with links, not worker-report copies. The coordinator is the sole operational narrator.

A pull request is review-ready only when implementation and required checks are complete and no worker blocker remains. Resolve the user's GitHub login, assign that user, then report it.

### Order merge and rollout

Keep implementation concurrency separate from merge and rollout order. After a stacked pull request merges, rebase only its direct successor; leave later descendants until their predecessor merges. Each merge causes at most one restack.

Do not merge, deploy, publish, run production schema/data migrations or other production writes, or change shared infrastructure without explicit approval for that action. One approval does not authorize the next action. Verify each approved step before its dependents proceed; safe draft implementation can continue.

Before requiring rollout evidence, establish actual exposure, usage, populated data, reachable current code, and irreversible harm. Classify controls as implementation, merge, activation, or contraction gates. Do not make future hardening a release blocker unless current exposure and plausible harm require it. For each deferred control, record the enforced protection, affected environments and scope, re-trigger condition, and authoritative decision link. Time-box speculative investigation and stop when it cannot change the next authorized action.

Load `planning-rolling-deploys` only when a concrete persisted-contract or rollout decision is active. Its compatibility proof, measurable gates, rollback rules, and contraction criteria remain mandatory. Store detailed migration evidence once in the brief or a linked artifact; relay gate verdicts only.

### Control context growth

At a safe phase boundary, hand off to a fresh coordinator if this context repeats evidence, needs broad history scans, or risks losing current state during compaction. Publish a consolidated brief, ledger, approval state, and next gate. Start one successor that reads only those records, this skill, and unresolved evidence. Redirect reports, stop predecessor dispatch, confirm acceptance, then archive the predecessor. Never keep two active coordinators or hand off during an unverified production write.

### Complete the delivery

Complete only when all work is merged or abandoned, approved rollout and acceptance checks are verified, workers are archived, and no blocker or manual action is hidden. Send one digest with pull-request links, rollout verdicts, and remaining manual action, then archive the coordinator.

Use [reference/scenarios.md](reference/scenarios.md) to check the brief, reconciliation, and handoff rules when changing this skill.
