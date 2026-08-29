# Direct Delivery Scenarios

Use these examples when reviewing changes to direct delivery. Each scenario states the minimum expected result.

## Single Pull Request

State: the settled outcome is one cohesive change that fits one pull request.

Expected: implement normally in the current thread. Do not load `delivery-cockpit:delivering-changes` and do not create an implementation worker.

## Inferred Multi-Pull-Request Delivery

State: the thread has an implementation-ready plan whose dependency graph and review boundaries require three pull requests. The user asks to implement the plan without saying “multi-PR delivery.”

Expected: load `delivery-cockpit:delivering-changes` and start direct delivery. Do not ask the user to repeat the pull-request count or explicitly request the workflow.

## Parallel Implementation Request

State: the user asks to parallelize implementation, and the settled work has independent implementation workstreams that can own separate pull requests.

Expected: load `delivery-cockpit:delivering-changes`, record the workstream dependencies, and dispatch bounded workers. A request to parallelize research or planning without implementation intent does not trigger delivery.

## Explicit Modes

State: the plan has a docs-only glossary update, an ordinary backend capability, and one bounded question about a difficult cross-version safety invariant.

Expected: create the docs worker with `agent_mode: low`, the backend worker with `agent_mode: medium`, and the safety worker with `agent_mode: high`. Name the safety decision in the high-mode prompt. No created thread inherits its mode.

## Vertical Pull-Request Boundary

State: one capability needs a table, domain behavior, lifecycle transition, and API endpoint. It can deploy safely as one change.

Expected: one worker owns one vertical pull request. Do not create persistence, lifecycle, and API pull requests. Split schema expansion only if mixed-version safety requires it to deploy before behavior.

## Clean Stacked Rebase

State: a direct predecessor merged. The successor rebases without conflicts, generated-artifact changes, dependency changes, or a material effective-diff change.

Expected: record the concise restack verdict, push, and rely on fresh pull-request CI. Do not rerun local checks.

## Deterministic Context Checkpoint

State: direct delivery reaches 100 messages while work remains.

Expected: publish one compact replacement checkpoint in the invocation thread with the rendered delivery ledger, worker report routes, settled decisions, approval state, accepted checks, blockers, and next gate. The invocation thread remains the owner, keeps worker routes unchanged, and does not create a coordinator or continuation thread.

## Duplicate Material Report

State: a worker prepares and sends a draft pull request proposal, the plugin reloads, and the worker retries `delivery_report` with the same event ID. The proposal may also arrive more than once.

Expected: raw proposals do not update the ledger. The owner verifies the assigned worker from Amp message metadata and promotes the proposal once with `delivery_record`. Retrying that stable event ID reports no change. Reusing it with different content is an error.

## Fast Worker Proposal

State: a worker reaches a material transition before the owner has recorded its assignment.

Expected: the raw proposal cannot poison replay. The owner records the assignment before promoting the proposal; no acknowledgement round trip is required.
