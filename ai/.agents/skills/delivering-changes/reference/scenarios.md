# Direct Delivery Scenarios

Use these examples when reviewing changes to direct delivery. Each scenario states the minimum expected result.

## Single Pull Request

State: the settled outcome is one cohesive change that fits one pull request.

Expected: implement normally in the current thread. Do not load `delivering-changes` and do not create an implementation worker.

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

Expected: at the next material event, and before message 121, publish one compact handoff and create a continuation with `agent_mode: medium`. It acknowledges ownership, active workers are redirected once, and the predecessor stops dispatching. The same handoff occurs at a major phase boundary when work remains, unless an unverified production write is active.
