---
name: grilling-plans
description: Interrogates a rough plan through interactive choice and free-text dialogs until its material product and technical decisions are implementation-ready. Use when the user says "grill me," wants to stress-test an approach, or needs a decision-complete implementation brief.
builtin-tools:
  - ask_grill_question
---

# Grilling Plans

Turn a rough plan into a decision-complete implementation brief. Investigate facts, expose consequential unknowns, recommend concrete defaults, and record decisions without creating an exhaustive questionnaire.

## Establish the Decision Space

1. Inspect the codebase, documentation, configuration, schemas, and existing patterns before asking questions. If exploration can answer a question, do the exploration instead.
2. Restate the intended outcome and active scope. Separate facts, settled decisions, assumptions that need confirmation, and unknowns that can change the implementation.
3. Identify only material decisions. A decision is material when its answer can change observable behavior, scope, ownership or interface boundaries, data compatibility, safety, delivery, or acceptance criteria.
4. Scale the interrogation to the risk. A local and reversible change needs fewer decisions than a public contract, persisted-data change, security boundary, migration, or operational rollout.

## Ask Through the Interactive UI

- Call `ask_grill_question` for each material question while interactive UI is available.
- Ask one question at a time. Use the answer to decide whether the next question is still relevant.
- Give 2–5 distinct and concrete options. Do not force a false binary.
- Include the recommended answer as one exact option value so the UI can preselect it.
- Explain the main tradeoff briefly. Put extended analysis in the final brief, not in the dialog.
- The UI always lets the user enter another answer as free text. Treat that answer as fully authoritative.
- Do not repeat a settled question unless new evidence invalidates its answer.
- If the tool reports that the user cancelled, stop asking questions and return the current decisions and blockers.
- If the tool reports that UI is unavailable, ask its fallback question in normal chat and continue the same workflow.

Probe these areas only when they can change the work:

- desired behavior, users, workflows, scope, and non-goals
- ownership, interfaces, data flow, state, and compatibility
- validation, edge cases, failure behavior, security, and privacy
- migration, rollout, observability, recovery, and operational ownership
- test strategy, acceptance criteria, and delivery sequence

## Converge

- After each answer, update the working decisions and their consequences.
- Resolve contradictions. Challenge assumptions that conflict with repository evidence and recommend a stronger alternative.
- Convert abstract preferences into observable behavior, contracts, validation rules, failure handling, and acceptance checks.
- When the user is unsure, recommend a default. Keep it as an assumption until the user accepts it.
- Keep future possibilities out of the active design unless they change a boundary that is expensive to revise later.

The plan is ready when no unresolved question can materially change the implementation path. Any remaining uncertainty must be an explicit non-blocking assumption or a deferred decision with a clear trigger.

## Return the Implementation Brief

Return a self-contained Markdown brief that does not depend on the transcript. Scale its depth to the work and omit empty sections. Include, when relevant:

- outcome, scope, and non-goals
- required behavior and acceptance criteria
- decisions, chosen defaults, and concise rationale
- interfaces, data, state, and failure behavior
- compatibility, migration, rollout, and operations
- verification strategy and first safe implementation steps
- explicit assumptions, deferred decisions, and blockers

State whether the plan is ready for implementation. If it is not ready, name the decisions that still block it instead of inventing answers.
