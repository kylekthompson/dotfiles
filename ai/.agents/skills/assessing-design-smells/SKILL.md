---
name: assessing-design-smells
description: Assesses code and design smells pragmatically during implementation, refactoring, architecture, and review. Use when code feels awkward, responsibilities or boundaries are unclear, domain concepts use primitives, effects mix with decisions, or a design risks overengineering.
---

# Does It Stink?

Act as a design conscience, not an architecture police force. Treat a smell as evidence to investigate, not proof that code must change. Notice meaningful design costs, consider the smallest better path, and stay pragmatic when the right economic choice is imperfect code.

## Assess the Smell

When code or a proposed design feels wrong:

1. Inspect the surrounding behavior, callers, domain language, and likely change. Do not diagnose from a pattern in isolation.
2. Name what stinks in concrete terms. A smell label alone is not an explanation.
3. Explain the cost here: an obscured invariant, unclear ownership, invalid state, difficult change, hidden effect, coupling, or excess conceptual weight.
4. Consider the smallest design that reduces that cost. Do not prescribe a pattern merely because it can fit.
5. Decide whether improvement belongs in the current scope. Fix it when it enables the requested change, controls correctness risk, or materially simplifies the touched design. Otherwise, contain it and proceed.

Pause for a decision only when the concern creates correctness risk or the alternatives materially change scope, ownership, or a public contract. Do not block progress, repeat a warning, or loop on a preference after the tradeoff is understood.

## Order the Tradeoffs

Prefer, in order:

1. Correct behavior and explicit invariants
2. Locality of change and clear ownership
3. Conceptual simplicity
4. Testability
5. Functional purity
6. Deduplication

Accept duplication, controlled mutation, or a larger cohesive unit when it makes ownership clearer. Start concrete and tolerate duplication until cases share meaning and a reason to change. The rule of three is evidence to inspect, not permission to unify unrelated behavior.

## Ask Diagnostic Questions

Use the questions that fit the work. Do not recite them as a checklist.

### Domain and ownership

- Does the code use the domain's language, and is it clear which business capability or bounded context owns the behavior?
- Does each invariant have one owner, or is a caller coordinating rules through getters and ordered calls?
- Are domain decisions trapped in controllers, jobs, persistence code, or generic `Manager`, `Service`, `Processor`, `Helper`, or `Handler` types?
- Is a meaningful domain concept represented by a primitive, loose map, flag combination, or nullable fields that admit invalid states?
- Would a value object make meaning, constraints, units, comparison, or behavior explicit? Be very willing to introduce one within the touched design, but do not start an unrelated repository-wide conversion.

For substantive domain work, identify the capability, bounded context, local language, and owning model. Use strategic DDD to clarify the design; do not require context maps or tactical patterns as ceremony. Invest modeling effort in the core domain. Keep supporting and generic capabilities, including genuine CRUD, as simple as their behavior permits. A bounded context is not automatically a deployable service.

### Boundaries and effects

- Are decisions and transformations separable from database, network, filesystem, clock, randomness, environment, framework, or vendor effects?
- Do ORM records, transport shapes, framework types, or SDK objects define the internal domain model?
- Must callers know storage details, field order, timing, or a multi-step protocol that the boundary could own?
- Is shared mutable state or an ambient dependency making behavior difficult to reason about?

Prefer a functional core and imperative shell where practical. Use immutable values and pure policies for calculations without a natural state owner. Use objects or modules with controlled state when identity, lifecycle, or an invariant needs one owner. Let application services orchestrate effects without becoming the home of business-rule branches.

Protect domain meaning from frameworks and infrastructure, but add an adapter or interface only when it controls a real effect, dependency, or source of change. A port for every dependency is architecture theater.

### Abstraction and structure

- Is the abstraction based on shared meaning and change, or only similar present-day code?
- Is inheritance being used for implementation reuse where composition would preserve clearer roles?
- Does a pass-through layer, factory, repository, event, or wrapper own a decision, or only satisfy an architecture diagram?
- Would one business change cause shotgun edits, boolean-driven branches, or changes to a wide interface?
- Is the design paying now for a hypothetical future requirement?

Treat small objects, short methods, message passing, composition, dependency injection, and the Law of Demeter as diagnostic heuristics, not numerical rules. Optimize for cohesion and clear responsibility rather than size.

### State, failure, tests, and change

- Does the model preserve its invariants even when validation at the UI or transport boundary is bypassed?
- Are expected business rejections explicit domain outcomes, while exceptions are reserved for unexpected infrastructure failures and programmer errors?
- Do types prevent important invalid states without type machinery more complex than the guarded state?
- Do tests prove observable behavior, or mirror private structure and mock collaborator call sequences?
- Are behavior changes mixed with refactoring, or is opportunistic cleanup expanding the task?

Make the change easy, then make the easy change. Separate behavior-preserving refactoring from behavior changes and work in small verified steps. Load and apply `tdd` for the detailed test workflow, `design-interface` when responsibility placement or contracts are central, and `ubiquitous-language` when domain terminology is active.

## Stay Pragmatic

- Apply this lens quietly during normal implementation. Mention a smell only when it changes the work or gives the user useful information.
- In a review, rank findings by consequence. State the concrete risk and smallest useful improvement; omit harmless theoretical violations.
- When imperfect code is the right choice, keep it local, protect the domain from its details, and cover risky behavior with a focused test.
- Do not add unsolicited TODO comments, tracking mechanisms, abstractions, or apology layers for a deliberate compromise.
- Report a significant out-of-scope smell without fixing it. Never turn a focused task into an unsolicited architecture rewrite.
- After explaining a non-critical tradeoff, make a recommendation and proceed. This skill advises; it does not veto.
