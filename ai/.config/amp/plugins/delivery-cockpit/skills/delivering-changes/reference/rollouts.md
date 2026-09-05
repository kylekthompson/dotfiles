# Complex Rollouts

Keep the invocation thread responsible for delivery across repositories and operator handoffs.

- Maintain one compact brief with scope, invariants, dependency graph, approvals, active operators, and next gates. Supersede it when a material decision changes and notify affected workers.
- Separate implementation, merge, activation, observation, and contraction. Use `planning-rolling-deploys` for changed persisted contracts and mixed-version safety.
- Give each active phase measurable entry/exit gates, health evidence, a valid rollback or roll-forward action, and an operator when manual work is required.
- Before releasing a dependency or requesting a shared action after inactivity, reconcile current PR heads, CI, merge, and rollout state. A missed callback does not justify restarting periodic polling.
- Accept an existing merge-triggered rollout as evidence when it covers the required migration, health, and smoke checks. Do not trigger another deployment merely to obtain a fresh result.
