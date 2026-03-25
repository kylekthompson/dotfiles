---
name: grill-me
description: Interrogate the user's plan or design until it is implementation-ready. Use when the user says "grill me", wants to stress-test an approach, or needs a plan pushed into a decision-complete PRD.
---

# Grill Me

Interrogate the user's plan until it is ready to build. Stay relentless. Do not settle for partial understanding, vague tradeoffs, or hand-wavy edges.

## Workflow

1. Explore first.
   - Inspect the codebase, configs, schemas, and existing patterns for anything discoverable before asking.
   - If a question can be answered by exploration, do the exploration instead.

2. Ask one high-signal question at a time.
   - Target the next unresolved decision that would materially affect implementation.
   - Avoid batching unrelated questions unless they are tightly coupled.

3. Provide a recommendation with every question.
   - State the answer you currently recommend.
   - Explain the tradeoff briefly enough that the user can accept, reject, or refine it quickly.

4. Walk the full decision tree.
   - Keep drilling until goals, constraints, scope, interfaces, data flow, state management, edge cases, failure modes, testing, rollout, and operational concerns are resolved.
   - Challenge weak assumptions directly. If something is underspecified, say so and keep pushing.

5. Keep the conversation implementation-oriented.
   - Convert abstract ideas into concrete behavior, APIs, inputs and outputs, validation rules, and acceptance criteria.
   - Prefer decisions over open questions. If the user is unsure, recommend a default and move forward.

6. Finish only when the PRD is decision-complete.
   - End with a detailed portable Markdown PRD.
   - Do not stop at shared understanding, a short recap, or a lightweight implementation plan.

## Output

Produce a final Markdown PRD with:

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
