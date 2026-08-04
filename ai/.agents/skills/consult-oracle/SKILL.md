---
name: consult-oracle
description: Consult a configured read-only Oracle custom agent for an independent GPT-5.6 Sol second opinion. Use automatically for non-trivial change work to review the plan before implementation and to verify the completed work against that plan. Also use when the user asks for an oracle, requests a second opinion, or needs difficult review, design, architecture, planning, debugging, tradeoff, or risk analysis. Skip automatic consultation for trivial or mechanical changes.
---

# Consult Oracle

Use the Oracle as an adviser. Keep ownership of decisions, implementation, and validation in the coordinating thread. Implementation workers must not invoke an Oracle or spawn more agents.

## Select the Oracle

- Use `oracle` when the user names it or the question needs the deepest review. It uses GPT-5.6 Sol at `xhigh` effort.
- Use `oracle_high` when the user names it or asks for a faster, less expensive consultation. It uses GPT-5.6 Sol at `high` effort.
- For automatic checkpoints, use `oracle_high` for a focused change and `oracle` for an ambiguous, cross-system, or high-consequence change.
- If the user requests an Oracle consultation without naming one, apply the same selection rule.
- Use one Oracle per question. Use both only when the user requests comparison or the first consultation leaves a material uncertainty.

## Automatic Checkpoints

Use both checkpoints for non-trivial implementation work. Treat work as non-trivial when it changes architecture, public interfaces, data or storage, concurrency, security, migrations, recovery behavior, or behavior across several modules; when requirements are ambiguous; or when an incorrect result has meaningful cost.

### Before Implementation

1. Form a concrete plan from the user request and current workspace evidence.
2. Ask the selected Oracle to review the plan for correctness, missing dependencies, risks, and alignment with the user's intent.
3. Resolve material findings and state the accepted plan before implementation starts.

### After Implementation

1. Complete the relevant tests, linters, type checks, builds, or focused runtime checks first.
2. Ask the selected Oracle to compare the accepted plan with the actual diff and validation evidence.
3. Have it identify correctness defects, incomplete plan items, scope drift, and missing tests without editing files.
4. Fix material findings in the coordinating thread or a bounded implementation worker, rerun validation, and repeat the final Oracle check only when the fixes materially changed the result.

For review, design, planning, or diagnosis that does not authorize implementation, use one consultation at the point where the independent judgment adds the most value.

## Consultation Protocol

1. Give the Oracle one bounded question. Include the objective, relevant paths or evidence, constraints, decision criteria, and the requested output.
2. Tell it to inspect the current workspace as needed and remain read-only. Do not ask it to edit files, perform external writes, or delegate work.
3. Wait for its response before making the related decision.
4. Check material factual claims against the workspace or primary sources when practical.
5. Synthesize the advice for the user. Distinguish Oracle judgment from verified evidence and state whether you accept, adapt, or reject the recommendation.
6. Perform implementation only in the coordinating thread or its bounded `luna_worker` agents, and only when the user's request authorizes it.

If the requested Oracle is unavailable, state that clearly. Do not silently substitute a different model or reasoning effort.

## Prompt Shape

```text
Review [specific question] as a read-only consultant.

Objective: [desired outcome]
Context: [relevant files, behavior, or evidence]
Constraints: [requirements and boundaries]
Evaluate: [decision criteria]
Return: [recommendation, evidence, tradeoffs, and risks]
```
