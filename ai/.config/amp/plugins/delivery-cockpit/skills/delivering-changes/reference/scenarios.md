# Direct Delivery Scenarios

Use these examples when reviewing changes to direct delivery. Each scenario states the minimum expected result.

## Single Pull Request

State: the settled outcome is one cohesive change that fits one pull request.

Expected: implement normally in the current thread. Do not load `delivery-cockpit:delivering-changes` and do not create an implementation worker.

## Explicit Modes

State: the plan has a docs-only glossary update, an ordinary backend capability, and one bounded question about a difficult cross-version safety invariant.

Expected: create the docs worker with `agent_mode: low`, the backend worker with `agent_mode: medium`, and the safety worker with `agent_mode: high`. Name the safety decision in the high-mode prompt. No created thread inherits its mode.

## Vertical Pull-Request Boundary

State: one capability needs a table, domain behavior, lifecycle transition, and API endpoint. It can deploy safely as one change.

Expected: one worker owns one vertical pull request. Do not create persistence, lifecycle, and API pull requests. Split schema expansion only if mixed-version safety requires it to deploy before behavior.

## Clean Stacked Rebase

State: a direct predecessor merged. The successor rebases without conflicts, generated-artifact changes, dependency changes, or a material effective-diff change.

Expected: record the concise restack verdict, push, and rely on fresh pull-request CI. Do not rerun local checks.

## Deterministic Context Handoff

State: direct delivery reaches 100 messages while work remains.

Expected: at the next material event, and before message 121, publish one compact handoff with the rendered delivery ledger and create a continuation with `agent_mode: medium`. It acknowledges ownership, reconstructs the same item states and worker assignments in a new thread-visible ledger, compares the rendered result, then receives each active worker redirect once with the new report owner ID. The predecessor stops dispatching. The same handoff occurs at a major phase boundary when work remains, unless an unverified production write is active.

## Duplicate Material Report

State: a worker prepares and sends a draft pull request report, the plugin reloads, and the worker retries `delivery_report` with the same event ID. The same authenticated message may also arrive more than once.

Expected: the worker retry reports no change and does not send again. The owning thread applies one ledger transition for the stable event ID even if transport delivered the exact report more than once. Reusing the event ID with different content is an error.
