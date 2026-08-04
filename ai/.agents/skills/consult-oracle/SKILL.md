---
name: consult-oracle
description: Consult a configured read-only GPT-5.6 Sol Oracle for an independent second opinion. Use automatically after gathering initial relevant context for feature planning, design, implementation, review, debugging, tradeoff, and risk work. For implementation, consult before changes and again after validation to verify correctness and alignment with the plan. Also use whenever the user asks for an oracle or second opinion. Skip only clearly trivial or mechanical work.
---

# Consult Oracle

Use the Oracle as an adviser after gathering enough evidence for a useful consultation. Keep ownership of decisions, implementation, and validation in the coordinating thread. Implementation workers must not invoke an Oracle or spawn more agents.

## Select the Oracle

- Use `oracle` by default. It uses GPT-5.6 Sol at `high` effort and is the normal choice for automatic plan and correctness checks.
- Use `oracle_xhigh` for ambiguous or cross-system work; architecture and public interface decisions; data, storage, concurrency, security, migration, or recovery changes; high-consequence failures; or a question that remained unresolved after an `oracle` pass.
- If the user names `oracle` or `oracle_xhigh`, use that exact role.
- Use one Oracle per question. Use both only when the user requests comparison or the first consultation leaves a material uncertainty.

## Gather Context First

1. Fetch the task source, including a Linear issue and its referenced material when supplied.
2. Read applicable repository guidance and inspect the relevant code paths, tests, and current behavior.
3. Form a provisional understanding or plan with concrete constraints and open questions.
4. Consult the selected Oracle before presenting the final plan or starting implementation.

Do not consult immediately with only a title or thin issue summary when relevant detail is available to fetch. Do not delay consultation until after the plan is already treated as final.

## Automatic Checkpoints

Use Oracle consultation for feature planning and for nearly all implementation work. Skip it only when the task is clearly trivial or mechanical and independent judgment is unlikely to change the result.

### Planning, Design, Review, or Diagnosis

After the context pass, consult once before returning the final recommendation or plan. Incorporate the Oracle's material findings and identify any disagreement that remains.

### Before Implementation

1. Form a concrete plan from the user request, task source, and current workspace evidence.
2. Ask the selected Oracle to review the plan for correctness, missing dependencies, risks, and alignment with the user's intent.
3. Resolve material findings and state the accepted plan before implementation starts.

### After Implementation

1. Complete the relevant tests, linters, type checks, builds, or focused runtime checks first.
2. Ask the selected Oracle to compare the accepted plan with the actual diff and validation evidence.
3. Have it identify correctness defects, incomplete plan items, scope drift, and missing tests without editing files.
4. Fix material findings in the coordinating thread or a bounded implementation worker, rerun validation, and repeat the final Oracle check only when the fixes materially changed the result.

## Consultation Protocol

1. Give the Oracle one bounded question. Include the objective, relevant paths or evidence, constraints, decision criteria, and the requested output.
2. Tell it to inspect the current workspace as needed and remain read-only. Do not ask it to edit files, perform external writes, or delegate work.
3. Wait for its response before making the related decision.
4. Check material factual claims against the workspace or primary sources when practical.
5. Synthesize the advice for the user. Distinguish Oracle judgment from verified evidence and state whether you accept, adapt, or reject the recommendation.
6. Perform implementation only in the coordinating thread or its bounded `luna_worker` agents, and only when the user's request authorizes it.

If the requested Oracle is unavailable, state that clearly. Do not silently substitute a different role, model, or reasoning effort.

## Prompt Shape

```text
Review [specific question] as a read-only consultant.

Objective: [desired outcome]
Context: [relevant files, behavior, or evidence]
Constraints: [requirements and boundaries]
Evaluate: [decision criteria]
Return: [recommendation, evidence, tradeoffs, and risks]
```
