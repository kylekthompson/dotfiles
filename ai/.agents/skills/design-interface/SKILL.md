---
name: design-interface
description: Design or review interfaces between modules, bounded contexts, services, adapters, and public APIs. Use when shaping a new boundary, comparing interface options, reducing coupling, preserving domain language, deciding whether similar workflows deserve one abstraction, or pushing policy away from I/O and framework details.
---

# Design Interface

## Workflow

1. Interrogate before designing.
   - Ask one high-signal question at a time until the actors, domain terms, invariants, lifecycle, and failure modes are explicit.
   - Refuse to polish an interface built on fuzzy language like "service," "manager," or "handler" when the real responsibility is still unclear.
2. Model the boundary.
   - State who calls whom, which side owns policy, which side owns side effects, and what change pressure the boundary should absorb.
   - Prefer commands, queries, and events in domain language over storage, transport, or framework language.
3. Produce 2-3 viable options.
   - Vary responsibility placement and how much the caller must know.
   - Keep at least one option conservative and one option more opinionated.
4. Evaluate the options in this order.
   - Ease of change: localize volatility and minimize how many places must change together.
   - Semantic clarity: preserve ubiquitous language and avoid leaking implementation terms.
   - Boundary purity: keep decision-making separate from I/O, persistence, and framework concerns whenever practical.
   - Connascence: prefer coupling by meaning and stable names over coupling by position, timing, algorithm, or internal shape.
   - Abstraction fit: share an interface only when the candidates enforce the same domain invariant or clearly change together.
5. Recommend one interface.
   - Pick a concrete design rather than ending with a menu of tradeoffs.
   - Explain why the rejected options are weaker.
   - If the request starts from existing code, include the first safe refactor step.

## Design Defaults

- Optimize for ease of change first.
- Prefer small, explicit interfaces over wide convenience surfaces.
- Prefer domain-command interfaces over generic CRUD or resource-shaped contracts when behavior matters.
- Keep policy in the domain and push I/O, persistence, framework code, and vendor APIs to the edge.
- Preserve domain semantics at external boundaries; adapt transport shape without flattening the meaning.
- Treat similar payloads or argument lists as weak evidence for abstraction.
- Accept duplication until shared meaning or shared invariants are obvious.

## Red Flags

- Push back hardest when the interface leaks implementation terms such as table names, ORM models, HTTP verbs, queue topics, framework types, or vendor request objects.
- Push back next when the abstraction names are generic enough to hide the real behavior: `Manager`, `Service`, `Processor`, `Handler`, `Util`.
- Push back next when the caller must choreograph order, retries, timing, lifecycle transitions, or multi-step protocols that the boundary should own.
- Also watch for wide DTOs, positional argument lists, and outputs that expose internal state instead of business outcomes.

## Response Shape

- Frame the boundary in one short paragraph: caller, callee, owned decisions, owned effects, and the key invariant.
- Present 2-3 interface options with concrete names and signatures or contract sketches.
- Recommend one interface and explain why it best localizes change.
- Spell out responsibility split: what the caller knows, what the boundary owns, and what must stay hidden.
- State invariants, preconditions, postconditions, and failure-handling expectations.
- Name the most important rejected alternative and why it is worse.
- If the boundary already exists, end with the first safe refactor or migration step.

## References

- Read `references/heuristics.md` when tradeoffs are unclear or the interface feels plausible in multiple ways.
- Read `references/examples.md` when the user needs concrete boundary patterns for module seams, bounded-context APIs, or third-party adapters.
