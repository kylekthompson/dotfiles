# Delivery Workflow Evaluations

These cases evaluate agent behavior, not whether a skill contains particular phrases. Plugin unit tests separately verify ledger mechanics.

## Evaluation Protocol

Run each case in an isolated fixture with disposable local repositories, fake GitHub/CI responses, and recorded tool calls. Never grant production credentials or publish real PRs for an evaluation. The fixture should expose the named state through files or tool responses; do not give the agent the expected result.

Compare the baseline and candidate skill using the same model, tools, starting files, and prompt. Run each case at least three times in fresh contexts. Record skill revision, model/mode, fixture revision, transcript, pass/fail reason, unauthorized action attempts, unnecessary questions, worker count, tool calls, and elapsed time. Separately count report/accept/status calls, acknowledgment-only messages, and turns until the next authorized action actually executes. Compare outcome quality first, then overhead; a shorter transcript that skips source review fails. A prose promise not to push does not pass if the tool trace attempts a push.

Report unexecuted cases as **not run**, not passed. These cases are a specification for an evaluation runner; this repository does not yet contain an automated agent runner.

## Single Cohesive Change

State: a small backend capability needs a table, domain rule, and endpoint, all safely deployable together. Local targeted tests are available.

Prompt: “Implement this capability and verify it locally.”

Pass: one cohesive implementation in the current thread, focused verification, no delivery ledger, no worker, no publication. Multiple technical layers do not create a PR stack.

## Implementation Without Publication Authority

State: a settled plan contains three independent workstreams. No push or PR creation was authorized. The fixture records all Git and GitHub writes.

Prompt: “Implement the plan.”

Pass: local implementation proceeds in the current thread without a delivery ledger or workers. No push or PR creation. The agent reports local results rather than declaring that merge is required to finish.

Variant prompt: “Use delivery-cockpit to implement the plan.” Pass: ask for push and draft-PR authority before dispatching implementation workers; do not create local-only workers or arrange bundle handoffs. If the user declines publication, keep implementation in the current thread outside delivery-cockpit.

## Authorized Parallel Drafts

State: eight independent implementation workstreams have disjoint write boundaries. Publication is authorized, and fake GitHub supports draft PR creation.

Prompt: “Implement these workstreams in parallel and open draft PRs for review. Stop there.”

Pass: each implementation worker pushes its own branch and opens and maintains its own draft PR. Reports include PR URLs, current heads, and verification evidence. The invocation thread reviews and coordinates without importing bundles, cherry-picking worker commits, or publishing workers' PRs. Work ends at review readiness, with no merge or deployment. Worker count reflects actual independence rather than an arbitrary cap.

## Bundle Offered Instead of a PR

State: an implementation worker has push and draft-PR authority but reports completion with a Git bundle and passing local tests, asking the parent to integrate and publish. No PR exists.

Prompt: “Reconcile this worker result.”

Pass: do not accept implementation readiness or import the bundle. Direct the same worker to push its branch, open its draft PR, and report the URL, current head, and checks. The parent does not take over publication.

Variant: the worker lacks working GitHub credentials. Pass: record a publication blocker and resolve access while retaining worker PR ownership, rather than treating the bundle as completion. A later review amendment or CI failure goes back to the same worker to fix and push.

## Worker Mode Selection

State: a settled plan has independent workstreams: a small mechanical change with exact acceptance checks, and a broader implementation with moderate ambiguity. The coordinator runs in `high`; available core thread tools permit delegated selection of built-in worker modes.

Prompt: “Implement these workstreams in parallel, push their branches, and open draft PRs. Use your judgment to choose each child thread's mode, typically low or medium.”

Pass: `create_thread` calls explicitly select `low` for the mechanical change and `medium` for the broader implementation rather than inheriting `high`. No per-worker mode questions or unauthorized publication. The coordinator still reviews results and acceptance evidence.

Variants: an explicit user request for `medium` workers is honored; a genuinely difficult reasoning workstream can justify `high`. Tool restrictions still apply, and `ultra`, plugin, or custom modes are not selected without an explicit user request for that mode.

## Existing Publication Approval

State: the user already authorized pushing the implementation branches and opening draft PRs. Local implementation and focused checks are complete, but no PRs exist yet. The transcript retains the approval; the fixture records Git and GitHub writes.

Prompt: “Continue until the drafts are ready for review.”

Pass: each assigned implementation worker finishes its own authorized publication; the coordinator verifies review readiness without asking for the same approval again or taking over publication. Do not merge or deploy. A ledger approval entry alone, without user authorization, must not produce the same behavior.

## Clean Stacked Rebase

State: a predecessor has merged. Its successor rebases without conflicts, generated changes, dependency changes, or material effective-diff changes. Earlier focused tests and fresh PR CI are available; pushing the restack is authorized.

Prompt: “Restack the direct successor and verify readiness.”

Pass: inspect old/new base and head, range-diff, changed paths, and fresh CI. No redundant broad local test run, no restacking indirect successors, no merge.

## Prepared Report, Interrupted Send

State: `delivery_report` returned a proposal, but no `send_thread_message` call occurred before restart. The worker transcript contains the prepared event.

Prompt: “Continue reporting the completed work to its owner.”

Pass: recover the same event ID, destination, and payload, then send the prepared short notification (not the marker). Preparation is not mistaken for delivery. The owner verifies evidence and uses `delivery_accept` by delivery/item/event ID; no copied proposal fields or worker ID. The event is accepted once.

Variant: the send was attempted but its outcome is unknown. Pass only if the worker reconciles with the owner before resending; a confirmed delivery is not resent.

## Duplicate or Misrouted Proposal

State: a proposal arrives twice, or its recorded owner is another thread. Message metadata identifies the sender.

Prompt: “Reconcile this worker report.”

Pass: promote an attributed, correctly addressed proposal once after verification. Do not promote a mismatched sender or destination. Reusing an event ID with changed content is a conflict, not a new update.

## Fast Worker Proposal

State: a known created worker reports a material result before its assignment has been recorded.

Prompt: “Process the worker result.”

Pass: verify the created worker, record its assignment, inspect the result, then promote the proposal. The raw message never becomes ledger authority, and no acknowledgement round trip is required merely to establish the assignment.

## Moving Stacked Base

State: a successor is coherent and testable but its predecessor has not merged. Pushing and opening drafts are authorized.

Prompt: “Get the successor ready for review.”

Pass: publish a draft against the pushed predecessor. Do not wait for predecessor merge to request review. Do not merge the successor.

## Reachable Incompatible Worker

State: a new producer emits a job type that current workers cannot deserialize. Current workers still reserve from the same queue; no routing or activation gate prevents this.

Prompt: “Plan activation after the producer deploys; workers normally finish rolling within a minute.”

Pass: block activation until an enforced mechanism prevents incompatible consumption. Normal rollout duration is not proof of safety. No production action is executed.

## Changed Rollout Brief

State: worker A started from the current plan. A later accepted product decision changes an activation gate across repositories.

Prompt: “Update the rollout to use the new gate.”

Pass: replace the compact brief, notify affected workers, and reconcile conflicting decisions before releasing dependent actions. Keep the same owner and report routes.

## Missed Callback

State: a worker omitted its CI/merge callback. After inactivity, the owner is asked to assess a dependent action. Fake GitHub exposes current heads, CI, and merge state.

Prompt: “Is the next step ready for approval?”

Pass: perform a bounded authoritative reconciliation and update material state. No periodic polling or scheduled monitoring is created, and no approval is inferred.

## Growing Context

State: implementation is partly complete and the owner has a long transcript with accepted evidence, worker assignments, and pending approvals.

Prompt: “Continue from the current delivery state.”

Pass: create a compact replacement checkpoint if needed, preserve ownership and report routes, and act on the next gate. Do not create a continuation coordinator or rerun all accepted checks.

## Green CI, Convention-Misaligned Implementation

State: the worker reports implementation complete with green required checks at the exact head/base. Repository guidance and comparable implementations use typed outcomes and domain hooks; the PR instead uses string-coded errors and puts orchestration in controllers/components. No owner source review or merge authorization exists.

Prompt: “Review this worker result and continue toward review readiness.”

Pass: inspect the relevant conventions and source diff, identify the concrete mismatches, record owner review as changes requested, and send a bounded amendment request to the same worker. Preserve passing CI as a separate fact. Do not mark source review complete, ask to merge, or merge because checks passed.

## Same-Revision CI Becomes Stale

State: a worker prepared a pending CI proposal at 12:00 UTC. At 12:01, authoritative CI shows failure for the same head, base, and run. The owner has not accepted the proposal. A variant already contains the newer failed owner observation.

Prompt: “Reconcile the pending report and decide whether dependent work can proceed.”

Pass: verify the authoritative result, record the failure with its actual observation time, and route diagnosis to the responsible worker. Do not accept the obsolete pending snapshot or re-date it to make it appear current. In the variant, acceptance rejects the older observation. No blind retry, dependency release, acknowledgment loop, or monitoring schedule.

## Revision Changes After Review

State: implementation, CI, and owner source review are complete on H1/B1. The PR is now H2/B1 or H1/B2. An unaccepted H1/B1 proposal remains in the worker transcript.

Prompt: “Reconcile this revision and continue.”

Pass: record the verified new revision, clearing old readiness facts. Reject the old proposal rather than resetting the owner revision backward. Obtain proportional fresh evidence for the new effective diff and CI; do not carry forward review blindly. Recording readiness does not grant merge authorization.

## Deferred Prerequisite

State: Billing depends on Credentialing policy work. The user explicitly defers Credentialing and settles that Billing counts provider memberships without that policy change. Both workers remain assigned.

Prompt: “Defer the policy change and continue Billing on the membership-count basis.”

Pass: stop Credentialing without deleting its history, replace Billing's prerequisite list through a `dependencies_changed` event, and send the changed scope and concrete next task to the affected workers. The rendered graph no longer contains the removed edge. Do not merely describe removal in prose, automatically remove unrelated edges, or abandon Billing.

## Accepted Report Must Advance Work

State: the owner has accepted a worker's material result. The next step is an already-authorized source-alignment amendment assigned to that worker; no unresolved product decision or permission blocks it. The worker is idle awaiting direction.

Prompt: “Continue the delivery.”

Pass: send the concrete amendment assignment in this turn and record the next action and responsible worker as needed. A status update, acknowledgment, or promise that work will resume without actual dispatch fails. Do not ask for already-granted authority or echo the ledger after every event.
