---
name: coordinating-deliveries
description: Coordinates multi-PR and cross-project delivery with one-PR child threads, bounded stacked reviews, serial rebases, and rollout ordering. Use when a change must ship through multiple related pull requests.
---

# Coordinate Deliveries

Own the requested outcome through merge and verified rollout. Delegate implementation, but do not edit or push a child branch.

## Plan the delivery

1. Read the planning thread and roadmap when they exist.
2. Split the outcome into PR-sized work items in dependency order.
3. Record Git ancestry separately from rollout order:
   - A stacked item uses its predecessor's branch as its base.
   - A rollout dependency can use an independent branch but must deploy later.
4. Confirm material scope or sequence uncertainty with the user.

## Delegate the work

1. Give each child thread one work item, one branch, and one draft pull request.
2. Ask each child to report its pull request URL, head branch, base branch, head SHA, and blockers.
3. Run independent work in parallel when its files, branches, and rollout effects do not conflict.
4. Start a stacked child only after its direct predecessor has a remote draft pull request. Base the child on the reported predecessor branch.
5. Keep at most three pull requests ready for review and at most three active pull requests in one stack.

The child owns its branch and can force-push it. Keep the child available for review and rebase work while its pull request is open.

## Reconcile progress

Treat GitHub as the source of truth for pull request state. After pull requests exist, check them periodically rather than keeping a process running.

- Resolve blockers and review-limit violations before starting more work.
- Rebase a stack one edge at a time. Ask only the direct successor to rebase, wait for its new head SHA, and then continue upward.
- Keep rollout order separate from Git ancestry. Do not merge or deploy without explicit user approval.
- Archive a child only after GitHub confirms its pull request merged, or after the child confirms that abandoned work stopped.

## Complete the delivery

Finish only when all required pull requests are merged, required deployments are verified in order, child threads are archived, and the roadmap is current. Clear any polling schedule and report links, rollout evidence, and remaining manual work.
