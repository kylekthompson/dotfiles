# Interface Heuristics

Use this file when the boundary looks reasonable in multiple shapes and you need a sharper rule.

## Decision Order

1. Name the boundary in domain language.
   - Start with the business action or promise.
   - Reject names derived from storage, transport, frameworks, or job titles.
2. Assign invariants to one side.
   - Let one boundary own each business rule.
   - Reject designs that force both sides to coordinate the same rule.
3. Separate decisions from effects.
   - Keep policy, classification, and eligibility logic free of persistence and I/O where possible.
   - Push database, network, queues, and vendor concerns behind adapters.
4. Reduce connascence.
   - Prefer coupling by stable meaning and names.
   - Avoid forcing callers to know field order, call order, retry rules, or hidden algorithms.
5. Delay abstraction until meaning is shared.
   - Shared payload shape is not enough.
   - Shared helpers are justified when cases enforce the same invariant or clearly change together.

## What Good Interfaces Tend To Do

- Accept inputs that match the caller's level of knowledge.
- Return business outcomes rather than leaking internal state.
- Hide orchestration details that the caller should not own.
- Make invalid states hard to express.
- Keep the number of reasons to change low and local.

## What Weak Interfaces Tend To Do

- Mirror tables, endpoints, queue payloads, ORM models, or vendor request objects.
- Offer generic verbs like `process`, `handle`, `manage`, or `update`.
- Collapse distinct workflows because the arguments happen to look similar today.
- Force the caller to stitch together multi-step protocols.
- Expose every field "just in case."

## Design Questions

- What domain term should appear in the contract that does not appear yet?
- Which side should own the invariant the caller is currently protecting by convention?
- What future change should affect one side of the boundary but not the other?
- If the transport changed tomorrow, what parts of the interface should stay the same?
- If two workflows share a signature but not a rule, why are they one abstraction?
