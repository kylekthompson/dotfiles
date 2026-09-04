<!-- Generated from ai/.agents/skills/grill-me/SKILL.md by sync-plugin-skills.ts. -->

# Grill Me

Turn a rough plan into a decision-complete implementation brief. Investigate facts, expose consequential unknowns, recommend concrete defaults, and record the decisions without turning the process into an exhaustive questionnaire.

## Establish the Decision Space

1. Inspect the codebase, documentation, configuration, schemas, and existing patterns before asking questions. If exploration can answer a question, do the exploration instead.
2. Restate the intended outcome and active scope. Separate:
   - **Facts:** supported by the available evidence.
   - **Decisions:** choices the user or project has made.
   - **Assumptions:** defaults that still need confirmation.
   - **Unknowns:** missing information that can change the implementation.
3. Identify the decisions that are material now. A decision is material when its answer can change observable behavior, scope, responsibility or interface boundaries, data compatibility, safety, delivery, or acceptance criteria.
4. Scale the interrogation to the risk. A local and reversible change needs fewer decisions than a public contract, persisted-data change, security boundary, migration, or operational rollout.

## Ask Material Questions

- Ask one coherent batch of unblocked questions at a time. Group independent questions, but sequence questions when one answer changes the next question.
- Keep each batch small enough for direct answers. Prefer a few high-impact questions over a long inventory of possible concerns.
- With each question, give the recommended answer or default and the main tradeoff. Make it easy to accept, reject, or refine the recommendation.
- Use concrete choices when they are real. Do not force a false binary when the design space has another viable option.
- Do not ask about implementation details that are safely reversible, follow a settled project convention, or can wait without blocking the design.

Use this question shape when it helps:

```md
1. **Decision:** What must be chosen?
   **Recommend:** The current best answer and why.
   **Tradeoff:** What this choice gains or gives up.
```

Probe these areas only when they can change the work:

- desired behavior, users, workflows, scope, and non-goals
- ownership, interfaces, data flow, state, and compatibility
- validation, edge cases, failure behavior, security, and privacy
- migration, rollout, observability, recovery, and operational ownership
- test strategy, acceptance criteria, and delivery sequence

## Converge on Decisions

- After each answer, update the working decisions and their consequences. Resolve contradictions and do not ask a settled question again unless new evidence invalidates its answer.
- Challenge weak assumptions and conflicts with repository evidence directly, without becoming combative. Explain what fails and recommend a stronger alternative.
- Convert abstract preferences into observable behavior, contracts, validation rules, failure handling, and acceptance checks.
- When the user is unsure, recommend a default. Record it as an assumption until the user accepts it; do not present silence as agreement.
- Keep future possibilities out of the active design unless they change a boundary that is expensive to revise later.
- If the user stops the interrogation early, honor that request and return the current decisions, assumptions, and remaining blockers. Do not claim the plan is ready.

The plan is implementation-ready when no unresolved question can materially change the implementation path. Remaining uncertainty must be an explicit non-blocking assumption or a deferred decision with a clear trigger. Do not require every topic above to appear when it is irrelevant.

## Final Artifact

Return a self-contained Markdown implementation brief that does not depend on the conversation transcript. Scale its depth to the work and omit empty sections. Include, when relevant:

- outcome, scope, and non-goals
- required behavior and acceptance criteria
- decisions, chosen defaults, and concise rationale
- interfaces, data, state, and failure behavior
- compatibility, migration, rollout, and operations
- verification strategy and first safe implementation steps
- explicit assumptions, deferred decisions, and blockers

State whether the plan is ready for implementation. If it is not ready, identify the decisions that still block it instead of filling the gaps with invented certainty.
