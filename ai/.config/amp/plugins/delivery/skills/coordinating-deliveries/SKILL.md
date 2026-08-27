---
name: coordinating-deliveries
description: Coordinates multi-PR and cross-project delivery through one-PR child threads, bounded stacked reviews, polling, serial rebases, and rollout ordering. Use in a marked delivery coordinator thread.
compatibility: Requires an authenticated GitHub CLI for pull-request polling.
builtin-tools:
  - delivery_add_work_item
  - delivery_register_child
  - delivery_reconcile
  - delivery_request_rebase
---

# Coordinate Deliveries

Own the requested outcome through merge and verified rollout. Delegate implementation. Do not edit or push a child branch.

## Build the delivery graph

1. Read the planning thread named in the coordinator marker.
2. Read the roadmap when one is present.
3. Define PR-sized work items in dependency order.
4. Use `basedOn` only for direct Git ancestry between stacked PRs.
5. Use `rolloutAfter` for merge or deployment order that does not require Git ancestry.
6. Load `planning-rolling-deploys` before finalizing work that changes schemas, persisted payloads, jobs, queues, or mixed-version contracts.
7. Confirm material sequencing or scope uncertainty with the user before delegation.

## Delegate one pull request

For each work item:

1. Call `delivery_reconcile` before adding review work. Do not exceed an active stack depth of 3 or 3 reviewable pull requests globally.
2. Call `delivery_add_work_item` in dependency order.
3. Pass the returned prompt unchanged to `create_thread`. Set its `project` to the work item's Amp project or repository. Ask the new thread to report through `delivery_report`; do not also wait for it.
4. Call `delivery_register_child` with the returned thread ID.

Independent work can run in parallel while the files, branches, and rollout effects do not conflict. Keep later planned work undispatched when it would exceed either limit.

Each child owns exactly one branch and one draft pull request. The child can force-push its own branch. The coordinator and other children must not change it.

## Reconcile by polling

After the first pull request is reported, load `building-schedules` and create one schedule on this coordinator thread:

- Schedule: `RRULE:FREQ=MINUTELY;INTERVAL=10`
- Label: `Every 10 minutes`
- Prompt: `Run delivery_reconcile. If it identifies a next serial rebase, call delivery_request_rebase with the exact identity fields. Dispatch no other rebase while one is pending. Check rollout prerequisites and report only material changes. Clear this schedule after every work item is merged and required rollouts are verified.`

Do not run an in-process timer or keep an orb awake for polling.

On each reconciliation:

1. Check every tracked pull request through `delivery_reconcile`.
2. Resolve reported violations before adding or promoting review work.
3. If a rebase is pending, wait for its child report.
4. If a next rebase is ready, call `delivery_request_rebase` with the exact returned fields.
5. Dispatch only that direct successor.
6. After it reports the new base and head SHAs, reconcile again. This advances a stack upward one edge at a time.

Do not infer a merge from a child message. GitHub polling is authoritative.

## Manage rollout

Keep rollout order separate from PR ancestry. Work can be implemented in parallel even when deployment must be serial.

- Call out required merge and deployment order to the user.
- Do not merge or deploy on the user's behalf without explicit approval.
- Verify each required deployment before unblocking its `rolloutAfter` dependents.
- Keep the roadmap current when it is the shared delivery record.

## Complete the delivery

Complete only when:

- Every work item has one owning child and no unhandled blocker.
- Every required pull request is merged.
- Every required deployment is verified in the intended order.
- The roadmap reflects the final result when one exists.
- The polling schedule is cleared.

Send the user one concise completion report with links, rollout evidence, and any remaining manual follow-up.
