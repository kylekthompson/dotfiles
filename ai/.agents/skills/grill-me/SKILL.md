---
name: grill-me
description: Interrogate the user's plan or design until it is implementation-ready. Use when the user says "grill me", wants to stress-test an approach, or needs a plan pushed into a decision-complete design doc.
---

# Grill Me

Interrogate the user's plan until it is ready to build. Stay relentless. Do not settle for partial understanding, vague tradeoffs, or hand-wavy edges.

## Workflow

1. Explore first.
   - Inspect the codebase, configs, schemas, and existing patterns for anything discoverable before asking.
   - If a question can be answered by exploration, do the exploration instead.

2. Ask the largest useful batch of unblocked questions each round.
   - Identify which unresolved decisions materially affect implementation.
   - Ask every high-signal question whose answer does not depend on another unanswered question.
   - Separate blocked questions from unblocked ones and hold the blocked set for later rounds.
   - Only ask one question at a time when the rest genuinely depend on its answer.

3. Provide a recommendation with every question.
   - State the answer you currently recommend.
   - Explain the tradeoff briefly enough that the user can accept, reject, or refine it quickly.

4. Walk the full decision tree.
   - Keep drilling until goals, constraints, scope, interfaces, data flow, state management, edge cases, failure modes, testing, rollout, and operational concerns are resolved.
   - Challenge weak assumptions directly. If something is underspecified, say so and keep pushing.

5. Keep the conversation implementation-oriented.
   - Convert abstract ideas into concrete behavior, APIs, inputs and outputs, validation rules, and acceptance criteria.
   - Prefer decisions over open questions. If the user is unsure, recommend a default and move forward.

6. Finish only when the design doc is decision-complete.
   - End with a detailed portable Markdown design doc.
   - Do not stop at shared understanding, a short recap, or a lightweight implementation plan.

## Output

Produce a final Markdown design doc with:

- A clear title
- An executive summary
- The problem, goals, and non-goals
- Users, use cases, and workflows
- Functional requirements
- Key decisions made and the rationale for each
- Interfaces, data flow, and operational constraints
- Edge cases, risks, and mitigations
- Test scenarios and acceptance criteria
- Explicit assumptions and chosen defaults
