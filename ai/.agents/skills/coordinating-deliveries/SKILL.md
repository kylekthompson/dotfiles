---
name: coordinating-deliveries
description: Starts and guides a delivery coordinator child thread for a completed planning thread. Use only when the user explicitly invokes this skill or explicitly asks to start or spin up a coordinator thread from the current planning thread. Do not use for ordinary planning, implementation, delegation, shipping, or rollout requests.
compatibility: Requires Amp thread tools and authenticated GitHub access for pull-request checks.
---

# Coordinate Deliveries

Move a completed plan through implementation, review, merge, and verified rollout. Use ordinary Amp thread tools for coordination. Do not build a separate delivery ledger or state machine.

## Choose the Role

- If the current prompt identifies this thread as the delivery coordinator and gives a planning thread ID, skip **Start the Coordinator** and follow **Run the Delivery**.
- Otherwise, this is the planning thread. Follow **Start the Coordinator** only.

## Start the Coordinator

1. Confirm that the current thread contains the plan to deliver. If the plan is not ready, state what blocks delivery instead of starting a coordinator.
2. Call `create_thread` exactly once with `executor: orb`, the current Amp `project`, and `agent_mode: high`. In the kickoff prompt:
   - identify the new thread as the delivery coordinator for the current planning thread
   - include the planning thread ID or URL
   - tell it to read the complete planning thread, load this skill, and follow **Run the Delivery**
   - give it ownership through completed pull requests and verified rollout
   - tell it not to start another coordinator
   - require progress and completion reports to the planning thread with `send_thread_message`
3. Return the new coordinator thread ID or link. Do not also implement or delegate the plan from this planning thread.

## Run the Delivery

### Establish the work

1. Read the complete planning thread named in the kickoff prompt. Treat it as the source for the outcome, decisions, scope, constraints, and acceptance criteria.
2. Own that outcome through completed pull requests and verified rollout. Do not stop after writing a work breakdown or opening the first pull requests.
3. Build a dependency graph of PR-sized work items across all required projects. Keep code dependencies, Git ancestry, merge order, and rollout order distinct.
4. Resolve material uncertainty before delegation. Make routine, reversible implementation decisions without sending them back to the user.

### Control parallel work

- Keep at most five active worker threads and at most five open delivery pull requests at one time. The coordinator does not count as a worker. A worker is active from creation until it is archived; draft pull requests count as open.
- Before each dispatch, reconcile child-thread and GitHub pull-request state. Start work only when both limits remain satisfied.
- Parallelize independent work when it reduces delivery time. Do not run work concurrently when workers could edit the same files, own the same branch, change the same contract or migration boundary, or depend on an unsettled decision from each other.
- Start the next PR-sized work item as soon as its implementation inputs are stable, even while a predecessor merge, deployment, or rollout is being verified. Rollout verification alone does not block implementation. Keep the successor draft and unmerged when its merge or rollout depends on that verification.
- Sequence conflicting work. For a safe stacked change, start the successor from the direct predecessor branch after that branch is pushed and its draft pull request is open. Wait only when concurrent edits, an unsettled contract or migration boundary, or concrete expected predecessor rework would make the successor unsafe or wasteful.
- Keep later work undispatched when a dependency or capacity limit blocks it. Do not create placeholder threads.

### Delegate one pull request

Use `create_thread` for each worker. Select `executor: orb` and the exact Amp `project` that owns the work, including another project when required.

Give each implementation worker:

- one bounded outcome and one draft pull request to own
- the correct repository, base branch, predecessor branch or immutable SHA when stacked, and acceptance checks
- the coordinator thread ID and an explicit requirement to report back with `send_thread_message` before it goes idle
- responsibility to investigate, implement, verify, push its branch, and open its draft pull request
- permission to change only its own branch and pull request
- instructions not to merge, deploy, create another PR, or delegate PR-sized work

Tell the worker to fetch origin when it starts. For unstacked work, it must create its branch from the fetched remote default branch without pinning or comparing a dispatch-time SHA. For stacked work, it must branch from the fetched predecessor branch unless the coordinator explicitly requires an immutable SHA. Report a baseline blocker only when the required branch or immutable SHA is unavailable.

Tell the worker to rebase onto the intended current base immediately before opening its pull request. After the pull request opens, do not rebase merely because the base branch changed; rebase when the branch must be re-stacked. After a rebase, compare the effective pull-request diff with the pre-rebase diff. Do not automatically repeat local checks. Re-run only the checks relevant to a diff change that gives good reason to believe the rebase could have introduced a defect; otherwise rely on pull-request CI.

Split work between threads when it needs more than one pull request. A research or verification thread can own no pull request when that is the whole bounded task.

Ask workers to report when they open or update a pull request, become blocked, finish requested review changes, determine that their work is no longer needed, and complete their bounded task. The completion report must include the outcome, pull request link when applicable, verification results, and any remaining blocker or manual action. A final reply that stays only in the worker thread is not sufficient: the worker must send the report to the coordinator. Do not call `wait_for_threads` or periodically poll a worker after asking it to report; continue other unblocked coordination work and let its message wake the coordinator.

### Reconcile and retire work

Treat GitHub as authoritative for pull-request state. Check the thread status and pull request before acting on a worker report.

- Keep a worker available while its pull request is open and can need review changes or a rebase.
- Archive a worker promptly with `update_thread` when GitHub confirms that its pull request merged.
- If work becomes superseded, canceled, or otherwise irrelevant, tell the worker to stop and ask it to reply after it has stopped. Archive it only after that reply. Account for any open pull request and ask before closing it when the user has not already authorized that action.
- Do not archive the planning thread.
- Restore an archived worker only when new work on its pull request is necessary.

Reconcile when a worker reports back and whenever the coordinator resumes for a user message or another relevant event:

1. Inspect active worker threads and all delivery pull requests.
2. Archive merged or safely retired workers.
3. Resolve blockers, review changes, and required serial rebases.
4. Dispatch newly unblocked work without exceeding either capacity limit.
5. Check merge and rollout prerequisites.
6. Report only material changes or decisions that need the user.

Do not create a reconciliation schedule only to check whether workers finished. Worker reports are the completion signal.

### Order merge and rollout

- Keep implementation concurrency separate from merge and deployment order.
- Re-stack one direct edge at a time. Ask each worker to rebase only its own branch, and only when that branch must be re-stacked rather than after every predecessor update.
- State the required merge and rollout sequence clearly.
- Do not merge pull requests, deploy, publish, migrate production data, or change shared infrastructure without explicit user approval for that action.
- After approval, coordinate each step in order and verify its result before unblocking dependent merge or rollout work. Eagerly continue implementation that can safely remain draft while this verification runs.
- Load `planning-rolling-deploys` for schema changes, background jobs, persisted payloads, queues, or any mixed-version contract.

### Complete the delivery

Delivery is complete only when:

- all required pull requests are merged or explicitly abandoned
- all approved rollout steps are verified in the required order
- acceptance criteria from the planning thread are verified
- all worker threads are archived
- no unresolved blocker or required manual action is hidden

Send the planning thread a concise completion report with pull-request links, rollout evidence, and any explicit remaining manual action. Then archive this coordinator thread.
